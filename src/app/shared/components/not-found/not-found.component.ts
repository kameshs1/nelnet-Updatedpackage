import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UIconModule } from '@nelnet/unifi-components-angular';
import { Location } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, UIconModule],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  goBack(): void {
    try {
      this.location.back();
      // If history back keeps us on the 404 due to direct visit, fallback after a tick
      setTimeout(() => {
        const current = typeof window !== 'undefined' ? window.location.pathname : '';
        if (current && /\/dashboard\/.*\*\*$/.test(current)) {
          this.router.navigate(['/dashboard']);
        }
      });
    } catch {
      this.router.navigate(['/dashboard']);
    }
  }
}
