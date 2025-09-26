import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, ReplaySubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface BorrowerRecord {
  fullName: string;
  status: 'Active' | 'Inactive';
  ssn: string;
  accountNumber: string;
  startDate: string;
  endDate: string;
  avatarUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AutoDebitSearchService {
  // Dataset used for searching (loaded from mock or API)
  private data$ = new ReplaySubject<BorrowerRecord[]>(1);
  // Persisted history of last successful search result (single-item list)
  private history$ = new ReplaySubject<BorrowerRecord[]>(1);
  private historyList: BorrowerRecord[] = [];

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}AutoDebitEnrollments`;

  constructor() {
    // Initialize history from localStorage, default to empty.
    try {
      const cached = localStorage.getItem('borrower_history');
      if (cached) {
        const parsed = JSON.parse(cached) as BorrowerRecord[];
        if (Array.isArray(parsed)) {
          this.historyList = parsed;
          this.history$.next(this.historyList);
        } else {
          this.historyList = [];
          this.history$.next(this.historyList);
        }
      } else {
        this.historyList = [];
        this.history$.next(this.historyList);
      }
    } catch {
      this.historyList = [];
      this.history$.next(this.historyList);
    }
  }

  load(): Observable<BorrowerRecord[]> {
    // Do not call mock JSON; initialize with empty dataset.
    const empty: BorrowerRecord[] = [];
    this.data$.next(empty);
    return of(empty);
  }

  getData(): Observable<BorrowerRecord[]> {
    return this.data$.asObservable();
  }

  getHistory(): Observable<BorrowerRecord[]> {
    return this.history$.asObservable();
  }

  addToHistory(record: BorrowerRecord): void {
    // Unique by account number (digits) or SSN digits
    const digits = (s: string) => String(s || '').replace(/[^0-9]/g, '');
    const accountKey = digits(record.accountNumber);
    const ssnKey = digits(record.ssn);

    const filtered = this.historyList.filter(r => {
      const a = digits(r.accountNumber);
      const s = digits(r.ssn);
      // keep entries that are not the same as the new one
      return !(a && accountKey && a === accountKey) && !(s && ssnKey && s === ssnKey);
    });

    // Add to front
    this.historyList = [{ ...record }, ...filtered];
    // Optional: cap history size
    if (this.historyList.length > 20) this.historyList = this.historyList.slice(0, 20);

    this.history$.next(this.historyList);
    try {
      localStorage.setItem('borrower_history', JSON.stringify(this.historyList));
    } catch {
      // ignore storage write errors
    }
  }

  clearHistory(): void {
    this.historyList = [];
    this.history$.next(this.historyList);
    try {
      localStorage.removeItem('borrower_history');
    } catch {
      // ignore storage write errors
    }
  }

  searchByAccount(accountNumber: string): Observable<BorrowerRecord | null> {
    return this.getData().pipe(
      map((items) => items.find((r) => r.accountNumber === accountNumber) ?? null)
    );
  }

  searchBySsn(ssn: string): Observable<BorrowerRecord | null> {
    const normalized = ssn.replace(/[^0-9]/g, '');
    return this.getData().pipe(
      map(
        (items) =>
          items.find((r) => r.ssn.replace(/[^0-9]/g, '') === normalized) ?? null
      )
    );
  }

  /**
   * Calls backend to search borrower by account number or SSN.
   * searchBy: 'accountnumber' | 'ssn'; value is raw user input (we will normalize).
   */
  searchBorrower(searchBy: 'accountnumber' | 'ssn', value: string): Observable<BorrowerRecord | null> {
    const params = new HttpParams()
      .set('searchBy', searchBy)
      .set('searchValue', String(value ?? '').trim());

    return this.http
      .get<any>(`${this.baseUrl}/getBorrowerDetailsByParam`, { params })
      .pipe(
        map((res) => {
          const payload = Array.isArray(res?.data) ? res.data[0] : (res?.data ?? res);
          if (!payload) return null;
          const record: BorrowerRecord = {
            fullName: payload.name || payload.borrowerName || payload.fullName || '',
            status: (payload.status || 'Active') as 'Active' | 'Inactive',
            ssn: this.formatSsn(payload.ssn || payload.SSN || String(payload['ssn']) || payload.socialSecurityNumber || ''),
            accountNumber: String(payload.accountNumber ?? payload.accountNo ?? payload.account ?? payload['accountnumber'] ?? ''),
            startDate: payload.startDate || payload['startDate'] || '',
            endDate: payload.endDate || payload['endDate'] || '',
            avatarUrl: ''
          };
          return (record.accountNumber || record.ssn) ? record : null;
        }),
        catchError(() => of(null))
      );
  }

  private formatSsn(input: string): string {
    const digits = String(input ?? '').replace(/[^0-9]/g, '');
    if (digits.length !== 9) return digits || '';
    return `${digits.substring(0,3)}-${digits.substring(3,5)}-${digits.substring(5)}`;
  }
}


