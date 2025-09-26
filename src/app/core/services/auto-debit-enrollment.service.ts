import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, finalize, shareReplay } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AutoDebitRecord {
  id?: string; // GUID for detail fetch
  eftControl: string;
  eftEligible: string;
  startDate: string; // MM/DD/YYYY
  endDate: string;   // MM/DD/YYYY
  bankId: string; // used in list view; maps to id or routing number depending on endpoint
  routingNumber?: string;
  csInd: string;
  lastChange: string; // MM/DD/YYYY
  override: string;
  processDay: number | string;
  accountNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class AutoDebitEnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly rowsSubject = new BehaviorSubject<AutoDebitRecord[]>([]);
  readonly rows$: Observable<AutoDebitRecord[]> = this.rowsSubject.asObservable();
  private readonly inflightBySsn = new Map<string, Observable<AutoDebitRecord[]>>();
  private readonly inflightSaves = new Map<string, Observable<any>>();

  private normalizeDate(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  private toYN(v: any): string {
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'yes' || s === 'y' || s === 'true' || s === '1') return 'Y';
    if (s === 'no' || s === 'n' || s === 'false' || s === '0') return 'N';
    const up = String(v ?? '').toUpperCase();
    return up === 'Y' || up === 'N' ? up : '';
  }

  private mapDtoToRecord(d: any): AutoDebitRecord {
    return {
      id: d?.id ?? d?.guid ?? d?.enrollmentId ?? d?.detailId ?? '',
      eftControl: this.toYN(d?.eftControl ?? d?.eftControlCode ?? d?.eft_control),
      eftEligible: this.toYN(d?.eftEligible ?? d?.eftIncentiveEligible ?? d?.eft_eligible),
      startDate: this.normalizeDate(d?.startDate ?? d?.beginDate ?? d?.effectiveDate ?? d?.start_date),
      endDate: this.normalizeDate(d?.endDate ?? d?.terminationDate ?? d?.expireDate ?? d?.end_date),
      bankId: d?.id ?? d?.bankId ?? d?.bankID ?? d?.routingNumber ?? d?.rtn ?? '',
      routingNumber: d?.routingNumber ?? d?.rtn ?? '',
      csInd: String(d?.c_S_Ind ?? d?.csInd ?? d?.csIndicator ?? d?.cs_ind ?? '').toUpperCase(),
      lastChange: this.normalizeDate(d?.lastChangedDate ?? d?.lastChange ?? d?.lastChangeDate ?? d?.last_change_date),
      override: this.toYN(d?.override ?? d?.overrideSwitch ?? d?.override_switch),
      processDay: d?.processDay ?? d?.processDayOfMonth ?? d?.cycleDay ?? d?.process_day ?? '',
      accountNumber: d?.accountNumber ?? d?.acctNumber ?? d?.accountNo ?? d?.account_number ?? ''
    };
  }

  /** Public: best-effort mapping from API response to AutoDebitRecord. */
  coerceToRecordFromResponse(resp: any): AutoDebitRecord | null {
    if (!resp) return null;
    const container = resp?.data ?? resp;
    const d = Array.isArray(container)
      ? container[0]
      : container?.enrollment ?? container?.detail ?? container;
    try {
      return this.mapDtoToRecord(d);
    } catch {
      return null;
    }
  }

  constructor() {
    // Initialize with empty dataset; no mock JSON
    this.load();
  }

  /** Create or update details. For update include id; for add omit id. */
  saveDetails(payload: Partial<AutoDebitRecord> & { ssn: string }): Observable<any> {
    const url = `${environment.apiBaseUrl}AutoDebitEnrollments/saveAutoDebitDetails`;

    const toYesNo = (v: any): string => {
      const s = String(v ?? '').toUpperCase();
      if (s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1') return 'Yes';
      if (s === 'N' || s === 'NO' || s === 'FALSE' || s === '0') return 'No';
      return s === 'YES' || s === 'NO' ? s : '';
    };

    const toIso = (value: any): string | undefined => {
      if (!value) return undefined;
      // Accept already-ISO strings
      const s = String(value);
      if (/\d{4}-\d{2}-\d{2}T/.test(s)) return s;
      // Expect mm/dd/yyyy per project preference
      const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) {
        const month = Number(m[1]) - 1;
        const day = Number(m[2]);
        const year = Number(m[3]);
        const d = new Date(year, month, day);
        return d.toISOString();
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    const cleanSsn = String((payload as any).ssn ?? '').replace(/[^0-9]/g, '');

    const body: any = {
      ...(payload.id ? { id: payload.id } : {}),
      ssn: cleanSsn,
      eftControl: toYesNo(payload.eftControl),
      eftIncentiveEligible: toYesNo(payload.eftEligible),
      startDate: toIso(payload.startDate),
      endDate: toIso(payload.endDate),
      routingNumber: payload.routingNumber ?? payload.bankId ?? '',
      accountNumber: payload.accountNumber ?? '',
      c_S_Ind: String(payload.csInd ?? '').toLowerCase(),
      lastChangedDate: toIso(payload.lastChange) ?? new Date().toISOString(),
      overrideSwitch: toYesNo(payload.override),
      processDay: String(payload.processDay ?? ''),
    };

    // Build a dedupe key for in-flight POSTs (prevents duplicate record creation)
    const saveKey = JSON.stringify({
      id: body.id ?? '',
      ssn: body.ssn,
      startDate: body.startDate,
      endDate: body.endDate,
      routingNumber: body.routingNumber,
      accountNumber: body.accountNumber,
      cs: body.c_S_Ind,
      override: body.overrideSwitch,
      processDay: body.processDay,
    });

    const existing = this.inflightSaves.get(saveKey);
    if (existing) {
      return existing;
    }

    const req$ = this.http.post(url, body).pipe(
      finalize(() => this.inflightSaves.delete(saveKey)),
      shareReplay(1)
    );
    this.inflightSaves.set(saveKey, req$);
    return req$;
  }

  getRows(): AutoDebitRecord[] {
    return this.rowsSubject.getValue();
  }

  setRows(rows: AutoDebitRecord[]): void {
    this.rowsSubject.next([...rows]);
  }

  updateRow(index: number, updated: Partial<AutoDebitRecord>): void {
    const current = this.getRows();
    if (index < 0 || index >= current.length) return;
    const next = [...current];
    next[index] = { ...next[index], ...updated } as AutoDebitRecord;
    this.rowsSubject.next(next);
  }

  /** Initialize rows to empty - live data will populate when backend is wired. */
  load(): void {
    this.setRows([]);
  }

  /** Fetch enrollment details by SSN and update rows stream. */
  fetchBySsn(ssn: string): Observable<AutoDebitRecord[]> {
    const digits = String(ssn ?? '').replace(/[^0-9]/g, '');
    const existing = this.inflightBySsn.get(digits);
    if (existing) {
      return existing;
    }
    const params = new HttpParams().set('ssn', digits);
    const url = `${environment.apiBaseUrl}AutoDebitEnrollments/getAutoDebitDetails`;
    const req$ = this.http.get<any>(url, { params }).pipe(
      map((resp: any) => {
        const details = Array.isArray(resp?.data?.borrowerDetails)
          ? resp.data.borrowerDetails
          : Array.isArray(resp?.borrowerDetails)
          ? resp.borrowerDetails
          : Array.isArray(resp)
          ? resp
          : [];
        const rows: AutoDebitRecord[] = details.map((d: any) => this.mapDtoToRecord(d));

        this.setRows(rows);
        return rows;
      }),
      finalize(() => {
        this.inflightBySsn.delete(digits);
      }),
      shareReplay(1)
    );
    this.inflightBySsn.set(digits, req$);
    return req$;
  }

  /** Fetch a single enrollment detail by ID. */
  fetchById(id: string): Observable<AutoDebitRecord> {
    const url = `${environment.apiBaseUrl}AutoDebitEnrollments/getAutoDebitDetails/${encodeURIComponent(id)}`;
    return this.http.get<any>(url).pipe(
      map((resp: any) => {
        // Support multiple possible shapes from backend
        const container = resp?.data ?? resp;
        const d = Array.isArray(container)
          ? container[0]
          : Array.isArray(container?.borrowerDetails)
          ? container.borrowerDetails[0]
          : container?.enrollment ?? container?.detail ?? container;
        return this.mapDtoToRecord(d);
      })
    );
  }

  /** Update a row in-place by id with a full or partial record. */
  updateRowById(id: string, patch: Partial<AutoDebitRecord>): void {
    const rows = this.getRows();
    const idx = rows.findIndex((r: any) => (r?.id ?? '') === id);
    if (idx === -1) return;
    const updated = { ...rows[idx], ...patch } as AutoDebitRecord;
    const next = [...rows];
    next[idx] = updated;
    this.setRows(next);
  }
}


