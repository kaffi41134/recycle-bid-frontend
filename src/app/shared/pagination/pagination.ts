import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-pagination',
  imports: [LucideChevronLeft, LucideChevronRight],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly totalItems = input.required<number>();
  readonly page = model.required<number>();
  readonly pageSize = model.required<number>();
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 20]);

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );
  readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  readonly firstRecord = computed(() =>
    this.totalItems() ? (this.currentPage() - 1) * this.pageSize() + 1 : 0,
  );
  readonly lastRecord = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalItems()),
  );
  readonly pageNumbers = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pageCount() - 4));
    return Array.from({ length: Math.min(5, this.pageCount()) }, (_, index) => start + index);
  });

  changePageSize(event: Event) {
    const pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(pageSize);
    this.page.set(1);
  }

  goToPage(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
  }
}
