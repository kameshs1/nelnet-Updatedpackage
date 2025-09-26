import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule, UrlTree } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-feature-tabs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './feature-tabs.component.html',
  styleUrls: ['./feature-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeatureTabsComponent {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private currentTree: UrlTree = this.router.parseUrl(this.router.url || '/');

  constructor() {
    // Keep the parsed URL in sync so active tab updates reliably on first load and subsequent navigations
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.currentTree = this.router.parseUrl(this.router.url || '/');
        this.cdr.markForCheck();
      });
  }

  isLookupActive(): boolean {
    const tree = this.currentTree;
    const segments = tree.root.children['primary']?.segments?.map((s) => s.path) ?? [];
    // Example paths: [dashboard, search] | [dashboard, autodebit] | [dashboard, job-console]
    const second = segments[1] ?? '';
    return second !== 'job-console';
  }

  isAdeConsoleActive(): boolean {
    const tree = this.currentTree;
    const segments = tree.root.children['primary']?.segments?.map((s) => s.path) ?? [];
    const second = segments[1] ?? '';
    const type = (tree.queryParams?.['type'] as string | undefined)?.toLowerCase();
    if (second !== 'job-console') return false;
    // Default to ADE when no type is specified
    return type === 'ade' || !type || type === '';
  }

  isAchConsoleActive(): boolean {
    const tree = this.currentTree;
    const segments = tree.root.children['primary']?.segments?.map((s) => s.path) ?? [];
    const second = segments[1] ?? '';
    const type = (tree.queryParams?.['type'] as string | undefined)?.toLowerCase();
    return second === 'job-console' && type === 'ach';
  }
}


