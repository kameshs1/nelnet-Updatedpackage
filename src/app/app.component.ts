import { Component, ApplicationRef, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { UAppBarComponent, UIconComponent, UTableModule } from '@nelnet/unifi-components-angular';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { LoaderService } from './shared/components/loader/loader.service';
import { combineLatest, filter, take, timer } from 'rxjs';

@Component({
    selector: 'app-root',
    imports: [
      RouterOutlet,
      UAppBarComponent,
      UIconComponent,
      UTableModule,
      ToastComponent,
      LoaderComponent
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'nelnet-app';

  private readonly appRef = inject(ApplicationRef);
  private readonly loader = inject(LoaderService);
  private readonly router = inject(Router);

  constructor() {
    // Show loader briefly after first app load until app is stable
    const MIN_SPLASH_MS = 1200; // adjust duration as desired
    this.loader.increment();
    combineLatest([
      this.appRef.isStable.pipe(filter((stable) => stable), take(1)),
      timer(MIN_SPLASH_MS)
    ]).subscribe(() => this.loader.decrement());

    // Also show loader on route changes
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationStart) {
        this.loader.increment();
      }
      if (evt instanceof NavigationEnd || evt instanceof NavigationCancel || evt instanceof NavigationError) {
        this.loader.decrement();
      }
    });
  }
}
