import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subject, takeUntil } from 'rxjs';
import {
  LucideUndo2,
  LucideX,
  LucideFileCheck,
  LucideFileText,
  LucidePencil,
  LucideTrash,
  LucideSearch,
  LucidePlus,
  LucideRotateCw,
} from '@lucide/angular';
import { GovernmentBid, governmentBidFields } from './government-bid.model';
import { GovernmentBidService } from './government-bid.service';
import { createGovernmentBidForm, toGovernmentBidRequest } from './government-bid.form';
import { BidImport } from '../bid-import/bid-import';
import { DeleteDialog } from '../../shared/delete-dialog/delete-dialog';
import { Pagination } from '../../shared/pagination/pagination';

@Component({
  selector: 'app-government-bids',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    BidImport,
    Pagination,
    DeleteDialog,
    LucideUndo2,
    LucideX,
    LucideFileCheck,
    LucideFileText,
    LucidePencil,
    LucideTrash,
    LucideSearch,
    LucidePlus,
    LucideRotateCw,
  ],
  templateUrl: './government-bids.html',
  styleUrl: '../bids.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GovernmentBids implements OnInit {
  private readonly service = inject(GovernmentBidService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly editor = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  private readonly deleteDialog = viewChild.required(DeleteDialog);
  private readonly cancelDetail = new Subject<void>();
  private readonly cancelLoad = new Subject<void>();
  private createdDateFrom = '';
  private createdDateTo = '';

  readonly fields = governmentBidFields;
  readonly columns = governmentBidFields.filter(({ key }) =>
    [
      'jobNumber',
      'unitName',
      'title',
      'noticeDate',
      'deadline',
      'contactName',
      'budgetAmount',
    ].includes(key),
  );
  readonly bids = signal<GovernmentBid[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly loadingDetail = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly deleteError = signal('');
  readonly notice = signal('');
  readonly mode = signal<'create' | 'edit' | 'detail'>('create');
  readonly selected = signal<GovernmentBid | null>(null);
  readonly recordId = signal<number | null>(null);
  readonly pendingDelete = signal<GovernmentBid | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly searchForm = this.fb.group({ keyword: '', createdDateFrom: '', createdDateTo: '' });
  readonly searchError = signal('');
  readonly keyword = signal('');
  readonly bidForm = createGovernmentBidForm(this.fb);
  readonly filteredBids = computed(() => {
    const query = this.keyword().trim().toLowerCase();
    return this.bids().filter(
      (item) =>
        !query || this.fields.some(({ key }) => (item[key] ?? '').toLowerCase().includes(query)),
    );
  });
  readonly visibleBids = computed(() => {
    const max = Math.max(1, Math.ceil(this.filteredBids().length / this.pageSize()));
    const start = (Math.min(this.page(), max) - 1) * this.pageSize();
    return this.filteredBids().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.searchForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
    this.loadBids();
  }

  loadBids() {
    this.cancelLoad.next();
    this.loading.set(true);
    this.error.set('');
    this.service
      .findAll(this.createdDateFrom, this.createdDateTo)
      .pipe(
        takeUntil(this.cancelLoad),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.bids.set(items),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  search(reload = true) {
    this.keyword.set(this.searchForm.controls.keyword.value);
    this.page.set(1);
    const { createdDateFrom, createdDateTo } = this.searchForm.getRawValue();
    if (createdDateFrom && createdDateTo && createdDateFrom > createdDateTo) {
      this.searchError.set('建立日期起日不可晚於迄日');
      return;
    }
    this.searchError.set('');
    if (createdDateFrom === this.createdDateFrom && createdDateTo === this.createdDateTo) return;
    this.createdDateFrom = createdDateFrom;
    this.createdDateTo = createdDateTo;
    if (reload) this.loadBids();
  }

  resetSearch(reload = true) {
    this.searchForm.reset(undefined, { emitEvent: false });
    this.search(reload);
  }

  openCreate() {
    this.cancelDetail.next();
    this.mode.set('create');
    this.recordId.set(null);
    this.selected.set(null);
    this.formError.set('');
    this.bidForm.reset();
    this.editor().nativeElement.showModal();
  }

  openRecord(item: GovernmentBid, mode: 'detail' | 'edit') {
    this.cancelDetail.next();
    this.mode.set(mode);
    this.recordId.set(item.id);
    this.selected.set(null);
    this.bidForm.reset();
    this.formError.set('');
    this.editor().nativeElement.showModal();
    this.fetchRecord(item.id);
  }

  fetchRecord(id: number) {
    this.cancelDetail.next();
    this.formError.set('');
    this.loadingDetail.set(true);
    this.service
      .findById(id)
      .pipe(
        takeUntil(this.cancelDetail),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingDetail.set(false)),
      )
      .subscribe({
        next: (item) => {
          for (const { key } of this.fields) this.bidForm.controls[key].setValue(item[key] ?? '');
          this.bidForm.markAsPristine();
          this.bidForm.markAsUntouched();
          this.selected.set(item);
        },
        error: (error: HttpErrorResponse) => this.formError.set(this.errorMessage(error)),
      });
  }

  closeEditor() {
    if (this.saving()) return;
    this.cancelDetail.next();
    this.editor().nativeElement.close();
  }

  save() {
    if (this.saving() || this.loadingDetail() || this.loading() || this.mode() === 'detail') return;
    if (this.mode() === 'edit' && !this.selected()) return;
    this.bidForm.markAllAsTouched();
    if (this.bidForm.invalid) return;
    const request = toGovernmentBidRequest(this.bidForm.getRawValue());
    const item = this.selected();
    const operation =
      this.mode() === 'edit' && item
        ? this.service.update(item.id, request)
        : this.service.create(request);
    this.saving.set(true);
    this.formError.set('');
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.editor().nativeElement.close();
          if (this.mode() === 'create') this.resetSearch(false);
          this.notice.set(this.mode() === 'create' ? '政府標案已新增。' : '政府標案已更新。');
          this.loadBids();
        },
        error: (error: HttpErrorResponse) => this.formError.set(this.errorMessage(error)),
      });
  }

  onImported() {
    this.resetSearch(false);
    this.notice.set('公告已儲存為政府標案。');
    this.loadBids();
  }

  askDelete(item: GovernmentBid) {
    this.pendingDelete.set(item);
    this.deleteError.set('');
    this.deleteDialog().open();
  }

  confirmDelete() {
    const item = this.pendingDelete();
    if (!item || this.deleting() || this.loading()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.service
      .delete(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          this.bids.update((items) => items.filter((row) => row.id !== item.id));
          this.page.set(
            Math.min(
              this.page(),
              Math.max(1, Math.ceil(this.filteredBids().length / this.pageSize())),
            ),
          );
          this.notice.set('政府標案已刪除。');
          this.deleteDialog().close();
        },
        error: (error: HttpErrorResponse) => this.deleteError.set(this.errorMessage(error)),
      });
  }

  private errorMessage(error: HttpErrorResponse) {
    if (typeof error.error === 'string' && error.status >= 400 && error.status < 500)
      return error.error;
    return '無法取得或儲存政府標案，請確認後端連線後再試一次。';
  }
}
