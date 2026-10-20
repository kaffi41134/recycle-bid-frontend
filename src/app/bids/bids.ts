import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Bid, BidRequest } from './bid.model';
import { BidService } from './bid.service';
import { BidImport } from './bid-import/bid-import';
import { Pagination } from '../shared/pagination/pagination';
import {
  LucideFileCheck,
  LucidePencil,
  LucidePlus,
  LucideRotateCw,
  LucideSearch,
  LucideTrash,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-bids',
  imports: [
    BidImport,
    ReactiveFormsModule,
    DatePipe,
    Pagination,
    LucideFileCheck,
    LucidePencil,
    LucidePlus,
    LucideRotateCw,
    LucideSearch,
    LucideTrash,
    LucideX,
  ],
  templateUrl: './bids.html',
  styleUrl: './bids.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bids implements OnInit {
  private readonly service = inject(BidService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly editor = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');

  readonly bids = signal<Bid[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly deleteError = signal('');
  readonly editing = signal<Bid | null>(null);
  readonly pendingDelete = signal<Bid | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly searchForm = this.fb.group({ keyword: '' });
  readonly filters = signal(this.searchForm.getRawValue());
  readonly fields = [
    {
      key: 'bidNo',
      label: '標售案號',
      type: 'text',
      group: 'basic',
      placeholder: '請輸入標售案號',
    },
    { key: 'contactName', label: '聯絡人', type: 'text', group: 'basic', placeholder: '姓名' },
    {
      key: 'contactPhone',
      label: '電話',
      type: 'tel',
      group: 'basic',
      placeholder: '例：02-1234-5678',
    },
    { key: 'materialCode', label: '材料編號', type: 'text', group: 'material', placeholder: '' },
    { key: 'itemDescription', label: '品名規格', type: 'text', group: 'material', placeholder: '' },
    { key: 'quantity', label: '數量', type: 'number', group: 'material', placeholder: '0' },
    { key: 'unit', label: '單位', type: 'text', group: 'material', placeholder: '例：公斤、個' },
    { key: 'pickupLocation', label: '提貨地點', type: 'text', group: 'material', placeholder: '' },
    {
      key: 'quotationNoticeDate',
      label: '報價通知日',
      type: 'date',
      group: 'quotation',
      placeholder: '',
    },
    {
      key: 'quotationDeadlineDate',
      label: '報價截止日',
      type: 'date',
      group: 'quotation',
      placeholder: '',
    },
    {
      key: 'environmentalCode',
      label: '環保法定代碼',
      type: 'text',
      group: 'other',
      placeholder: '',
    },
    {
      key: 'referenceStorageLocation',
      label: '參考料位',
      type: 'text',
      group: 'other',
      placeholder: '',
    },
  ] as const;
  readonly bidForm = this.fb.group(
    {
      bidNo: ['', [Validators.required, Validators.pattern(/\S/)]],
      contactName: '',
      contactPhone: '',
      materialCode: '',
      itemDescription: '',
      quantity: this.fb.control<number | null>(null),
      unit: '',
      pickupLocation: '',
      quotationNoticeDate: '',
      quotationDeadlineDate: '',
      environmentalCode: '',
      referenceStorageLocation: '',
    },
    { validators: dateRangeValidator },
  );

  readonly filteredBids = computed(() => {
    const query = this.filters().keyword.trim().toLowerCase();
    return this.bids().filter(
      (item) =>
        !query ||
        this.fields.some(({ key }) =>
          String(item[key] ?? '')
            .toLowerCase()
            .includes(query),
        ),
    );
  });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredBids().length / this.pageSize())),
  );
  readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  readonly visibleBids = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBids().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.searchForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchForm.controls.keyword.setValue(params.get('keyword') ?? '');
      this.search();
    });
    this.loadBids();
  }

  loadBids() {
    this.loading.set(true);
    this.error.set('');
    this.service
      .findAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.bids.set(items),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  search() {
    this.filters.set(this.searchForm.getRawValue());
    this.page.set(1);
  }

  resetSearch() {
    this.searchForm.reset();
    this.search();
  }

  openCreate() {
    this.editing.set(null);
    this.formError.set('');
    this.bidForm.reset();
    this.editor().nativeElement.showModal();
  }

  openEdit(item: Bid) {
    this.editing.set(item);
    this.formError.set('');
    this.bidForm.reset({
      ...item,
      bidNo: item.bidNo ?? '',
      contactName: item.contactName ?? '',
      contactPhone: item.contactPhone ?? '',
      materialCode: item.materialCode ?? '',
      itemDescription: item.itemDescription ?? '',
      unit: item.unit ?? '',
      pickupLocation: item.pickupLocation ?? '',
      quotationNoticeDate: item.quotationNoticeDate ?? '',
      quotationDeadlineDate: item.quotationDeadlineDate ?? '',
      environmentalCode: item.environmentalCode ?? '',
      referenceStorageLocation: item.referenceStorageLocation ?? '',
    });
    this.editor().nativeElement.showModal();
  }

  closeEditor() {
    if (!this.saving()) this.editor().nativeElement.close();
  }

  save() {
    if (this.saving()) return;
    this.bidForm.markAllAsTouched();
    if (this.bidForm.invalid) return;
    const value = this.bidForm.getRawValue();
    const request: BidRequest = {
      ...value,
      bidNo: value.bidNo.trim(),
      contactName: value.contactName.trim() || null,
      contactPhone: value.contactPhone.trim() || null,
      materialCode: value.materialCode.trim() || null,
      itemDescription: value.itemDescription.trim() || null,
      unit: value.unit.trim() || null,
      pickupLocation: value.pickupLocation.trim() || null,
      quotationNoticeDate: value.quotationNoticeDate.trim() || null,
      quotationDeadlineDate: value.quotationDeadlineDate.trim() || null,
      environmentalCode: value.environmentalCode.trim() || null,
      referenceStorageLocation: value.referenceStorageLocation.trim() || null,
    };
    const editing = this.editing();
    const operation = editing
      ? this.service.update(editing.id, request)
      : this.service.create(request);
    this.saving.set(true);
    this.formError.set('');
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (saved) => {
          this.bids.update((items) =>
            editing
              ? items.map((item) => (item.id === saved.id ? saved : item))
              : [saved, ...items],
          );
          if (!editing) this.resetSearch();
          this.editor().nativeElement.close();
        },
        error: (error: HttpErrorResponse) => this.formError.set(this.errorMessage(error)),
      });
  }

  askDelete(item: Bid) {
    this.pendingDelete.set(item);
    this.deleteError.set('');
    this.deleteDialog().nativeElement.showModal();
  }

  closeDelete() {
    if (!this.deleting()) this.deleteDialog().nativeElement.close();
  }

  confirmDelete() {
    const item = this.pendingDelete();
    if (!item || this.deleting()) return;
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
          this.bids.update((items) => items.filter((entry) => entry.id !== item.id));
          this.page.set(this.currentPage());
          this.deleteDialog().nativeElement.close();
        },
        error: (error: HttpErrorResponse) => this.deleteError.set(this.errorMessage(error)),
      });
  }

  private errorMessage(error: HttpErrorResponse): string {
    // 後端目前以純文字回傳驗證與商業邏輯錯誤。
    if (typeof error.error === 'string' && error.status >= 400 && error.status < 500)
      return error.error;
    return '無法連線或處理資料，請確認後端服務已啟動後再試一次。';
  }
}

// 日期採 yyyy-MM-dd，比較字串即可判斷先後；任一未填時允許送出。
export function dateRangeValidator(control: AbstractControl) {
  const notice = control.get('quotationNoticeDate')?.value;
  const deadline = control.get('quotationDeadlineDate')?.value;
  return notice && deadline && deadline < notice ? { dateRange: true } : null;
}
