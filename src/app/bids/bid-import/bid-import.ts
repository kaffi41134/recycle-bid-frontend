import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';
import {
  LucideSearch,
  LucideUndo2,
  LucideX,
  LucideRotateCw,
  LucideFileInput,
  LucideFileCheck,
} from '@lucide/angular';
import { BidService } from '../bid.service';
import { BidNotice } from '../bid.model';
import { GovernmentBidService } from '../government-bids/government-bid.service';
import { governmentBidFields } from '../government-bids/government-bid.model';
import {
  createGovernmentBidForm,
  toGovernmentBidRequest,
} from '../government-bids/government-bid.form';

@Component({
  selector: 'app-bid-import',
  imports: [
    ReactiveFormsModule,
    LucideSearch,
    LucideUndo2,
    LucideX,
    LucideRotateCw,
    LucideFileInput,
    LucideFileCheck,
  ],
  templateUrl: './bid-import.html',
  styleUrl: './bid-import.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BidImport {
  private readonly service = inject(BidService);
  private readonly governmentService = inject(GovernmentBidService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelRequests = new Subject<void>();

  readonly searching = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly saved = output<void>();
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
  readonly fields = governmentBidFields;
  // 第三方日期、時間及金額保留原始字串，避免遺失民國日期、時間或金額文字。
  readonly detailForm = createGovernmentBidForm(this.fb);

  open() {
    if (this.saving()) return;
    this.cancelRequests.next();
    this.queryForm.reset();
    this.notices.set([]);
    this.searched.set(false);
    this.error.set('');
    this.clearDetail();
    this.dialog().nativeElement.showModal();
  }

  close() {
    if (this.saving()) return;
    this.cancelRequests.next();
    this.dialog().nativeElement.close();
  }

  search() {
    if (this.searching() || this.saving()) return;
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
    if (this.saving()) return;
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
    this.saveError.set('');
    this.selected.set(null);
    this.detailLoaded.set(false);
    this.detailError.set('');
    this.detailForm.reset();
  }

  save() {
    if (this.saving() || this.loadingDetail() || !this.detailLoaded()) return;
    this.detailForm.markAllAsTouched();
    if (this.detailForm.invalid) return;
    this.saving.set(true);
    this.saveError.set('');
    this.governmentService
      .create(toGovernmentBidRequest(this.detailForm.getRawValue()))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.dialog().nativeElement.close();
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) =>
          this.saveError.set(
            typeof error.error === 'string' && error.status >= 400 && error.status < 500
              ? error.error
              : '無法儲存政府標案，請確認後端連線後重試。',
          ),
      });
  }

  private errorMessage(error: HttpErrorResponse) {
    if (typeof error.error === 'string' && error.status >= 400 && error.status < 500)
      return error.error;
    return '無法取得公告資料，請稍後重試或確認後端與第三方服務連線。';
  }
}
