import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoaderService } from './loader.service';

@Component({
  selector: 'app-loader-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent implements OnInit, OnDestroy {
  isLoading = false;
  private sub?: Subscription;

  private readonly loader = inject(LoaderService);

  ngOnInit(): void {
    this.sub = this.loader.isLoading$.subscribe(count => this.isLoading = count > 0);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}


