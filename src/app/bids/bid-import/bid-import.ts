import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';
import { LucideSearch } from '@lucide/angular';
import { BidService } from '../bid.service';
import { BidImportDetail, BidNotice } from '../bid.model';

@Component({
  selector: 'app-bid-import',
  imports: [ReactiveFormsModule, LucideSearch],
  templateUrl: './bid-import.html',
  styleUrl: './bid-import.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BidImport {
  private readonly service = inject(BidService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelRequests = new Subject<void>();

  readonly searching = signal(false);
  readonly loadingDetail = signal(false);
  readonly searched = signal(false);
  readonly notices = signal<BidNotice[]>([]);
  readonly selected = signal<BidNotice | null>(null);
  readonly detailLoaded = signal(false);
  readonly error = signal('');
  readonly detailError = signal('');
  readonly queryForm = this.fb.group({
    unitId: ['', [Validators.required, Validators.pattern(/\S/)]],
    jobNumber: ['', [Validators.required, Validators.pattern(/\S/)]],
  });
  readonly fields = [
    { key: 'unitId', label: '招標機關代碼' },
    { key: 'jobNumber', label: '標案案號' },
    { key: 'unitName', label: '招標機關名稱' },
    { key: 'title', label: '標案名稱' },
    { key: 'noticeDate', label: '公告日期' },
    { key: 'noticeType', label: '公告類型' },
    { key: 'category', label: '標的分類' },
    { key: 'tenderMethod', label: '招標方式' },
    { key: 'deadline', label: '截止投標時間' },
    { key: 'openingTime', label: '開標時間' },
    { key: 'openingLocation', label: '開標地點' },
    { key: 'contactName', label: '機關聯絡人' },
    { key: 'contactPhone', label: '機關聯絡電話' },
    { key: 'budgetAmount', label: '預算金額' },
    { key: 'bidBondRequired', label: '是否須繳納押標金' },
    { key: 'performanceLocation', label: '履約地點' },
    { key: 'sourceUrl', label: '政府標案公告網址' },
  ] as const satisfies readonly { key: keyof BidImportDetail; label: string }[];
  // 第三方日期、時間及金額保留原始字串，避免遺失民國日期、時間或金額文字。
  readonly detailForm = this.fb.group({
    unitId: '',
    jobNumber: '',
    unitName: '',
    title: '',
    noticeDate: '',
    noticeType: '',
    category: '',
    tenderMethod: '',
    deadline: '',
    openingTime: '',
    openingLocation: '',
    contactName: '',
    contactPhone: '',
    budgetAmount: '',
    bidBondRequired: '',
    performanceLocation: '',
    sourceUrl: '',
  });

  open() {
    this.cancelRequests.next();
    this.queryForm.reset();
    this.notices.set([]);
    this.searched.set(false);
    this.error.set('');
    this.clearDetail();
    this.dialog().nativeElement.showModal();
  }

  close() {
    this.cancelRequests.next();
    this.dialog().nativeElement.close();
  }

  search() {
    if (this.searching()) return;
    this.queryForm.markAllAsTouched();
    if (this.queryForm.invalid) return;
    this.cancelRequests.next();
    this.clearDetail();
    this.error.set('');
    this.notices.set([]);
    this.searched.set(false);
    const value = this.queryForm.getRawValue();
    this.searching.set(true);
    this.service
      .findNotices({ unitId: value.unitId.trim(), jobNumber: value.jobNumber.trim() })
      .pipe(
        takeUntil(this.cancelRequests),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.searching.set(false)),
      )
      .subscribe({
        next: (notices) => {
          this.notices.set(notices);
          this.searched.set(true);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  selectNotice(notice: BidNotice) {
    // 每次選取都取消前一筆請求，較慢的舊回應不會覆蓋新選取的公告。
    this.cancelRequests.next();
    this.clearDetail();
    this.selected.set(notice);
    this.loadingDetail.set(true);
    this.service
      .findNoticeDetail({
        unitId: notice.unitId,
        jobNumber: notice.jobNumber,
        noticeDate: notice.noticeDate,
        filename: notice.filename,
      })
      .pipe(
        takeUntil(this.cancelRequests),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingDetail.set(false)),
      )
      .subscribe({
        next: (detail) => {
          for (const { key } of this.fields)
            this.detailForm.controls[key].setValue(detail[key] ?? '');
          this.detailForm.markAsPristine();
          this.detailLoaded.set(true);
        },
        error: (error: HttpErrorResponse) => this.detailError.set(this.errorMessage(error)),
      });
  }

  private clearDetail() {
    this.selected.set(null);
    this.detailLoaded.set(false);
    this.detailError.set('');
    this.detailForm.reset();
  }

  private errorMessage(error: HttpErrorResponse) {
    if (typeof error.error === 'string' && error.status >= 400 && error.status < 500)
      return error.error;
    return '無法取得公告資料，請稍後重試或確認後端與第三方服務連線。';
  }
}
