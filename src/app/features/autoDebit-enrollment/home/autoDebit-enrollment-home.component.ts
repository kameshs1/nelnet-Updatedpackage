import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NgZone } from '@angular/core';
import {
  AutoDebitEnrollmentDetailComponent,
  AutoDebitDetailRecord,
} from '../detail/autoDebit-enrollment-detail.component';
import { AutoDebitEnrollmentService } from '../../../core/services/auto-debit-enrollment.service';
import { SharedModule } from '../../../shared/shared.module';
import { of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { UsDatePipe } from '../../../shared/pipes/us-date.pipe';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  UTableModule,
  UButtonModule,
  UDialogModule,
  UDialogComponent,
  UAppBarModule,
  UIconModule,
  UPaginatorModule,
  UPaginatorPageEvent,
} from '@nelnet/unifi-components-angular';

type DialogMode = 'add' | 'edit' | 'view';

@Component({
  selector: 'app-autodebit-enrollment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedModule,
    UsDatePipe,
    AutoDebitEnrollmentDetailComponent,
    UTableModule,
    UButtonModule,
    UDialogModule,
    UAppBarModule,
    UIconModule,
    UPaginatorModule,
    EmptyStateComponent,
  ],
  templateUrl: './autoDebit-enrollment-home.component.html',
  styleUrls: ['./autoDebit-enrollment-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoDebitEnrollmentComponent {
  private readonly adeService = inject(AutoDebitEnrollmentService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  @ViewChild('formDialog') formDialog!: UDialogComponent;

  columnsToRender = [
    { key: 'eftControl', text: 'EFT Control' },
    { key: 'eftEligible', text: 'EFT Incentive Eligible' },
    { key: 'startDate', text: 'Start Date' },
    { key: 'endDate', text: 'End Date' },
    { key: 'bankId', text: 'Bank ID' },
    { key: 'csInd', text: 'C/S Ind' },
    { key: 'lastChange', text: 'Last Change Date' },
    { key: 'override', text: 'Override Switch' },
    { key: 'processDay', text: 'Process Day' },
  ];

  dialogMode: DialogMode = 'add';
  selectedRecord: AutoDebitDetailRecord | null = null;
  submitRequested = 0;
  formTitle = 'Autodebit Enrollment';
  saveButtonTitle = 'Save';
  saving = false;
  private submitGuard = false;

  userName = '';
  ssn = '';
  account = '';
  showSsn = true;

  // dataset
  allRows: AutoDebitDetailRecord[] = [];

  startIndex!: number;
  endIndex!: number;
  pageIndex!: number;
  itemsPerPage = 10;

  rows: AutoDebitDetailRecord[] = [];

  // Sorting state for table (matches icon binding shape used elsewhere)
  runSortColumn: keyof AutoDebitDetailRecord | '' = '';
  runSortDirection: 'asc' | 'desc' | '' = '';

  // Numeric columns (right-aligned)
  private readonly numericColumns: Array<keyof AutoDebitDetailRecord> = ['eftControl', 'eftEligible', 'override', 'processDay'];

  constructor(private readonly route: ActivatedRoute) {
    // initialize rows from service and subscribe for updates
    this.allRows = this.adeService.getRows();
    this.adeService.rows$.subscribe((rows) => {
      this.allRows = rows;
      // Reset to first page on data refresh
      this.startIndex = 0;
      this.endIndex = this.itemsPerPage;
      this.applyRunSort();
      this.cdr.markForCheck();
    });

    // Get navigation state from search result
    const nav = this.router.getCurrentNavigation();
    const state = (nav && nav.extras && nav.extras.state) as { name?: string; account?: string; ssn?: string } | undefined;
    if (state) {
      this.userName = state.name || this.userName;
      this.account = state.account || this.account;
      this.ssn = state.ssn || this.ssn;
      // If we have an SSN, fetch enrollment details immediately
      if (this.ssn && this.ssn.trim()) {
        this.adeService.fetchBySsn(this.ssn).subscribe({
          next: () => { this.cdr.markForCheck(); },
          error: () => { /* handled globally by error interceptor */ }
        });
      }
      this.cdr.markForCheck();
    }
  }

  onPageChange(event: UPaginatorPageEvent) {
    this.startIndex = event.pageIndex * event.pageSize;
    this.endIndex = this.startIndex + event.pageSize;
    this.pageIndex = event.pageIndex + 1;

    if (this.endIndex > this.allRows.length) {
      this.endIndex = this.allRows.length;
    }
    this.applyRunSort(false);
  }

  openDialog(mode: DialogMode, record?: AutoDebitDetailRecord) {
    this.dialogMode = mode;
    this.selectedRecord = null;
    this.saving = false;
    this.updateFormTitleAndSaveButton();

    // If a record was clicked, fetch latest details from API using its GUID id
    const id = (record as any)?.id || (record as any)?.guid || (record as any)?.detailId;
    if (id) {
      this.adeService.fetchById(String(id)).subscribe({
        next: (rec) => {
          this.selectedRecord = rec as any;
          this.cdr.markForCheck();
        },
        error: () => {
          // Fallback to passed-in data in case of an error
          this.selectedRecord = record ?? null;
          this.cdr.markForCheck();
        },
      });
    } else {
      this.selectedRecord = record ?? null;
    }

    this.formDialog.open();
  }

  updateFormTitleAndSaveButton() {
    this.formTitle = 'Autodebit Enrollment';
    this.saveButtonTitle = 'Save';

    if (this.dialogMode === 'add') {
      this.formTitle = 'Add ' + this.formTitle;
    }

    if (this.dialogMode === 'edit') {
      this.formTitle = 'Edit ' + this.formTitle;
      this.saveButtonTitle = 'Update';
    }

    if (this.dialogMode === 'view') {
      this.formTitle += ' Details';
    }
  }

  submitChildForm() {
    if (this.saving || this.submitGuard) return;
    // Guard against rapid double clicks before saving flag flips
    this.submitGuard = true;
    // Directly call child submit through @Output trigger
    this.submitRequested++; // 👈 increment to trigger child once
    // Release the guard shortly; by then child will have emitted or validation will fail
    setTimeout(() => { this.submitGuard = false; }, 600);
  }

  handleSave(record: AutoDebitDetailRecord) {
    if (this.saving) return; // prevent double-submit
    this.saving = true;
    // We need SSN in the payload; use current header value
    const ssn = this.ssn;
    // If editing, include the id from the selected record
    const id = (this.selectedRecord as any)?.id;
    const payload = id ? { ...record, id } : { ...record };
    this.adeService
      .saveDetails({ ...payload, ssn })
      .pipe(
        switchMap((resp: any) => {
          const msg = resp?.message || 'Saved successfully';
          this.toast.show(msg);
          const saved = this.adeService.coerceToRecordFromResponse(resp);
          // Optimistic update: update existing row or prepend new one locally
          if (saved?.id) {
            const idToUpdate = (this.selectedRecord as any)?.id;
            if (idToUpdate) {
              this.adeService.updateRowById(idToUpdate, saved);
            }
          }
          // Ensure dialog close runs in Angular zone
          this.zone.run(() => this.closeDialog());
          // Trigger a single refresh for consistency
          return ssn && ssn.trim() ? this.adeService.fetchBySsn(ssn) : of([]);
        }),
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({
        next: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck(),
      });
  }

  closeDialog() {
    this.submitRequested = 0; // 👈 reset counter
    this.formDialog.close();
  }

  onBack(): void {
    this.router.navigate(['/dashboard']);
  }

  toggleSsn(): void {
    this.showSsn = !this.showSsn;
  }

  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.show('Copied to clipboard');
    } catch {
      // ignore copy errors in non-secure contexts
    }
  }

  // Sorting handlers
  setRunSort(column: keyof AutoDebitDetailRecord): void {
    if (this.runSortColumn !== column) {
      this.runSortColumn = column;
      this.runSortDirection = 'asc';
    } else {
      this.runSortDirection = this.runSortDirection === 'asc' ? 'desc' : (this.runSortDirection === 'desc' ? '' : 'asc');
      if (!this.runSortDirection) {
        this.runSortColumn = '' as any;
      }
    }
    this.applyRunSort();
  }

  private applyRunSort(recalculateSlice: boolean = true): void {
    const data = [...this.allRows];
    if (!this.runSortColumn || !this.runSortDirection) {
      // No sort; just slice current page
      const start = this.startIndex ?? 0;
      const end = this.endIndex ?? this.itemsPerPage;
      this.rows = data.slice(start, end);
      return;
    }
    const dir = this.runSortDirection === 'asc' ? 1 : -1;
    const col = this.runSortColumn as keyof AutoDebitDetailRecord;

    const parseUsDate = (val: any): Date => {
      const s = String(val ?? '');
      const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) {
        const month = Number(m[1]) - 1;
        const day = Number(m[2]);
        const year = Number(m[3]);
        return new Date(year, month, day);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? new Date(0) : d;
    };

    const getComparable = (r: AutoDebitDetailRecord): string | number | Date => {
      if (col === 'startDate' || col === 'endDate' || col === 'lastChange') {
        return parseUsDate((r as any)[col]);
      }
      if (col === 'processDay') {
        const n = Number((r as any)[col]);
        return isNaN(n) ? 0 : n;
      }
      return String((r as any)[col] ?? '').toLowerCase();
    };

    data.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    // Update current page slice
    if (recalculateSlice) {
      const start = this.startIndex ?? 0;
      const end = this.endIndex ?? this.itemsPerPage;
      this.rows = data.slice(start, end);
    } else {
      this.rows = data.slice(this.startIndex, this.endIndex);
    }
  }
}
