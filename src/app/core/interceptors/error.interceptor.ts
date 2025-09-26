import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '../../shared/components/toast/toast.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((error: unknown) => {
      const message = deriveErrorMessage(error);
      toast.show(message);
      return throwError(() => error);
    })
  );
};

function deriveErrorMessage(error: unknown): string {
  const fallback = 'An unexpected error occurred';
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }
    const serverMsg = readNested(error.error, ['message', 'error', 'title']);
    const httpMsg = error.statusText || `${error.status}`;
    return (serverMsg || httpMsg || fallback).toString();
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

function readNested(obj: any, keys: string[]): string | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  for (const key of keys) {
    const val = obj?.[key];
    if (typeof val === 'string' && val.trim()) {
      return val;
    }
  }
  return null;
}


