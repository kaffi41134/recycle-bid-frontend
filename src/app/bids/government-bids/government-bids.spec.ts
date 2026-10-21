import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernmentBids } from './government-bids';
import { GovernmentBid } from './government-bid.model';

const item: GovernmentBid = {
  id: 10,
  unitId: '3.7',
  jobNumber: 'G001',
  unitName: '測試機關',
  title: '廢料標售',
  noticeDate: '115/10/21',
  noticeType: '招標公告',
  category: null,
  tenderMethod: '公開招標',
  deadline: '115/10/30 17:00',
  openingTime: null,
  openingLocation: null,
  contactName: '陳小姐',
  contactPhone: null,
  budgetAmount: '1,200,000元',
  bidBondRequired: null,
  performanceLocation: null,
  sourceUrl: null,
  createdAt: '2026-10-21T10:00:00',
};

describe('GovernmentBids', () => {
  let fixture: ComponentFixture<GovernmentBids>;
  let component: GovernmentBids;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernmentBids],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(GovernmentBids);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/government-bids').flush([item]);
    fixture.detectChanges();
    for (const dialog of fixture.nativeElement.querySelectorAll(
      'dialog',
    ) as NodeListOf<HTMLDialogElement>) {
      dialog.showModal = () => dialog.setAttribute('open', '');
      dialog.close = () => dialog.removeAttribute('open');
    }
  });

  afterEach(() => http.verify());

  it('renders government columns and searches fields outside the table without parsing source dates', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody')?.textContent).toContain('115/10/30 17:00');
    expect(element.querySelector('tbody')?.textContent).toContain('1,200,000元');
    component.page.set(5);
    component.searchForm.controls.keyword.setValue('公開招標');
    expect(component.filteredBids()).toEqual([item]);
    expect(component.page()).toBe(1);
    component.searchForm.controls.keyword.setValue('不存在');
    expect(component.filteredBids()).toEqual([]);
    component.resetSearch();
    expect(component.filteredBids()).toEqual([item]);
  });

  it('validates whitespace and posts only request fields, then refreshes after an empty success', () => {
    component.openCreate();
    component.bidForm.patchValue({ unitId: ' ', jobNumber: 'G002' });
    component.save();
    http.expectNone((request) => request.method === 'POST');
    component.bidForm.patchValue({
      unitId: ' 3.7 ',
      title: ' 新標案 ',
      budgetAmount: '1,200,000元',
    });
    component.save();
    component.save();
    const request = http.expectOne('/api/government-bids');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      unitId: '3.7',
      jobNumber: 'G002',
      title: '新標案',
      contactName: null,
      budgetAmount: '1,200,000元',
    });
    expect(request.request.body.id).toBeUndefined();
    expect(request.request.body.createdAt).toBeUndefined();
    component.closeEditor();
    expect(fixture.nativeElement.querySelector('.bid-editor').hasAttribute('open')).toBe(true);
    request.flush(null);
    http.expectOne('/api/government-bids').flush([item, { ...item, id: 11, jobNumber: 'G002' }]);
    expect(component.bids().length).toBe(2);
    expect(fixture.nativeElement.querySelector('.bid-editor').hasAttribute('open')).toBe(false);
  });

  it('loads fresh details and updates using PUT with an empty body, preserving edits on failure', () => {
    component.openRecord(item, 'edit');
    const detail = http.expectOne('/api/government-bids/10');
    expect(detail.request.method).toBe('GET');
    component.save();
    http.expectNone((request) => request.method === 'PUT');
    detail.flush({ ...item, contactName: null });
    expect(component.bidForm.controls.contactName.value).toBe('');
    component.bidForm.controls.title.setValue('修改標案');
    component.save();
    const rejected = http.expectOne('/api/government-bids/10');
    expect(rejected.request.method).toBe('PUT');
    rejected.flush('更新失敗', { status: 422, statusText: 'Unprocessable Content' });
    expect(component.formError()).toBe('更新失敗');
    expect(component.bidForm.controls.title.value).toBe('修改標案');
    expect(component.bids()[0].title).toBe(item.title);
    component.save();
    http.expectOne('/api/government-bids/10').flush(null);
    http.expectOne('/api/government-bids').flush([{ ...item, title: '修改標案' }]);
    expect(component.bids()[0].title).toBe('修改標案');
  });

  it('prevents saving details, supports failed detail retries, and cancels requests on close', () => {
    component.openRecord(item, 'detail');
    http
      .expectOne('/api/government-bids/10')
      .flush('找不到此政府標案', { status: 422, statusText: 'Unprocessable Content' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('重新載入明細');
    component.fetchRecord(10);
    http.expectOne('/api/government-bids/10').flush(item);
    component.save();
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    component.closeEditor();
    component.openRecord(item, 'edit');
    const request = http.expectOne('/api/government-bids/10');
    component.closeEditor();
    expect(request.cancelled).toBe(true);
    expect(component.loadingDetail()).toBe(false);
  });

  it('keeps data on delete failure and corrects pagination after successful deletion', () => {
    component.bids.set(Array.from({ length: 11 }, (_, i) => ({ ...item, id: i + 1 })));
    component.page.set(2);
    component.askDelete(component.bids()[10]);
    component.confirmDelete();
    http
      .expectOne('/api/government-bids/11')
      .flush('刪除失敗', { status: 422, statusText: 'Unprocessable Content' });
    expect(component.bids().length).toBe(11);
    expect(component.deleteError()).toBe('刪除失敗');
    component.confirmDelete();
    const request = http.expectOne('/api/government-bids/11');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(component.bids().length).toBe(10);
    expect(component.page()).toBe(1);
  });

  it('retains previous data on refresh failure and can retry', () => {
    component.loadBids();
    http.expectOne('/api/government-bids').error(new ProgressEvent('error'));
    expect(component.error()).toContain('後端連線');
    expect(component.bids()).toEqual([item]);
    component.loadBids();
    http.expectOne('/api/government-bids').flush([]);
    expect(component.error()).toBe('');
    expect(component.bids()).toEqual([]);
  });
});
