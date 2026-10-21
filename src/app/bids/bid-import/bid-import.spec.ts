import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BidImport } from './bid-import';
import { BidImportDetail, BidNotice } from '../bid.model';

const notice: BidNotice = {
  unitId: '3.7',
  jobNumber: 'A001',
  noticeDate: '20261020',
  filename: 'notice-1',
  noticeType: '招標公告',
  title: '回收標案',
};
const detail: BidImportDetail = {
  unitId: '3.7',
  jobNumber: 'A001',
  unitName: '測試機關',
  title: '回收標案',
  noticeDate: '20261020',
  noticeType: '招標公告',
  category: '財物類',
  tenderMethod: '公開招標',
  deadline: '115/10/30 17:00',
  openingTime: '115/11/01 09:00',
  openingLocation: '會議室',
  contactName: '陳小姐',
  contactPhone: '(02)12345678',
  budgetAmount: '1,200,000元',
  bidBondRequired: '是',
  performanceLocation: '臺北市',
  sourceUrl: 'https://example.com/notice',
};

describe('BidImport', () => {
  let fixture: ComponentFixture<BidImport>;
  let component: BidImport;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BidImport],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(BidImport);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => dialog.removeAttribute('open');
    component.open();
  });
  afterEach(() => http.verify());

  function search() {
    component.queryForm.setValue({ unitId: ' 3.7 ', jobNumber: ' A001 ' });
    component.search();
    const request = http.expectOne('/api/bids/import/notices');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ unitId: '3.7', jobNumber: 'A001' });
    request.flush([notice]);
    fixture.detectChanges();
  }

  it('validates required inputs and renders an empty result', () => {
    component.queryForm.setValue({ unitId: ' ', jobNumber: '' });
    component.search();
    http.expectNone('/api/bids/import/notices');
    component.queryForm.setValue({ unitId: '3.7', jobNumber: 'A001' });
    component.search();
    http.expectOne('/api/bids/import/notices').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('查無公告');
  });

  it('clicks a notice and fills all 17 fields without saving a bid', () => {
    search();
    (fixture.nativeElement.querySelector('tbody tr') as HTMLElement).click();
    const request = http.expectOne('/api/bids/import/detail');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      unitId: notice.unitId,
      jobNumber: notice.jobNumber,
      noticeDate: notice.noticeDate,
      filename: notice.filename,
    });
    request.flush(detail);
    fixture.detectChanges();
    expect(component.detailForm.getRawValue()).toEqual(detail);
    expect(fixture.nativeElement.querySelectorAll('[id^="import-detail-"]').length).toBe(17);
    expect(
      (fixture.nativeElement.querySelector('#import-detail-deadline') as HTMLInputElement).value,
    ).toBe(detail.deadline);
    expect(
      (fixture.nativeElement.querySelector('#import-detail-budgetAmount') as HTMLInputElement)
        .value,
    ).toBe(detail.budgetAmount);
    http.expectNone('/api/bids');
  });

  it('cancels an older selection and clears missing fields instead of retaining prior data', () => {
    search();
    component.selectNotice(notice);
    const old = http.expectOne('/api/bids/import/detail');
    component.selectNotice({ ...notice, noticeDate: '20261019', filename: 'notice-2' });
    expect(old.cancelled).toBe(true);
    http
      .expectOne('/api/bids/import/detail')
      .flush({ ...detail, contactName: null, deadline: null });
    expect(component.detailForm.controls.contactName.value).toBe('');
    expect(component.detailForm.controls.deadline.value).toBe('');
    component.selectNotice(notice);
    expect(component.detailLoaded()).toBe(false);
    expect(component.detailForm.controls.title.value).toBe('');
    http.expectOne('/api/bids/import/detail').flush(detail);
    expect(component.detailForm.controls.contactName.value).toBe('陳小姐');
  });

  it('shows backend errors and allows retrying the same notice', () => {
    search();
    component.selectNotice(notice);
    http.expectOne('/api/bids/import/detail').flush('找不到指定公告，請重新查詢公告清單', {
      status: 422,
      statusText: 'Unprocessable Content',
    });
    fixture.detectChanges();
    expect(component.detailError()).toContain('找不到指定公告');
    expect(component.loadingDetail()).toBe(false);
    const retry = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === '重試');
    retry!.click();
    http.expectOne('/api/bids/import/detail').flush(detail);
    expect(component.detailLoaded()).toBe(true);
    expect(component.detailError()).toBe('');
  });

  it('cancels pending requests on close and resets the next session', () => {
    search();
    component.selectNotice(notice);
    const request = http.expectOne('/api/bids/import/detail');
    component.close();
    expect(request.cancelled).toBe(true);
    expect(component.loadingDetail()).toBe(false);
    component.open();
    expect(component.notices()).toEqual([]);
    expect(component.selected()).toBeNull();
    expect(component.queryForm.getRawValue()).toEqual({ unitId: '', jobNumber: '' });
  });

  it('clears the previous detail on a new search and supports query error retry', () => {
    search();
    component.selectNotice(notice);
    http.expectOne('/api/bids/import/detail').flush(detail);
    component.search();
    expect(component.detailLoaded()).toBe(false);
    http.expectOne('/api/bids/import/notices').error(new ProgressEvent('error'));
    expect(component.searching()).toBe(false);
    expect(component.error()).toContain('第三方服務');
    search();
    expect(component.error()).toBe('');
  });

  it('saves confirmed edits to government bids only and emits after an empty success', () => {
    let saved = 0;
    component.saved.subscribe(() => saved++);
    component.save();
    http.expectNone('/api/government-bids');
    search();
    component.selectNotice(notice);
    http.expectOne('/api/bids/import/detail').flush(detail);
    component.detailForm.patchValue({ title: ' 修改後名稱 ', contactName: ' ' });
    component.save();
    component.save();
    const request = http.expectOne('/api/government-bids');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...detail, title: '修改後名稱', contactName: null });
    component.close();
    component.selectNotice(notice);
    expect(fixture.nativeElement.querySelector('dialog').hasAttribute('open')).toBe(true);
    http.expectNone('/api/bids/import/detail');
    request.flush(null);
    expect(saved).toBe(1);
    expect(fixture.nativeElement.querySelector('dialog').hasAttribute('open')).toBe(false);
    http.expectNone('/api/bids');
  });

  it('keeps imported user edits on save failure and validates the required detail fields', () => {
    search();
    component.selectNotice(notice);
    http.expectOne('/api/bids/import/detail').flush(detail);
    component.detailForm.controls.unitId.setValue(' ');
    component.save();
    http.expectNone('/api/government-bids');
    component.detailForm.patchValue({ unitId: '3.7', title: '保留這份輸入' });
    component.save();
    http
      .expectOne('/api/government-bids')
      .flush('新增失敗', { status: 422, statusText: 'Unprocessable Content' });
    expect(component.saveError()).toBe('新增失敗');
    expect(component.detailForm.controls.title.value).toBe('保留這份輸入');
    expect(component.saving()).toBe(false);
    component.save();
    http.expectOne('/api/government-bids').flush(null);
  });
});
