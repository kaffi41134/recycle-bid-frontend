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
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { Bid, BidRequest } from './bid.model';
import { BidService } from './bid.service';
import { DeleteDialog } from '../../shared/delete-dialog/delete-dialog';
import { Pagination } from '../../shared/pagination/pagination';
import {
  LucideBanknote,
  LucideBoxes,
  LucideCamera,
  LucideDownload,
  LucideFileCheck,
  LucidePlus,
  LucideRotateCw,
  LucideSearch,
  LucideUndo2,
  LucideX,
} from '@lucide/angular';

import {
  DateRangeFilter,
  DatePreset,
  DateRangeSelection,
  datePresetRange,
} from '../../shared/date-range-filter/date-range-filter';

@Component({
  selector: 'app-bids',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    Pagination,
    DateRangeFilter,
    DeleteDialog,
    LucideBanknote,
    LucideBoxes,
    LucideCamera,
    LucideDownload,
    LucideFileCheck,
    LucidePlus,
    LucideRotateCw,
    LucideSearch,
    LucideUndo2,
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
  private readonly deleteDialog = viewChild.required(DeleteDialog);
  private listRequest?: Subscription;

  readonly bids = signal<Bid[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly exporting = signal(false);
  readonly exportError = signal('');
  readonly error = signal('');
  readonly formError = signal('');
  readonly deleteError = signal('');
  readonly editing = signal<Bid | null>(null);
  readonly pendingDelete = signal<Bid | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly screenshotMode = signal(false);
  readonly activePreset = signal<DatePreset>('all');
  readonly appliedPreset = signal<DatePreset>('all');
  readonly searchForm = this.fb.group({ keyword: '', awardDateFrom: '', awardDateTo: '' });
  readonly filters = signal(this.searchForm.getRawValue());
  readonly fields = [
    {
      key: 'bidNo',
      label: '標售案號',
      type: 'text',
      group: 'basic',
      placeholder: '請輸入標售案號',
    },
    { key: 'materialCode', label: '材料編號', type: 'text', group: 'material', placeholder: '' },
    { key: 'itemDescription', label: '品名規格', type: 'text', group: 'material', placeholder: '' },
    { key: 'quantity', label: '數量', type: 'number', group: 'material', placeholder: '0' },
    { key: 'unit', label: '單位', type: 'text', group: 'material', placeholder: '例：公斤、個' },
    { key: 'awardAmount', label: '決標金額', type: 'number', group: 'award', placeholder: '0.00' },
    { key: 'pickupLocation', label: '提貨地點', type: 'text', group: 'material', placeholder: '' },
    { key: 'awardDate', label: '決標日', type: 'date', group: 'award', placeholder: '' },
  ] as const;
  readonly bidForm = this.fb.group(
    {
      bidNo: ['', [Validators.required, Validators.pattern(/\S/)]],
      contactName: '',
      contactPhone: '',
      materialCode: '',
      itemDescription: '',
      quantity: this.fb.control<number | null>(null, [
        Validators.min(0),
        quantityPrecisionValidator,
      ]),
      unit: '',
      awardAmount: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ]),
      awardDate: '',
      pickupLocation: '',
      quotationNoticeDate: '',
      quotationDeadlineDate: '',
      environmentalCode: '',
      referenceStorageLocation: '',
    },
    { validators: dateRangeValidator },
  );

  readonly searchError = signal('');
  // 篩選與排序由後端處理，保留名稱供表格、統計與分頁使用。
  readonly filteredBids = computed(() => this.bids());
  readonly summaryTitle = computed(
    () =>
      ({
        all: '全部決標彙總',
        today: '今日決標彙總',
        yesterday: '昨日決標彙總',
        week: '本週決標彙總',
        month: '本月決標彙總',
        custom: '決標彙總',
      })[this.appliedPreset()],
  );
  readonly summaryPeriod = computed(() => {
    const { awardDateFrom, awardDateTo } = this.filters();
    if (!awardDateFrom && !awardDateTo) return '全部日期';
    const from = awardDateFrom.replaceAll('-', '/');
    const to = awardDateTo.replaceAll('-', '/');
    if (awardDateFrom && awardDateFrom === awardDateTo) {
      const weekday = new Intl.DateTimeFormat('zh-TW', {
        weekday: 'short',
        timeZone: 'UTC',
      }).format(new Date(`${awardDateFrom}T12:00:00Z`));
      return `${from}（${weekday}）`;
    }
    return `${from || '不限起日'} 至 ${to || '不限迄日'}`;
  });
  readonly totalAmount = computed(
    () =>
      this.filteredBids().reduce((sum, bid) => sum + Math.round((bid.awardAmount ?? 0) * 100), 0) /
      100,
  );
  readonly quantityTotals = computed(() => {
    const totals = new Map<string, number>();
    for (const bid of this.filteredBids()) {
      if (bid.quantity === null) continue;
      const unit = bid.unit?.trim().toUpperCase() || '未填單位';
      totals.set(unit, (totals.get(unit) ?? 0) + bid.quantity);
    }
    return Array.from(totals, ([unit, quantity]) => ({ unit, quantity }));
  });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredBids().length / this.pageSize())),
  );
  readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  readonly visibleBids = computed(() => {
    if (this.screenshotMode()) return this.filteredBids();
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBids().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchForm.controls.keyword.setValue(params.get('keyword') ?? '', { emitEvent: false });
      this.search();
    });
  }

  loadBids() {
    this.listRequest?.unsubscribe();
    const { keyword, awardDateFrom, awardDateTo } = this.filters();
    this.bids.set([]);
    this.loading.set(true);
    this.error.set('');
    this.listRequest = this.service
      .findAll(keyword, awardDateFrom, awardDateTo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.bids.set(items),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  exportExcel() {
    if (this.exporting() || this.loading() || this.error()) return;

    const { keyword, awardDateFrom, awardDateTo } = this.filters();
    this.exporting.set(true);
    this.exportError.set('');

    this.service
      .exportExcel(keyword, awardDateFrom, awardDateTo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.exporting.set(false)),
      )
      .subscribe({
        next: (file) => {
          try {
            this.downloadExcel(file);
          } catch {
            this.exportError.set('無法開始下載 Excel，請稍後再試。');
          }
        },
        error: () => this.exportError.set('匯出 Excel 失敗，請稍後再試。'),
      });
  }

  search(includeKeyword = true) {
    const value = this.searchForm.getRawValue();
    // 日期變更只套用日期，關鍵字需按搜尋才正式套用。
    if (!includeKeyword) value.keyword = this.filters().keyword;
    if (
      value.awardDateFrom &&
      value.awardDateTo &&
      value.awardDateFrom > value.awardDateTo
    ) {
      this.searchError.set('決標日期起日不可晚於迄日');
      return;
    }
    this.searchError.set('');

    let preset = this.activePreset();
    if (preset !== 'custom') {
      const range = datePresetRange(preset);
      if (value.awardDateFrom !== range.from || value.awardDateTo !== range.to) {
        preset = 'custom';
      }
    }
    if (!value.awardDateFrom && !value.awardDateTo) preset = 'all';

    this.filters.set(value);
    this.activePreset.set(preset);
    this.appliedPreset.set(preset);
    this.page.set(1);
    this.loadBids();
  }

  onDateRangeChange({ from, to, preset }: DateRangeSelection) {
    this.searchForm.patchValue(
      { awardDateFrom: from, awardDateTo: to },
      { emitEvent: false },
    );
    this.activePreset.set(preset);
    this.searchError.set('');
    this.search(false);
  }

  resetSearch() {
    this.searchForm.reset({}, { emitEvent: false });
    this.activePreset.set('all');
    this.searchError.set('');
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
      awardAmount: item.awardAmount ?? null,
      awardDate: item.awardDate ?? '',
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
      awardDate: value.awardDate.trim() || null,
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
        next: () => {
          this.editor().nativeElement.close();
          if (editing) {
            this.loadBids();
          } else {
            this.resetSearch();
            this.search();
          }
        },
        error: (error: HttpErrorResponse) => this.formError.set(this.errorMessage(error)),
      });
  }

  askDelete(item: Bid) {
    this.pendingDelete.set(item);
    this.deleteError.set('');
    this.deleteDialog().open();
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
          this.deleteDialog().close();
          this.loadBids();
        },
        error: (error: HttpErrorResponse) => this.deleteError.set(this.errorMessage(error)),
      });
  }

  private downloadExcel(file: Blob) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');

    try {
      link.href = url;
      link.download = '台塑案件.xlsx';
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      // 讓瀏覽器先處理下載，再釋放暫時網址。
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
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

// number input 會把小數轉成 number；同時處理 0.000001 轉為科學記號的情形。
export function quantityPrecisionValidator(control: AbstractControl) {
  const value = control.value;
  if (value === null || value === '') return null;
  const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e');
  const decimalPlaces = (coefficient.split('.')[1]?.length ?? 0) - Number(exponent);
  return !Number.isFinite(value) || Math.abs(value) >= 1e13 || decimalPlaces > 6
    ? { quantityPrecision: true }
    : null;
}
