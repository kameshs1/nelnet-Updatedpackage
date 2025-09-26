import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoaderService {
  private readonly activeCount$ = new BehaviorSubject<number>(0);
  readonly isLoading$ = this.activeCount$.asObservable();

  increment(): void { this.activeCount$.next(this.activeCount$.getValue() + 1); }
  decrement(): void {
    const next = Math.max(0, this.activeCount$.getValue() - 1);
    this.activeCount$.next(next);
  }
}


