import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Materials } from './materials';
import { Material } from './material.model';

const items: Material[] = [
  {
    id: 1,
    code: 'MET001',
    name: '廢紅銅',
    category: '金屬類',
    unit: 'KG',
    enabled: true,
    createdAt: '2026-10-14T16:30:00',
  },
  {
    id: 2,
    code: 'PAP002',
    name: '紙板',
    category: '紙類',
    unit: 'KG',
    enabled: false,
    createdAt: '2026-10-14T16:31:00',
  },
];

describe('Materials', () => {
  let fixture: ComponentFixture<Materials>;
  let component: Materials;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Materials],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Materials);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/materials').flush(items);
    fixture.detectChanges();
    // jsdom 不提供原生 dialog 行為，這裡只替換開關視窗方法。
    for (const dialog of fixture.nativeElement.querySelectorAll(
      'dialog',
    ) as NodeListOf<HTMLDialogElement>) {
      dialog.showModal = () => dialog.setAttribute('open', '');
      dialog.close = () => dialog.removeAttribute('open');
    }
  });

  afterEach(() => http.verify());

  it('renders the API timestamp and edit/delete buttons', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('time')?.textContent).toBe('2026-10-14 16:30');
    expect(element.querySelectorAll('.action-button').length).toBe(4);
  });

  it('combines keyword, category and status filters and resets them', () => {
    component.searchForm.setValue({ keyword: 'PAP', category: '紙類', status: 'disabled' });
    component.search();
    expect(component.visibleMaterials().map((item) => item.id)).toEqual([2]);
    component.resetSearch();
    expect(component.filteredMaterials().length).toBe(2);
  });

  it('rejects whitespace without sending a request', () => {
    component.openCreate();
    component.materialForm.controls.name.setValue('  ');
    component.save();
    http.expectNone((request) => request.method === 'POST');
    expect(component.materialForm.controls.name.invalid).toBe(true);
  });

  it('uses the backend generated code and timestamp when creating', () => {
    component.openCreate();
    component.materialForm.controls.name.setValue(' 廢鐵 ');
    component.save();
    const request = http.expectOne('/api/materials');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: '廢鐵',
      category: '金屬類',
      unit: 'KG',
      enabled: true,
    });
    request.flush({ ...items[0], id: 3, code: 'MET003', name: '廢鐵' });
    expect(component.materials()[0].code).toBe('MET003');
    expect(component.materials()[0].createdAt).toBe(items[0].createdAt);
  });

  it('preserves list data when an edit fails and displays the backend error', () => {
    component.openEdit(items[0]);
    component.materialForm.controls.name.setValue('修改名稱');
    component.save();
    const request = http.expectOne('/api/materials/1');
    expect(request.request.method).toBe('PUT');
    request.flush('更新失敗', { status: 422, statusText: 'Unprocessable Content' });
    expect(component.materials()[0].name).toBe('廢紅銅');
    expect(component.formError()).toBe('更新失敗');
  });

  it('removes a row only after a successful delete and adjusts pagination', () => {
    component.pageSize.set(1);
    component.page.set(2);
    component.askDelete(items[1]);
    component.confirmDelete();
    expect(component.materials().length).toBe(2);
    const request = http.expectOne('/api/materials/2');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(component.materials().length).toBe(1);
    expect(component.currentPage()).toBe(1);
  });
});
