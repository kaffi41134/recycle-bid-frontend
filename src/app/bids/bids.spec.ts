import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { Bids } from './bids';
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
    expect(element.querySelectorAll('.data-table')[0].querySelectorAll('th').length).toBe(13);
    expect(element.querySelector('tbody')?.textContent).toContain('12.5');
    expect(element.querySelector('tbody')?.textContent).toContain('—');
    expect(element.querySelectorAll('.action-button').length).toBe(2);
  });

  it('searches optional fields safely and resets pagination', () => {
    component.page.set(3);
    component.searchForm.controls.keyword.setValue('台北');
    expect(component.filteredBids()).toEqual([item]);
    expect(component.currentPage()).toBe(1);
    component.searchForm.controls.keyword.setValue('不存在');
    expect(component.filteredBids()).toEqual([]);
    component.resetSearch();
    expect(component.filteredBids()).toEqual([item]);
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
    });
    expect(request.request.body.id).toBeUndefined();
    expect(request.request.body.createdAt).toBeUndefined();
    request.flush({ ...item, id: 2, bidNo: 'A002', quantity: 3.75 });
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
    expect(component.bids()[0].contactName).toBe('新聯絡人');
  });

  it('keeps a row on delete failure and removes it only after success', () => {
    component.askDelete(item);
    component.confirmDelete();
    http
      .expectOne('/api/bids/1')
      .flush('刪除失敗', { status: 422, statusText: 'Unprocessable Content' });
    expect(component.bids().length).toBe(1);
    expect(component.deleteError()).toBe('刪除失敗');
    component.confirmDelete();
    const request = http.expectOne('/api/bids/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
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
    expect(element.querySelector('h1')?.textContent).toContain('一般標案');
    expect(element.querySelector('app-government-bids')).toBeNull();
    http.expectNone('/api/government-bids');
    const createButton = element.querySelector('.add-bid') as HTMLButtonElement;
    expect(createButton.textContent).toContain('新增標案');
    createButton.click();
    fixture.detectChanges();
    expect(element.querySelector('dialog.bid-editor')?.hasAttribute('open')).toBe(true);
    expect(component.bids()).toEqual([item]);
  });
});
