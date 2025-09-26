import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface JobRunItem {
  jobRunId: string;
  startedAt: string;
  processedFileCount: number;
  status: string;
}

export interface JobRunStatusPage {
  data: JobRunItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class JobStatusService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}JobStatus`;

  getJobRunStatus(jobType: 'E' | 'A', pageNumber: number, pageSize: number): Observable<JobRunStatusPage> {
    const params = new HttpParams()
      .set('jobType', jobType)
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    return this.http.get<JobRunStatusPage>(`${this.baseUrl}/getJobRunStatus`, { params });
  }

  getJobRunDetails(jobRunId: string, pageNumber: number, pageSize: number): Observable<{
    data: Array<{
      fileRunId: string;
      fileName: string;
      fileLocation: string;
      status: string;
      requests: Array<{
        requestRunId: string;
        requestKey: string;
        requestPayload: string;
        retryAttempt: number;
        status: string;
        startedAt: string | null;
        finishedAt: string | null;
      }>;
    }>;
    pageNumber: number;
    pageSize: number;
    totalCount: number;
  }> {
    const params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    return this.http.get<any>(`${this.baseUrl}/getJobRunDetails/${jobRunId}`, { params });
  }

  invokeEnrollmentJob(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/InvokeEnrollmentJob`, {});
  }

  invokeAchJob(cycleDate: string): Observable<{ data?: unknown; message?: string; isSuccess?: boolean; errorCode?: unknown }> {
    const params = new HttpParams().set('cycleDate', cycleDate);
    return this.http.post<{ data?: unknown; message?: string; isSuccess?: boolean; errorCode?: unknown }>(`${this.baseUrl}/InvokeACHJob`, {}, { params });
  }
}


