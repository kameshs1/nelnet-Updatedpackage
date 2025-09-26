import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UTableModule, UButtonModule, UDialogModule, UIconModule, UDatePickerModule, UFormControlModule, UInputModule, ULabelModule  } from '@nelnet/unifi-components-angular';
import { FormsModule } from '@angular/forms';
import { JobStatusService } from '../../../core/services/job-status.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { PaginationFooterComponent } from '../../../shared/components/pagination-footer/pagination-footer.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-ach-job-console',
  standalone: true,
  imports: [CommonModule, FormsModule, UTableModule, UButtonModule, UDialogModule, UIconModule, PaginationFooterComponent, EmptyStateComponent, UDatePickerModule, UFormControlModule, UInputModule, ULabelModule],
  templateUrl: './ach-job-console.component.html',
  styleUrls: ['./ach-job-console.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchJobConsoleComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly jobStatusService = inject(JobStatusService);
  private readonly toast = inject(ToastService);
  runColumnHeader: Record<string, string | undefined> = {
    runTime: 'Run Time',
    status: 'Status'
  };
  runColumnsToRender = ['runTime', 'status'];
  rows: Array<{ jobRunId: string; runTime: string; status: 'Running' | 'Completed' | 'Failed'; processedFileCount?: number }> = [];
  runSortColumn: 'runTime' | 'status' | '' = '';
  runSortDirection: 'asc' | 'desc' | '' = '';

  // Pagination (run table) - driven by footer; track only current size
  private currentRunPageSize = 10;
  runTotalRecords = 0;
  get totalRunRecords(): number { return this.runTotalRecords || this.rows.length; }

  expandedIndex: number | null = null;

  fileColumnHeader: Record<string, string | undefined> = {
    name: 'File Name',
    location: 'File Location',
    action: 'Action'
  };
  fileColumnsToRender = ['name', 'location', 'action'];

  files: Array<{ name: string; location: string; count: number; status: string }> = [];
  private currentJobRunId: string | null = null;
  fileSortColumn: 'name' | 'location' | '' = '';
  fileSortDirection: 'asc' | 'desc' | '' = '';

  // Pagination (files table)
  filesPageIndex = 0;
  filesPageSize = 10;
  get totalFileRecords(): number { return this.files.length; }
  get totalFilePages(): number { const t = Math.ceil(this.totalFileRecords / this.filesPageSize); return t > 0 ? t : 1; }

  toggleDetails(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  // Dialog form state
  cycleDate = '';

  triggerPicker(input: HTMLInputElement): void {
    try { (input as any).showPicker?.(); } catch { /* noop */ }
  }

  normalizeCycleDate(value: string): void {
    const raw = (value || '').trim();
    if (!raw) { this.cycleDate = ''; this.cdr.markForCheck(); return; }
    // Accept both mm/dd/yyyy and yyyy-mm-dd; normalize to mm/dd/yyyy
    let normalized = '';
    const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (us) {
      normalized = `${us[1].padStart(2,'0')}/${us[2].padStart(2,'0')}/${us[3]}`;
    } else if (iso) {
      normalized = `${iso[2].padStart(2,'0')}/${iso[3].padStart(2,'0')}/${iso[1]}`;
    }
    if (!normalized) { this.cycleDate = ''; this.cdr.markForCheck(); return; }
    // Validate date components
    const [mm, dd, yyyy] = normalized.split('/').map(Number);
    const dt = new Date(yyyy, mm - 1, dd);
    const valid = dt.getFullYear() === yyyy && dt.getMonth() === mm - 1 && dt.getDate() === dd;
    this.cycleDate = valid ? normalized : '';
    this.cdr.markForCheck();
  }

  // Backward compatibility if any template still calls this handler
  onPickCycleDate(value: string): void {
    this.normalizeCycleDate(value);
  }

  onOpen(dialog: { open: () => void }): void {
    this.cycleDate = '';

    this.cdr.markForCheck();
    dialog.open();
  }

  onConfirm(dialog: { close: () => void }): void {
    const date = (this.cycleDate || '').trim();
    if (!date) { this.toast.show('Cycle Date is required'); return; }
    // Trigger API and immediately close dialog to provide quick feedback
    const request$ = this.jobStatusService.invokeAchJob(date);
    dialog.close();
    request$.subscribe({
      next: (res) => {
        const msg = (res && typeof res.message === 'string' && res.message.trim()) ? res.message : 'ACH job invoked successfully';
        this.toast.show(msg);
        // Refresh run table after invoking job
        this.loadRunPage(0, this.currentRunPageSize);
      }
    });
  }

  constructor() {
    this.loadRunPage(0, this.currentRunPageSize);
  }

  private loadRunPage(pageIndex: number, pageSize: number): void {
    const apiPage = pageIndex + 1;
    this.jobStatusService.getJobRunStatus('A', apiPage, pageSize).subscribe({
      next: (res) => {
        this.rows = res.data.map((r) => ({
          jobRunId: r.jobRunId,
          runTime: this.formatDateTime(r.startedAt),
          status: (r.status ?? '').toString().toLowerCase().includes('run') ? 'Running' : (r.status as any),
          processedFileCount: r.processedFileCount
        }));
        this.runTotalRecords = res.totalCount as any as number ?? 0;
        this.currentRunPageSize = pageSize;
        this.cdr.markForCheck();
      }
    });
  }

  // Sorting: Job runs
  setRunSort(column: 'runTime' | 'status'): void {
    if (this.runSortColumn !== column) {
      this.runSortColumn = column;
      this.runSortDirection = 'asc';
    } else {
      this.runSortDirection = this.runSortDirection === 'asc' ? 'desc' : (this.runSortDirection === 'desc' ? '' : 'asc');
      if (!this.runSortDirection) {
        this.runSortColumn = '';
      }
    }
    this.expandedIndex = null;
    this.applyRunSort();
    this.cdr.markForCheck();
  }

  private applyRunSort(): void {
    const data = [...this.rows];
    if (!this.runSortColumn || !this.runSortDirection) { this.rows = data; this.cdr.markForCheck(); return; }
    const dir = this.runSortDirection === 'asc' ? 1 : -1;
    const col = this.runSortColumn;
    const getComparable = (r: { runTime: string; status: string; }): string | Date => {
      if (col === 'status') return String(r.status).toLowerCase();
      return this.parseDateTime(r.runTime);
    };
    data.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    this.rows = data;
    this.cdr.markForCheck();
  }

  // Sorting: Files
  setFileSort(column: 'name' | 'location'): void {
    if (this.fileSortColumn !== column) {
      this.fileSortColumn = column;
      this.fileSortDirection = 'asc';
    } else {
      this.fileSortDirection = this.fileSortDirection === 'asc' ? 'desc' : (this.fileSortDirection === 'desc' ? '' : 'asc');
      if (!this.fileSortDirection) {
        this.fileSortColumn = '';
      }
    }
    this.applyFileSort();
    this.cdr.markForCheck();
  }

  toggleRunDetails(index: number): void {
    const row = this.rows[index];
    const fileCount = Number(row?.processedFileCount ?? 0);
    this.expandedIndex = this.expandedIndex === index ? null : index;
    if (this.expandedIndex !== null && row?.jobRunId && fileCount > 0) {
      this.currentJobRunId = row.jobRunId;
      this.loadRunDetailsPage(0, this.filesPageSize);
    } else {
      this.currentJobRunId = null;
      this.files = [];
    }
    this.cdr.markForCheck();
  }

  private loadRunDetailsPage(pageIndex: number, pageSize: number): void {
    if (!this.currentJobRunId) { this.files = []; this.cdr.markForCheck(); return; }
    const apiPage = pageIndex + 1;
    this.jobStatusService.getJobRunDetails(this.currentJobRunId, apiPage, pageSize).subscribe({
      next: (res) => {
        const rawFiles = (res.data ?? []) as Array<any>;
        this.files = rawFiles.map(f => ({
          name: f.fileName,
          location: f.fileLocation,
          count: (f.requests ?? []).length,
          status: f.status
        }));
        this.cdr.markForCheck();
      }
    });
  }

  private applyFileSort(): void {
    const data = [...this.files];
    if (!this.fileSortColumn || !this.fileSortDirection) { this.files = data; this.cdr.markForCheck(); return; }
    const dir = this.fileSortDirection === 'asc' ? 1 : -1;
    const col = this.fileSortColumn;
    const getComparable = (r: { name: string; location: string; }): string => {
      return String((r as any)[col]).toLowerCase();
    };
    data.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    this.files = data;
    this.filesPageIndex = 0;
    this.cdr.markForCheck();
  }

  goToFilesPage(i: number): void {
    const bounded = Math.max(0, Math.min(this.totalFilePages - 1, i));
    if (bounded !== this.filesPageIndex) {
      this.filesPageIndex = bounded;
      this.cdr.markForCheck();
    }
  }

  setFilesPageSize(size: number): void {
    this.filesPageSize = size;
    this.filesPageIndex = 0;
    this.cdr.markForCheck();
  }

  private parseDateTime(s: string): Date {
    const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
    if (m) {
      const month = Number(m[1]) - 1;
      const day = Number(m[2]);
      const year = Number(m[3]);
      if (m[4]) {
        let hours = Number(m[4]);
        const minutes = Number(m[5]);
        const seconds = m[6] ? Number(m[6]) : 0;
        const ampm = (m[7] || '').toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return new Date(year, month, day, hours, minutes, seconds);
      }
      return new Date(year, month, day);
    }
    return new Date(s);
  }

  private formatDateTime(iso: string): string {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hh = String(hours).padStart(2, '0');
    return `${mm}/${dd}/${yyyy} ${hh}:${minutes} ${ampm}`;
  }

  goToRunPage(i: number): void {
    this.loadRunPage(i, this.currentRunPageSize);
  }

  setRunPageSize(size: number): void {
    this.loadRunPage(0, size);
  }

  // No reactive form used; submit handled via dialog confirm if wired later
}


