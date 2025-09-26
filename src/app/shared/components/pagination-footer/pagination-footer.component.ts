import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginatorComponent } from '../paginator/paginator.component';

@Component({
  selector: 'app-pagination-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginatorComponent],
  templateUrl: './pagination-footer.component.html',
  styleUrls: ['./pagination-footer.component.scss']
})
export class PaginationFooterComponent {
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() totalRecords = 0;
  @Input() pageSizeOptions: number[] = [10, 20, 30, 40, 50];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    const total = Math.ceil(this.totalRecords / Math.max(1, this.pageSize));
    return total > 0 ? total : 1;
  }

  onPageChange(i: number): void {
    this.pageIndex = i;
    this.pageChange.emit(i);
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 0;
    this.pageSizeChange.emit(size);
  }
}


