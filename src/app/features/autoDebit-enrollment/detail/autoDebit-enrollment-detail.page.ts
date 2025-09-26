import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AutoDebitEnrollmentDetailComponent, AutoDebitDetailRecord } from './autoDebit-enrollment-detail.component';
import { AutoDebitEnrollmentService } from '../../../core/services/auto-debit-enrollment.service';
import { FormControl } from '@angular/forms';


@Component({
  selector: 'app-autodebit-enrollment-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, AutoDebitEnrollmentDetailComponent],
  template: `
    <ng-container *ngIf="record() as rec">
      <app-autodebit-enrollment-detail
        [mode]="editable() ? 'edit' : 'view'"
        [record]="rec"
        (submitted)="onSave($event)"
      ></app-autodebit-enrollment-detail>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutodebitEnrollmentDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(AutoDebitEnrollmentService);

  record = signal<AutoDebitDetailRecord | null>(null);
  editable = signal<boolean>(false);
  index = signal<number>(-1);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const idx = idParam ? Number(idParam) : -1;
      this.index.set(Number.isFinite(idx) ? idx : -1);
      const rows = this.service.getRows();
      const row = idx >= 0 && idx < rows.length ? rows[idx] : null;
      this.record.set(row ? { ...row } : null);
      if (!row) {
        // If index is invalid or dataset is empty, go back to list
        this.router.navigate(['/enrollment', 'list']);
      }
    });
    this.route.data.subscribe((d) => {
      this.editable.set(!!d['edit']);
    });
  }

  myDate = '';
  myDateControl = new FormControl(this.myDate, { updateOn: 'blur' });

  onClose(): void {
    this.router.navigate(['/enrollment', 'list']);
  }

  onSave(updated: AutoDebitDetailRecord): void {
    const i = this.index();
    if (i >= 0) {
      this.service.updateRow(i, updated);
    }
    this.router.navigate(['/enrollment', 'list']);
  }
}


