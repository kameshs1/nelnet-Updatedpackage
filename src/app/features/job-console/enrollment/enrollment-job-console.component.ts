import { ChangeDetectionStrategy, Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UTableModule, UButtonModule, UDialogModule, UIconModule } from '@nelnet/unifi-components-angular';
import { JobStatusService } from '../../../core/services/job-status.service';
import { FormsModule } from '@angular/forms';
import { PaginationFooterComponent } from '../../../shared/components/pagination-footer/pagination-footer.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-enrollment-job-console',
  standalone: true,
  imports: [CommonModule, FormsModule, UTableModule, UButtonModule, UDialogModule, PaginationFooterComponent, EmptyStateComponent, UIconModule ],
  templateUrl: './enrollment-job-console.component.html',
  styleUrls: ['./enrollment-job-console.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentJobConsoleComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly jobStatusService = inject(JobStatusService);

  // Job runs (top table)
  runColumnHeader: Record<string, string | undefined> = {
    lastRun: 'Run Time',
    filesCount: 'No. of Files',
    status: 'Status'
  };
  runColumnsToRender = ['lastRun', 'filesCount', 'status'];
  runItems: Array<{ jobRunId: string; startedAt: string; processedFileCount: number; status: string; }> = [];
  runRows: Array<{ lastRun: string; filesCount: number; status: 'Running' | 'Completed' }> = [];
  runSortColumn: 'lastRun' | 'filesCount' | 'status' | '' = '';
  runSortDirection: 'asc' | 'desc' | '' = '';
  expandedIndex: number | null = null;

  // Pagination (run table)
  runPageIndex = 0;
  runPageSize = 10;
  runTotalRecords = 0; // Provided by server when available; fallback to current data length
  get totalRunRecords(): number { return this.runTotalRecords || this.runRows.length; }
  get totalRunPages(): number { const t = Math.ceil(this.totalRunRecords / this.runPageSize); return t > 0 ? t : 1; }

  fileColumnHeader: Record<string, string | undefined> = {
    name: 'File Name',
    location: 'File Location',
    count: 'No. of Requests',
    success: 'Successful Requests',
    failed: 'Failed Requests',
    rejected: 'Rejected Requests',
    status: 'Status'
  };
  fileColumnsToRender = ['name', 'location', 'count', 'success', 'failed', 'rejected', 'status'];

  files: Array<{ name: string; location: string; count: number; success: number; failed: number; rejected: number; status: 'Succeeded' | 'Failed' | 'Completed' | 'Pending'; }> = [];
  private currentJobRunId: string | null = null;
  private filesTotalRecords = 0;
  private rawFilesPage: Array<any> = [];
  fileSortColumn: 'name' | 'location' | 'count' | 'success' | 'failed' | 'rejected' | 'status' | '' = '';
  fileSortDirection: 'asc' | 'desc' | '' = '';

  // Pagination (files table)
  filesPageIndex = 0;
  filesPageSize = 10;
  get totalFileRecords(): number { return this.filesTotalRecords || this.files.length; }
  get totalFilePages(): number { const t = Math.ceil(this.totalFileRecords / this.filesPageSize); return t > 0 ? t : 1; }

  // State for file row expansion (inner table)
  expandedFileIndex: number | null = null;
  requestFilterStatus: 'Succeeded' | 'Failed' | 'Rejected' | null = null;

  // Request level (third table)
  requestColumnHeader: Record<string, string | undefined> = {
    requestKey: 'Request Key',
    payload: 'Request Payload',
    status: 'Status',
    retry: 'Retry Count',
    start: 'Start Time',
    end: 'End Time'
  };
  requestColumnsToRender = ['requestKey', 'payload', 'status', 'retry', 'start', 'end'];
  requests: Array<{ requestKey: string; payload?: string; status: 'Succeeded' | 'Failed' | 'Rejected'; retry: number; start: string; end: string; }> = [];
  requestSortColumn: 'requestKey' | 'payload' | 'status' | 'retry' | 'start' | 'end' | '' = '';
  requestSortDirection: 'asc' | 'desc' | '' = '';

  // Pagination (requests table)
  pageIndex = 0;
  pageSize = 10;

  get filteredRequests(): typeof this.requests {
    if (!this.requestFilterStatus) return this.requests;
    return this.requests.filter(r => r.status === this.requestFilterStatus);
  }

  get totalRecords(): number { return this.filteredRequests.length; }

  get totalPages(): number {
    const total = Math.ceil(this.totalRecords / this.pageSize);
    return total > 0 ? total : 1;
  }

  // Requests are sliced in the shared footer + in-memory; template binds to `requests`/filters directly

  constructor() {
    this.loadRunPage(0, this.runPageSize);
  }

  invokeEnrollment(): void {
    this.jobStatusService.invokeEnrollmentJob().subscribe({
      next: () => {
        // Refresh the run table after invoking
        this.loadRunPage(0, this.runPageSize);
      }
    });
  }

  private loadRunPage(pageIndex: number, pageSize: number): void {
    const apiPage = pageIndex + 1; // API is 1-based
    this.jobStatusService.getJobRunStatus('E', apiPage, pageSize).subscribe({
      next: (res) => {
        this.runItems = res.data as any;
        this.runRows = this.runItems.map((r) => ({
          lastRun: this.formatDateTime(r.startedAt),
          filesCount: r.processedFileCount,
          status: r.status?.toString().toLowerCase().includes('run') ? 'Running' : 'Completed'
        }));
        this.runPageIndex = pageIndex;
        this.runPageSize = pageSize;
        this.runTotalRecords = Number((res as any).totalCount ?? (res.data?.length ?? 0));
        this.cdr.markForCheck();
      }
    });
  }

  toggleDetails(index: number): void {
    const isExpanding = this.expandedIndex !== index;
    this.expandedIndex = isExpanding ? index : null;
    this.filesPageIndex = 0;
    this.expandedFileIndex = null;
    this.requestFilterStatus = null;
    this.pageIndex = 0;
    if (isExpanding) {
      const run = this.runItems[index];
      const fileCount = Number((run as any)?.processedFileCount ?? 0);
      if (run && run.jobRunId && fileCount > 0) {
        this.currentJobRunId = run.jobRunId;
        this.loadRunDetailsPage(0, this.filesPageSize);
      } else {
        // No files for this run — ensure tables are cleared
        this.currentJobRunId = null;
        this.rawFilesPage = [];
        this.files = [];
        this.filesTotalRecords = 0;
        this.requests = [];
      }
    }
  }

  toggleFileDetails(index: number): void {
    // Chevron toggle opens/closes details and clears any applied status filter
    this.expandedFileIndex = this.expandedFileIndex === index ? null : index;
    this.requestFilterStatus = null;
    this.pageIndex = 0;
    // When opening a file row, populate requests from the cached raw page
    if (this.expandedFileIndex !== null) {
      const raw = this.rawFilesPage[this.expandedFileIndex] ?? null;
      const items = (raw?.requests ?? []) as Array<any>;
      this.requests = items.map(req => ({
        requestKey: req.requestKey,
        payload: req.requestPayload,
        status: this.normalizeRequestStatus(req.status) as any,
        retry: req.retryAttempt ?? 0,
        start: req.startedAt ? this.formatDateTime(req.startedAt) : '',
        end: req.finishedAt ? this.formatDateTime(req.finishedAt) : ''
      }));
    } else {
      this.requests = [];
    }
    this.cdr.markForCheck();
  }

  showRequestsFor(index: number, status: 'Succeeded' | 'Failed' | 'Rejected'): void {
    if (this.expandedFileIndex !== index) {
      this.expandedFileIndex = index;
      this.requestFilterStatus = status;
    } else {
      // If clicking same status again, remove filter (show all)
      this.requestFilterStatus = this.requestFilterStatus === status ? null : status;
    }
    this.pageIndex = 0;
    this.cdr.markForCheck();
  }

  selectedPayload: unknown | null = null;

  selectPayload(payload: unknown): void {
    if (typeof payload === 'string') {
      try {
        this.selectedPayload = JSON.parse(payload);
      } catch {
        this.selectedPayload = payload;
      }
    } else {
      this.selectedPayload = payload;
    }
    this.cdr.markForCheck();
  }

  // Sorting: Job Runs
  setRunSort(column: 'lastRun' | 'filesCount' | 'status'): void {
    if (this.runSortColumn !== column) {
      this.runSortColumn = column;
      this.runSortDirection = 'asc';
    } else {
      // cycle: asc -> desc -> none -> asc
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
    const data = [...this.runRows];
    if (!this.runSortColumn || !this.runSortDirection) { this.runRows = data; this.cdr.markForCheck(); return; }
    const dir = this.runSortDirection === 'asc' ? 1 : -1;
    const col = this.runSortColumn;
    const getComparable = (r: { lastRun: string; filesCount: number; status: string; }): string | number | Date => {
      if (col === 'filesCount') return r.filesCount;
      if (col === 'status') return String(r.status).toLowerCase();
      return this.parseDateTime(r.lastRun);
    };
    data.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    this.runRows = data;
    this.runPageIndex = 0;
    this.cdr.markForCheck();
  }

  goToRunPage(i: number): void {
    const bounded = Math.max(0, Math.min(this.totalRunPages - 1, i));
    if (bounded !== this.runPageIndex) this.loadRunPage(bounded, this.runPageSize);
  }

  setRunPageSize(size: number): void {
    this.loadRunPage(0, size);
  }

  // Sorting: Files
  setFileSort(column: 'name' | 'location' | 'count' | 'success' | 'failed' | 'rejected' | 'status'): void {
    if (this.fileSortColumn !== column) {
      this.fileSortColumn = column;
      this.fileSortDirection = 'asc';
    } else {
      this.fileSortDirection = this.fileSortDirection === 'asc' ? 'desc' : (this.fileSortDirection === 'desc' ? '' : 'asc');
      if (!this.fileSortDirection) {
        this.fileSortColumn = '';
      }
    }
    this.expandedFileIndex = null;
    this.requestFilterStatus = null;
    this.filesPageIndex = 0;
    this.applyFileSort();
    this.cdr.markForCheck();
  }

  private applyFileSort(): void {
    const data = [...this.files];
    if (!this.fileSortColumn || !this.fileSortDirection) { this.files = data; this.cdr.markForCheck(); return; }
    const dir = this.fileSortDirection === 'asc' ? 1 : -1;
    const col = this.fileSortColumn;
    const getComparable = (r: { name: string; location: string; count: number; success: number; failed: number; rejected: number; status: string; }): string | number => {
      if (col === 'count' || col === 'success' || col === 'failed' || col === 'rejected') return r[col];
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
    this.cdr.markForCheck();
  }

  goToFilesPage(i: number): void {
    const bounded = Math.max(0, Math.min(this.totalFilePages - 1, i));
    if (bounded !== this.filesPageIndex) {
      this.filesPageIndex = bounded;
      if (this.currentJobRunId) {
        this.loadRunDetailsPage(this.filesPageIndex, this.filesPageSize);
      }
      this.cdr.markForCheck();
    }
  }

  setFilesPageSize(size: number): void {
    this.filesPageSize = size;
    this.filesPageIndex = 0;
    if (this.currentJobRunId) {
      this.loadRunDetailsPage(0, this.filesPageSize);
    }
    this.cdr.markForCheck();
  }

  // Sorting: Requests
  setRequestSort(column: 'requestKey' | 'payload' | 'status' | 'retry' | 'start' | 'end'): void {
    if (this.requestSortColumn !== column) {
      this.requestSortColumn = column;
      this.requestSortDirection = 'asc';
    } else {
      this.requestSortDirection = this.requestSortDirection === 'asc' ? 'desc' : (this.requestSortDirection === 'desc' ? '' : 'asc');
      if (!this.requestSortDirection) {
        this.requestSortColumn = '';
      }
    }
    this.applyRequestSort();
    this.cdr.markForCheck();
  }

  private applyRequestSort(): void {
    const data = [...this.requests];
    if (!this.requestSortColumn || !this.requestSortDirection) { this.requests = data; this.cdr.markForCheck(); return; }
    const dir = this.requestSortDirection === 'asc' ? 1 : -1;
    const col = this.requestSortColumn;
    const getComparable = (r: { requestKey: string; payload?: string; status: string; retry: number; start: string; end: string; }): string | number | Date => {
      if (col === 'retry') return r.retry;
      if (col === 'start') return this.parseDateTime(r.start);
      if (col === 'end') return this.parseDateTime(r.end);
      return String((r as any)[col] ?? '').toLowerCase();
    };
    data.sort((a, b) => {
      const va = getComparable(a);
      const vb = getComparable(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    this.requests = data;
    this.pageIndex = 0;
    this.cdr.markForCheck();
  }

  goToPage(i: number): void {
    const bounded = Math.max(0, Math.min(this.totalPages - 1, i));
    if (bounded !== this.pageIndex) {
      this.pageIndex = bounded;
      this.cdr.markForCheck();
    }
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.pageIndex = 0;
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

  private loadRunDetailsPage(pageIndex: number, pageSize: number): void {
    if (!this.currentJobRunId) { this.files = []; this.filesTotalRecords = 0; this.cdr.markForCheck(); return; }
    const apiPage = pageIndex + 1;
    this.jobStatusService.getJobRunDetails(this.currentJobRunId, apiPage, pageSize).subscribe({
      next: (res) => {
        this.rawFilesPage = (res.data ?? []) as Array<any>;
        this.files = this.rawFilesPage.map(f => {
          const requests = (f.requests ?? []) as Array<any>;
          const normalized = requests.map(r => this.normalizeRequestStatus(r.status));
          const success = normalized.filter(s => s === 'Succeeded').length;
          const failed = normalized.filter(s => s === 'Failed').length;
          const rejected = normalized.filter(s => s === 'Rejected').length;
          return {
            name: f.fileName,
            location: f.fileLocation,
            count: requests.length,
            success,
            failed,
            rejected,
            status: (f.status ?? 'Completed') as any
          };
        });
        this.filesTotalRecords = Number((res as any).totalCount ?? this.files.length);
        // Reset inner-table state and requests
        this.expandedFileIndex = null;
        this.requests = [];
        this.cdr.markForCheck();
      }
    });
  }

  private normalizeRequestStatus(status: unknown): 'Succeeded' | 'Failed' | 'Rejected' | 'Pending' | '' {
    const s = String(status ?? '').trim().toLowerCase();
    if (s.includes('fail')) return 'Failed';
    if (s.includes('reject')) return 'Rejected';
    if (s.includes('succeed') || s.includes('complete')) return 'Succeeded';
    if (s.includes('pend')) return 'Pending';
    return '';
  }

}


