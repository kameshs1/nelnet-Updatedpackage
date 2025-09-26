import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EnrollmentJobConsoleComponent } from './enrollment/enrollment-job-console.component';
import { AchJobConsoleComponent } from './ach/ach-job-console.component';

@Component({
  selector: 'app-job-console-page',
  standalone: true,
  imports: [CommonModule, EnrollmentJobConsoleComponent, AchJobConsoleComponent],
  template: `
    <app-enrollment-job-console *ngIf="consoleType !== 'ach'"></app-enrollment-job-console>
    <app-ach-job-console *ngIf="consoleType === 'ach'"></app-ach-job-console>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobConsolePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  consoleType: 'ade' | 'ach' = 'ade';

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const type = (params.get('type') || 'ade').toLowerCase();
      this.consoleType = type === 'ach' ? 'ach' : 'ade';
      this.cdr.markForCheck();
    });
  }
}


