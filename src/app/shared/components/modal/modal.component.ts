import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnChanges {
  @Input() open = false;
  @Input() title = '';
  @Input() ariaLabel?: string;
  @Input() closeable = true;
  @Input() backdrop = true;
  @Input() showFooter = true;
  @Input() mobileSheet = true;
  @Input() maxWidth?: string;
  @Input() maxHeight?: string;
  @Input() height?: string;
  @Output() closed = new EventEmitter<void>();

  // unique id for aria-labelledby when title is present
  readonly titleId = `modal-title-${Math.random().toString(36).slice(2)}`;

  @HostListener('document:keydown.escape') onEscape(): void {
    if (this.open && this.closeable) {
      this.closed.emit();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      try {
        document.body.style.overflow = this.open ? 'hidden' : '';
      } catch { /* ignore for SSR */ }
    }
  }
}


