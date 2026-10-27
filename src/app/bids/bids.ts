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
import { finalize } from 'rxjs';
import { Bid, BidRequest } from './bid.model';
import { BidService } from './bid.service';
import { DeleteDialog } from '../shared/delete-dialog/delete-dialog';
import { Pagination } from '../shared/pagination/pagination';
import {
  LucideBanknote,
  LucideBoxes,
  LucideCamera,
  LucideFileCheck,
  LucidePlus,
  LucideRotateCw,
  LucideSearch,
  LucideUndo2,
  LucideX,
} from '@lucide/angular';

type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

@Component({
  selector: 'app-bids',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    Pagination,
    DeleteDialog,
    LucideBanknote,
    LucideBoxes,
    LucideCamera,
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

  readonly screenshotMode = signal(false);
  readonly activePreset = signal<DatePreset>('all');
  readonly datePresets = [
    { key: 'all', label: '全部' },
    { key: 'today', label: '今天' },
    { key: 'yesterday', label: '昨天' },
    { key: 'week', label: '本週' },
    { key: 'month', label: '本月' },
  ] as const;
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

  readonly searchError = computed(() => {
    const { awardDateFrom, awardDateTo } = this.filters();
    return awardDateFrom && awardDateTo && awardDateFrom > awardDateTo
      ? '決標日期起日不可晚於迄日'
      : '';
  });
  readonly filteredBids = computed(() => {
    const { keyword, awardDateFrom, awardDateTo } = this.filters();
    const query = keyword.trim().toLowerCase();
    if (this.searchError()) return [];
    return this.bids()
      .filter((item) => {
        const matchesKeyword =
          !query ||
          this.fields.some(({ key }) =>
            String(item[key] ?? '')
              .toLowerCase()
              .includes(query),
          );
        const awardDate = item.awardDate;
        const matchesDate =
          (!awardDateFrom || (!!awardDate && awardDate >= awardDateFrom)) &&
          (!awardDateTo || (!!awardDate && awardDate <= awardDateTo));
        return matchesKeyword && matchesDate;
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  });
  readonly summaryTitle = computed(
    () =>
      ({
        all: '全部決標彙總',
        today: '今日決標彙總',
        yesterday: '昨日決標彙總',
        week: '本週決標彙總',
        month: '本月決標彙總',
        custom: '決標彙總',
      })[this.activePreset()],
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
    const value = this.searchForm.getRawValue();
    const previous = this.filters();
    if (
      value.awardDateFrom !== previous.awardDateFrom ||
      value.awardDateTo !== previous.awardDateTo
    ) {
      this.activePreset.set(value.awardDateFrom || value.awardDateTo ? 'custom' : 'all');
    }
    this.filters.set(value);
    this.page.set(1);
  }

  selectDatePreset(preset: Exclude<DatePreset, 'custom'>) {
    const { from, to } = awardDateRange(preset);
    this.searchForm.patchValue({ awardDateFrom: from, awardDateTo: to });
    this.activePreset.set(preset);
  }

  resetSearch() {
    this.searchForm.reset();
    this.search();
    this.activePreset.set('all');
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

// 以台灣日期計算快捷區間；本週從星期一開始，區間包含完整的一週／月份。
export function awardDateRange(preset: Exclude<DatePreset, 'custom'>, now = new Date()) {
  if (preset === 'all') return { from: '', to: '' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const start = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`);
  const end = new Date(start);
  if (preset === 'yesterday') {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setTime(start.getTime());
  } else if (preset === 'week') {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
  } else if (preset === 'month') {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  }
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
