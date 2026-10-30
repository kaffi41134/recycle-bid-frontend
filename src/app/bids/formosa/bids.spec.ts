import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Bids } from './bids';
import { datePresetRange } from '../../shared/date-range-filter/date-range-filter';
import { Bid } from './bid.model';

const item: Bid = {
  id: 1,
  bidNo: 'BID1151018-0001',
  contactName: '陳小姐',
  contactPhone: '02-12345678',
  materialCode: 'MET001',
  itemDescription: '廢銅',
  quantity: 12.5,
  unit: 'KG',
  awardAmount: 12345.67,
  awardDate: null,
  pickupLocation: '台北倉庫',
  quotationNoticeDate: '2026-10-18',
  quotationDeadlineDate: '2026-10-20',
  environmentalCode: null,
  referenceStorageLocation: null,
  createdAt: '2026-10-18T10:00:00',
};

describe('Bids', () => {
  let fixture: ComponentFixture<Bids>;
  let component: Bids;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bids],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Bids);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/bids').flush([item]);
    fixture.detectChanges();
    for (const dialog of fixture.nativeElement.querySelectorAll(
      'dialog',
    ) as NodeListOf<HTMLDialogElement>) {
      dialog.showModal = () => dialog.setAttribute('open', '');
      dialog.close = () => dialog.removeAttribute('open');
    }
  });

  afterEach(() => http.verify());

  it('renders all business columns, decimal quantity and null placeholders', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.data-table')[0].querySelectorAll('th').length).toBe(9);
    expect(element.querySelector('tbody')?.textContent).toContain('12.5');
    expect(element.querySelector('tbody')?.textContent).toContain('—');
    expect(element.querySelectorAll('.button-action').length).toBe(2);
  });

  it('exports applied filters across all pages and releases the download URL', () => {
    const createUrl = vi.fn(() => 'blob:bid-export');
    const revokeUrl = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = createUrl;
      static override revokeObjectURL = revokeUrl;
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('台塑案件.xlsx');
      expect(this.href).toBe('blob:bid-export');
      expect(this.isConnected).toBe(true);
    });
    vi.useFakeTimers();
    try {
      component.searchForm.patchValue({
        keyword: '廢鐵', awardDateFrom: '2026-10-01', awardDateTo: '2026-10-31',
      });
      component.search();
      http.expectOne((request) => request.url === '/api/bids').flush([item]);
      component.page.set(2);
      component.searchForm.controls.keyword.setValue('尚未搜尋');

      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.includes('匯出 Excel'))!;
      button.click();
      component.exportExcel();
      const request = http.expectOne((request) => request.url === '/api/bids/export');
      expect(request.request.params.get('keyword')).toBe('廢鐵');
      expect(request.request.params.get('awardDateFrom')).toBe('2026-10-01');
      expect(request.request.params.get('awardDateTo')).toBe('2026-10-31');
      expect(request.request.params.has('page')).toBe(false);
      expect(request.request.responseType).toBe('blob');
      expect(component.exporting()).toBe(true);
      fixture.detectChanges();
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('匯出中');

      const file = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      request.flush(file);
      expect(createUrl).toHaveBeenCalledWith(file);
      expect(click).toHaveBeenCalledOnce();
      expect(document.querySelector('a[download="台塑案件.xlsx"]')).toBeNull();
      expect(component.exporting()).toBe(false);
      expect(component.bids()).toEqual([item]);
      vi.advanceTimersByTime(1000);
      expect(revokeUrl).toHaveBeenCalledWith('blob:bid-export');
    } finally {
      vi.useRealTimers();
      click.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('keeps the list on export failure and allows retry', () => {
    component.exportExcel();
    http.expectOne('/api/bids/export').flush(new Blob(['匯出失敗']), {
      status: 500, statusText: 'Internal Server Error',
    });
    fixture.detectChanges();
    expect(component.exporting()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('匯出 Excel 失敗');
    expect(component.error()).toBe('');
    expect(component.bids()).toEqual([item]);
    component.exportExcel();
    expect(component.exportError()).toBe('');
    http.expectOne('/api/bids/export').error(new ProgressEvent('error'));
  });

  it('blocks export during list loading or a list error', () => {
    component.loading.set(true);
    component.exportExcel();
    component.loading.set(false);
    component.error.set('查詢失敗');
    component.exportExcel();
    http.expectNone('/api/bids/export');
  });

  it('rejects excess quantity precision with a message and no request', () => {
    component.openCreate();
    component.bidForm.patchValue({ bidNo: 'PRECISION-1', quantity: 1.1234567 });
    component.save();
    fixture.detectChanges();
    expect(component.bidForm.controls.quantity.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('數量最多 13 位整數及 6 位小數');
    http.expectNone((request) => request.method === 'POST');
    const quantityInput = fixture.nativeElement.querySelector('#bid-quantity') as HTMLInputElement;
    quantityInput.value = '-0.000001';
    quantityInput.dispatchEvent(new Event('input'));
    quantityInput.dispatchEvent(new Event('blur'));
    component.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('數量不得小於零');
    http.expectNone((request) => request.method === 'POST');
    for (const quantity of [null, 0, 1.123456, 0.000001]) {
      component.bidForm.controls.quantity.setValue(quantity);
      expect(component.bidForm.controls.quantity.valid).toBe(true);
    }
    for (const quantity of [-1.123456, 0.0000001, 10000000000000]) {
      component.bidForm.controls.quantity.setValue(quantity);
      expect(component.bidForm.controls.quantity.invalid).toBe(true);
    }
  });

  it('sends filters only on submit and preserves applied results for invalid dates', () => {
    component.searchForm.patchValue({
      keyword: '廢鐵', awardDateFrom: '2026-10-25', awardDateTo: '2026-10-25',
    });
    http.expectNone((request) => request.url === '/api/bids');
    expect(component.filteredBids()).toEqual([item]);
    expect(component.summaryPeriod()).toBe('全部日期');
    component.page.set(3);
    component.search();
    const request = http.expectOne((request) => request.url === '/api/bids');
    expect(request.request.params.get('keyword')).toBe('廢鐵');
    expect(request.request.params.get('awardDateFrom')).toBe('2026-10-25');
    expect(request.request.params.get('awardDateTo')).toBe('2026-10-25');
    const dated = { ...item, awardDate: '2026-10-25' };
    request.flush([dated]);
    expect(component.page()).toBe(1);
    expect(component.filteredBids()).toEqual([dated]);
    component.searchForm.patchValue({ awardDateFrom: '2026-10-26', awardDateTo: '2026-10-25' });
    component.search();
    expect(component.searchError()).toContain('決標日期起日不可晚於迄日');
    http.expectNone((request) => request.url === '/api/bids');
    expect(component.filteredBids()).toEqual([dated]);
    component.resetSearch();
    http.expectNone((request) => request.url === '/api/bids');
    expect(component.filteredBids()).toEqual([dated]);
    expect(component.searchError()).toBe('');
    component.search();
    http.expectOne('/api/bids').flush([item, dated]);
    expect(component.filteredBids()).toEqual([item, dated]);
  });

  it('calculates Taiwan date presets across week, month and year boundaries', () => {
    const now = new Date('2026-10-24T16:30:00Z');
    expect(datePresetRange('today', now)).toEqual({ from: '2026-10-25', to: '2026-10-25' });
    expect(datePresetRange('yesterday', now)).toEqual({ from: '2026-10-24', to: '2026-10-24' });
    expect(datePresetRange('week', now)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(datePresetRange('month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(datePresetRange('yesterday', new Date('2027-01-01T00:00:00Z'))).toEqual({
      from: '2026-12-31',
      to: '2026-12-31',
    });
    expect(datePresetRange('month', new Date('2028-02-20T00:00:00Z'))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
    expect(component.activePreset()).toBe('all');
    (Array.from(fixture.nativeElement.querySelectorAll('.date-presets button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.trim() === '今天')!.click();
    expect(component.activePreset()).toBe('today');
    http.expectOne((request) => request.url === '/api/bids').flush([item]);
    expect(component.summaryTitle()).toBe('今日決標彙總');
    component.resetSearch();
    expect(component.summaryTitle()).toBe('今日決標彙總');
    expect(component.activePreset()).toBe('all');
    expect(component.searchForm.controls.awardDateFrom.value).toBe('');
  });

  it('searches dates immediately without submitting an unfinished keyword', () => {
    component.searchForm.controls.keyword.setValue('廢鐵');
    const form = fixture.nativeElement.querySelector('form.bid-filters') as HTMLFormElement;
    expect(form.querySelector('.filter-search-row button[type="submit"]')).not.toBeNull();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne((request) => request.params.get('keyword') === '廢鐵').flush([item]);

    component.searchForm.controls.keyword.setValue('尚未搜尋');
    http.expectNone((request) => request.url === '/api/bids');
    (Array.from(fixture.nativeElement.querySelectorAll('.date-presets button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.trim() === '今天')!.click();
    const preset = http.expectOne((request) => request.url === '/api/bids');
    expect(preset.request.params.get('keyword')).toBe('廢鐵');
    expect(preset.request.params.get('awardDateFrom')).toBe(datePresetRange('today').from);
    preset.flush([item]);
    fixture.detectChanges();
    const to = form.querySelectorAll('.date-range input')[1] as HTMLInputElement;
    expect(to.min).toBe(datePresetRange('today').from);

    const from = form.querySelector('.date-range input') as HTMLInputElement;
    from.value = '2026-01-01';
    from.dispatchEvent(new Event('input', { bubbles: true }));
    from.dispatchEvent(new Event('change', { bubbles: true }));
    const date = http.expectOne((request) => request.url === '/api/bids');
    expect(date.request.params.get('awardDateFrom')).toBe('2026-01-01');
    expect(date.request.params.get('keyword')).toBe('廢鐵');
    date.flush([item]);
    expect(component.searchForm.controls.keyword.value).toBe('尚未搜尋');
    expect(component.summaryTitle()).toBe('決標彙總');
    fixture.detectChanges();
    expect(to.min).toBe('2026-01-01');
    expect(from.max).toBe(component.searchForm.controls.awardDateTo.value);
    expect(form.querySelector('.preset-active')).toBeNull();

    (form.querySelector('.date-filter-actions button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(from.value).toBe('');
    expect(to.value).toBe('');
    expect(from.max).toBe('');
    expect(to.min).toBe('');
    expect(form.querySelector('.preset-active')?.textContent?.trim()).toBe('全部');
    expect(component.searchForm.controls.keyword.value).toBe('');
    expect(component.summaryTitle()).toBe('決標彙總');
    http.expectNone((request) => request.url === '/api/bids');
  });

  it('summarizes every filtered record and keeps quantities separated by unit', () => {
    component.bids.set([
      { ...item, id: 1, quantity: 0.1, awardAmount: 0.1 },
      { ...item, id: 2, quantity: 0.2, awardAmount: 0.2 },
      { ...item, id: 3, quantity: 2, unit: 'PC', awardAmount: null },
    ]);
    component.pageSize.set(1);
    expect(component.visibleBids()).toHaveLength(1);
    expect(component.totalAmount()).toBe(0.3);
    expect(component.quantityTotals().find((t) => t.unit === 'KG')?.quantity).toBeCloseTo(0.3);
    expect(component.quantityTotals().find((t) => t.unit === 'PC')?.quantity).toBe(2);
    component.screenshotMode.set(true);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(component.visibleBids()).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.table-actions')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-pagination')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.bid-table th')).toHaveLength(8);
    component.screenshotMode.set(false);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(component.visibleBids()).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.bid-table th')).toHaveLength(9);
    component.searchForm.controls.keyword.setValue('沒有符合');
    expect(component.totalAmount()).toBe(0.3);
    component.search();
    http.expectOne((request) => request.url === '/api/bids').flush([]);
    expect(component.quantityTotals()).toEqual([]);
    expect(component.totalAmount()).toBe(0);
  });

  it('cancels older requests and retries with applied rather than draft filters', () => {
    component.searchForm.controls.keyword.setValue('台北');
    component.search();
    const old = http.expectOne((request) => request.url === '/api/bids');
    component.searchForm.controls.keyword.setValue('不存在');
    component.search();
    expect(old.cancelled).toBe(true);
    expect(component.loading()).toBe(true);
    http.expectOne((request) => request.params.get('keyword') === '不存在').flush([]);
    component.searchForm.controls.keyword.setValue('尚未送出');
    component.loadBids();
    http.expectOne((request) => request.params.get('keyword') === '不存在').flush([item]);
    expect(component.filteredBids()).toEqual([item]);
    expect(component.loading()).toBe(false);
  });

  it('blocks a blank number and an invalid date range without a request', () => {
    component.openCreate();
    component.bidForm.controls.bidNo.setValue('  ');
    component.save();
    http.expectNone((request) => request.method === 'POST');
    component.bidForm.patchValue({
      bidNo: 'A001',
      quotationNoticeDate: '2026-10-20',
      quotationDeadlineDate: '2026-10-18',
    });
    component.save();
    expect(component.bidForm.hasError('dateRange')).toBe(true);
    http.expectNone((request) => request.method === 'POST');
    component.bidForm.controls.quotationDeadlineDate.setValue('2026-10-20');
    expect(component.bidForm.valid).toBe(true);
    component.bidForm.controls.quotationNoticeDate.setValue('');
    expect(component.bidForm.valid).toBe(true);
  });

  it('posts trimmed fields, null optional values and a numeric decimal from the input', () => {
    component.openCreate();
    fixture.detectChanges();
    component.bidForm.controls.bidNo.setValue(' A002 ');
    const input = fixture.nativeElement.querySelector('#bid-quantity') as HTMLInputElement;
    input.value = '3.75';
    input.dispatchEvent(new Event('input'));
    component.save();
    const request = http.expectOne('/api/bids');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      bidNo: 'A002',
      quantity: 3.75,
      quotationNoticeDate: null,
      contactName: null,
      awardAmount: null,
      awardDate: null,
    });
    expect(request.request.body.id).toBeUndefined();
    expect(request.request.body.createdAt).toBeUndefined();
    request.flush({ ...item, id: 2, bidNo: 'A002', quantity: 3.75 });
    http.expectOne('/api/bids').flush([{ ...item, id: 2, bidNo: 'A002', quantity: 3.75 }]);
    expect(component.bids()[0].bidNo).toBe('A002');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.data-table').textContent).toContain('A002');
    expect(fixture.nativeElement.querySelector('dialog.bid-editor').hasAttribute('open')).toBe(
      false,
    );
    component.openCreate();
    expect(component.bidForm.controls.quantity.value).toBeNull();
  });

  it('preserves data and user edits after a rejected update, then permits retry', () => {
    component.openEdit(item);
    component.bidForm.controls.contactName.setValue('新聯絡人');
    component.save();
    const failed = http.expectOne('/api/bids/1');
    expect(failed.request.method).toBe('PUT');
    failed.flush('更新失敗', { status: 422, statusText: 'Unprocessable Content' });
    expect(component.formError()).toBe('更新失敗');
    expect(component.bids()[0].contactName).toBe('陳小姐');
    expect(component.bidForm.controls.contactName.value).toBe('新聯絡人');
    component.save();
    http.expectOne('/api/bids/1').flush({ ...item, contactName: '新聯絡人' });
    http.expectOne('/api/bids').flush([{ ...item, contactName: '新聯絡人' }]);
    expect(component.bids()[0].contactName).toBe('新聯絡人');
  });

  it('sends award amount and date on create and preserves them when editing', () => {
    component.openCreate();
    component.bidForm.patchValue({
      bidNo: 'AWARD-1',
      awardAmount: 12345.67,
      awardDate: '2026-10-25',
    });
    component.save();
    const request = http.expectOne('/api/bids');
    expect(request.request.body).toMatchObject({ awardAmount: 12345.67, awardDate: '2026-10-25' });
    request.flush({ ...item, awardDate: '2026-10-25' });
    http.expectOne('/api/bids').flush([{ ...item, awardDate: '2026-10-25' }]);
    component.openEdit(component.bids()[0]);
    expect(component.bidForm.controls.awardAmount.value).toBe(12345.67);
    expect(component.bidForm.controls.awardDate.value).toBe('2026-10-25');
    component.bidForm.controls.awardAmount.setValue(-1);
    component.save();
    http.expectNone((request) => request.method === 'PUT');
    component.bidForm.controls.awardAmount.setValue(1.234);
    expect(component.bidForm.controls.awardAmount.invalid).toBe(true);
  });

  it('keeps a row on delete failure and removes it only after success', () => {
    component.askDelete(item);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('app-delete-dialog .button-danger').click();
    http
      .expectOne('/api/bids/1')
      .flush('刪除失敗', { status: 422, statusText: 'Unprocessable Content' });
    expect(component.bids().length).toBe(1);
    expect(component.deleteError()).toBe('刪除失敗');
    component.confirmDelete();
    const request = http.expectOne('/api/bids/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/bids').flush([]);
    expect(component.bids()).toEqual([]);
    expect(component.currentPage()).toBe(1);
  });

  it('shows a load error and supports retry', () => {
    component.loadBids();
    http.expectOne('/api/bids').error(new ProgressEvent('error'));
    expect(component.error()).toContain('後端服務');
    component.loadBids();
    http.expectOne('/api/bids').flush([]);
    expect(component.error()).toBe('');
    expect(component.bids()).toEqual([]);
  });

  it('shows only the general bids table and preserves the create dialog', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.data-table').length).toBe(1);
    expect(element.querySelector('h1')?.textContent).toContain('台塑標案');
    expect(element.querySelector('app-government-bids')).toBeNull();
    http.expectNone('/api/government-bids');
    const createButton = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('新增標案'),
    )!;
    expect(createButton.textContent).toContain('新增標案');
    createButton.click();
    fixture.detectChanges();
    expect(element.querySelector('dialog.bid-editor')?.hasAttribute('open')).toBe(true);
    expect(component.bids()).toEqual([item]);
  });
});
