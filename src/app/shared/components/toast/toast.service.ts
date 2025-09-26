import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage { text: string; id: number; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messages$ = new BehaviorSubject<ToastMessage[]>([]);
  readonly stream = this.messages$.asObservable();
  private counter = 0;

  show(text: string, ttlMs = 2500): void {
    const msg = { text, id: ++this.counter };
    const next = [...this.messages$.getValue(), msg];
    this.messages$.next(next);
    setTimeout(() => this.dismiss(msg.id), ttlMs);
  }

  dismiss(id: number): void {
    this.messages$.next(this.messages$.getValue().filter(m => m.id !== id));
  }
}


