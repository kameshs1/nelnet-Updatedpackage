import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule, UrlTree } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FeatureTabsComponent } from '../../components/feature-tabs/feature-tabs.component';

@Component({
  selector: 'app-feature-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FeatureTabsComponent],
  templateUrl: './feature-shell.component.html',
  styleUrls: ['./feature-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeatureShellComponent {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private currentTree: UrlTree = this.router.parseUrl(this.router.url || '/');

  showShell = true;

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      this.currentTree = this.router.parseUrl(this.router.url || '/');
      this.evaluateShellVisibility();
      this.cdr.markForCheck();
    });
    this.evaluateShellVisibility();
  }

  private evaluateShellVisibility(): void {
    const segments = this.currentTree.root.children['primary']?.segments?.map(s => s.path) ?? [];
    // When navigating under dashboard, hide header/tabs on the autodebit list and detail pages
    const second = segments[1] ?? '';
    this.showShell = second !== 'autodebit';
  }
}


