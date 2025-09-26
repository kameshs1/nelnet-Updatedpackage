import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginator.component.html',
  styleUrls: ['./paginator.component.scss']
})
export class PaginatorComponent {
  @Input() pageIndex = 0;
  @Input() totalPages = 1;
  /** Maximum number of numbered page buttons to display (not counting prev/next). */
  @Input() maxButtons = 7;
  @Output() pageChange = new EventEmitter<number>();

  /**
   * Condensed page items with ellipses when page count is large.
   * Returns 1-based page numbers or the string '…' as an ellipsis spacer.
   */
  get pages(): Array<number | string> {
    const total = Math.max(1, this.totalPages);
    const current = Math.min(Math.max(0, this.pageIndex), total - 1) + 1; // 1-based
    const max = Math.max(5, this.maxButtons);

    // If few pages, show all
    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const first = 1;
    const last = total;
    const windowSize = Math.max(1, Math.floor((max - 2) / 2)); // around current, excluding first/last
    let start = Math.max(2, current - windowSize);
    let end = Math.min(total - 1, current + windowSize);

    // Expand window to fill max buttons if near edges
    const windowCount = end - start + 1;
    let remaining = (max - 2) - windowCount;
    while (remaining > 0 && start > 2) { start--; remaining--; }
    while (remaining > 0 && end < total - 1) { end++; remaining--; }

    const items: Array<number | string> = [first];
    if (start > 2) items.push('…');
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push('…');
    items.push(last);
    return items;
  }

  goTo(i: number): void { this.pageChange.emit(i); }
  prev(): void { this.goTo(Math.max(0, this.pageIndex - 1)); }
  next(): void { this.goTo(Math.min(this.totalPages - 1, this.pageIndex + 1)); }

  // Template helpers (avoid type assertions in templates)
  isNumber(value: number | string): value is number {
    return typeof value === 'number' && isFinite(value as number);
  }

  toIndex(value: number | string): number {
    return this.isNumber(value) ? (value as number) - 1 : this.pageIndex;
  }
}


