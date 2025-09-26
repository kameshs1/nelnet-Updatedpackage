import { ChangeDetectionStrategy, Component, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators, NonNullableFormBuilder, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AutoDebitSearchService, BorrowerRecord } from '../../../core/services/auto-debit-search.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../../shared/shared.module';
import { UTableModule, UFormControlModule, URadioButtonModule, UFormHelperTextModule, UButtonModule, UDialogModule, UIconModule } from '@nelnet/unifi-components-angular';

type SearchBy = 'account' | 'ssn';
interface BorrowerLookupForm {
  searchBy: FormControl<SearchBy>;
  accountNumber: FormControl<string>;
  ssn: FormControl<string>;
}

// Table binds directly to BorrowerRecord[] as `data`

@Component({
  selector: 'app-borrower-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SharedModule, UTableModule, URadioButtonModule, UFormControlModule, UFormHelperTextModule, UButtonModule, UDialogModule, UIconModule ],
  templateUrl: './autoDebit-enrollment-search.component.html',
  styleUrls: ['./autoDebit-enrollment-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BorrowerLookupComponent {
  
  form: FormGroup<BorrowerLookupForm>;
  result: BorrowerRecord | null = null;
  searched = false;
  columnHeaderLabels: { [key: string]: string | undefined } = {
    accountNumber: 'Account Number',
    ssn: 'SSN',
    fullName: 'Borrower Name',
    startDate: 'Date & Time'
  };

  columnsToRender = ['accountNumber', 'ssn', 'fullName',  'startDate'];
  
  data: BorrowerRecord[] = [];
  history: BorrowerRecord[] = [];
  displayHistory: BorrowerRecord[] = [];
  sortColumn: keyof BorrowerRecord | '' = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly searchService = inject(AutoDebitSearchService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  constructor() {
    this.form = this.formBuilder.group<BorrowerLookupForm>({
      searchBy: this.formBuilder.control<SearchBy>('account', { validators: Validators.required }),
      accountNumber: this.formBuilder.control('', []),
      ssn: this.formBuilder.control('', [])
    });

    this.applyValidators();
    this.searchByCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.form.patchValue({ accountNumber: '', ssn: '' }, { emitEvent: false });
      this.result = null;
      this.searched = false;
      this.applyValidators();
    });

    // Normalize inputs
    this.accountNumberCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe((val) => {
      const digits = String(val ?? '').replace(/[^0-9]/g, '');
      if (val !== digits) this.accountNumberCtrl.setValue(digits, { emitEvent: false });
      if (this.searchByCtrl.value === 'account' && digits.length === 0) {
        this.result = null;
        this.searched = false;
      }
    });
    this.ssnCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe((val) => {
      // Enforce XXX-XX-XXXX format while typing
      const digits = String(val ?? '').replace(/[^0-9]/g, '').slice(0, 9);
      const part1 = digits.substring(0, 3);
      const part2 = digits.substring(3, 5);
      const part3 = digits.substring(5);
      const formatted = [part1, part2, part3].filter(Boolean).join('-');
      if (val !== formatted) this.ssnCtrl.setValue(formatted, { emitEvent: false });
      if (this.searchByCtrl.value === 'ssn' && digits.length === 0) {
        this.result = null;
        this.searched = false;
      }
    });

    // Keep local dataset for searching
    this.searchService.getData().pipe(takeUntilDestroyed()).subscribe({
      next: (items) => { this.data = items; }
    });

    // Bind history; starts empty until a successful search saves a record
    this.searchService.getHistory().pipe(takeUntilDestroyed()).subscribe({
      next: (items) => {
        this.history = items;
        this.applySort();
      }
    });

    // Kick off load on first visit; if data already cached in service
    // (ReplaySubject), subscriber above will receive it immediately
    this.loadMockData();
  }

  private loadMockData(): void {
    this.searchService.load().subscribe({
      next: (items) => { this.data = items; },
      error: () => { this.data = []; }
    });
  }

  private applyValidators(): void {
    const searchBy: SearchBy = this.searchByCtrl.value;
    if (searchBy === 'account') {
      this.accountNumberCtrl.setValidators([Validators.required]);
      this.ssnCtrl.clearValidators();
    } else {
      // Require SSN in strict XXX-XX-XXXX format
      this.ssnCtrl.setValidators([Validators.required, Validators.pattern(/^\d{3}-\d{2}-\d{4}$/)]);
      this.accountNumberCtrl.clearValidators();
    }
    this.accountNumberCtrl.updateValueAndValidity({ emitEvent: false });
    this.ssnCtrl.updateValueAndValidity({ emitEvent: false });
  }

  onSearch(): void {
    const searchBy: SearchBy = this.searchByCtrl.value;
    if (searchBy === 'account' && !(this.accountNumberCtrl.value ?? '').trim()) {
      this.result = null;
      this.searched = false;
      return;
    }

    this.searched = true;
    this.result = null;
    const accountDigits = String(this.accountNumberCtrl.value ?? '').replace(/[^0-9]/g, '');
    const ssnRaw = String(this.ssnCtrl.value ?? '').trim();

    const apiSearchBy = searchBy === 'account' ? 'accountnumber' : 'ssn';
    const apiValue = searchBy === 'account' ? accountDigits : ssnRaw.replace(/[^0-9]/g, '');

    this.searchService.searchBorrower(apiSearchBy, apiValue).subscribe((record) => {
      this.zone.run(() => {
        this.result = record;
        if (record) {
          const historyRecord: BorrowerRecord = { ...record, startDate: this.formatCurrentDateTime() };
          this.searchService.addToHistory(historyRecord);
        }
        this.cdr.detectChanges();
      });
    });
  }

  onClear(): void {
    this.form.patchValue({ accountNumber: '', ssn: '' });
    this.result = null;
    this.searched = false;
    this.searchService.clearHistory();
  }

  onClearConfirm(): void {
    const count = Array.isArray(this.history) ? this.history.length : 0;
    const label = count === 1 ? '1 item' : `${count} items`;
    const ok = window.confirm(`Confirm you want to clear the history (${label})?`);
    if (ok) {
      this.onClear();
    }
  }

  private formatCurrentDateTime(date: Date = new Date()): string {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad2(date.getMinutes());
    const seconds = pad2(date.getSeconds());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12; // midnight/noon edge-case -> 12
    const hours12 = pad2(hours);
    return `${month}/${day}/${year} ${hours12}:${minutes}:${seconds} ${ampm}`;
  }

  setSort(column: keyof BorrowerRecord): void {
    if (this.sortColumn !== column) {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    } else {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : (this.sortDirection === 'desc' ? '' : 'asc');
      if (!this.sortDirection) {
        this.sortColumn = '' as any;
      }
    }
    this.applySort();
  }

  private applySort(): void {
    const data = [...this.history];
    if (!this.sortColumn || !this.sortDirection) {
      this.displayHistory = data;
      return;
    }

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const col = this.sortColumn;

    const getComparable = (r: BorrowerRecord): string | number | Date => {
      if (col === 'accountNumber') return Number(String(r.accountNumber).replace(/[^0-9]/g, ''));
      if (col === 'ssn') return Number(String(r.ssn).replace(/[^0-9]/g, ''));
      if (col === 'fullName') return String(r.fullName).toLowerCase();
      if (col === 'startDate') {
        // Format is MM/DD/YYYY or MM/DD/YYYY HH:MM:SS AM/PM (optionally contained "at")
        const s = String(r.startDate);
        const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:at\s*)?(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM))?/i);
        if (m) {
          const month = Number(m[1]) - 1;
          const day = Number(m[2]);
          const year = Number(m[3]);
          if (m[4]) {
            let hours = Number(m[4]);
            const minutes = Number(m[5]);
            const seconds = Number(m[6]);
            const ampm = (m[7] || '').toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            return new Date(year, month, day, hours, minutes, seconds);
          }
          return new Date(year, month, day);
        }
        return new Date(s);
      }
      // default string compare
      return String((r as any)[col] ?? '').toLowerCase();
    };

    data.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    this.displayHistory = data;
  }

  get searchByCtrl() { return this.form.controls.searchBy; }
  get accountNumberCtrl() { return this.form.controls.accountNumber; }
  get ssnCtrl() { return this.form.controls.ssn; }

  trackByIndex(index: number, _item: BorrowerRecord): number { return index; }

  get searchDisabled(): boolean {
    const mode: SearchBy = this.searchByCtrl.value;
    if (mode === 'account') {
      const digits = String(this.accountNumberCtrl.value ?? '').replace(/[^0-9]/g, '');
      return digits.length === 0;
    }
    const ssnDigits = String(this.ssnCtrl.value ?? '').replace(/[^0-9]/g, '');
    return ssnDigits.length === 0;
  }

  get hasSearchInput(): boolean {
    const mode: SearchBy = this.searchByCtrl.value;
    if (mode === 'account') {
      const digits = String(this.accountNumberCtrl.value ?? '').replace(/[^0-9]/g, '');
      return digits.length > 0;
    }
    const ssnDigits = String(this.ssnCtrl.value ?? '').replace(/[^0-9]/g, '');
    return ssnDigits.length > 0;
  }
}


