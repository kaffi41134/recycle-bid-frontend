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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Material, MATERIAL_CATEGORIES } from './material.model';
import { MaterialService } from './material.service';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucidePencil,
  LucidePlus,
  LucideRotateCw,
  LucideSearch,
  LucideTrash,
} from '@lucide/angular';

@Component({
  selector: 'app-materials',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucidePencil,
    LucidePlus,
    LucideRotateCw,
    LucideSearch,
    LucideTrash,
  ],
  templateUrl: './materials.html',
  styleUrl: './materials.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Materials implements OnInit {
  private readonly service = inject(MaterialService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly editor = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');

  readonly categories = MATERIAL_CATEGORIES;
  readonly materials = signal<Material[]>([]);
  readonly enabledCount = computed(() => this.materials().filter((item) => item.enabled).length);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly deleteError = signal('');
  readonly editing = signal<Material | null>(null);
  readonly pendingDelete = signal<Material | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly searchForm = this.fb.group({ keyword: '', category: '', status: '' });
  readonly filters = signal(this.searchForm.getRawValue());
  readonly materialForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    category: ['金屬類', Validators.required],
    unit: ['KG', [Validators.required, Validators.pattern(/\S/)]],
    enabled: true,
  });

  // 查詢與分頁從原始資料計算，不再另外維護一份列表。
  readonly filteredMaterials = computed(() => {
    const { keyword, category, status } = this.filters();
    const query = keyword.trim().toLowerCase();
    return this.materials().filter(
      (item) =>
        (!query ||
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)) &&
        (!category || item.category === category) &&
        (!status || item.enabled === (status === 'enabled')),
    );
  });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredMaterials().length / this.pageSize())),
  );
  readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  readonly visibleMaterials = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredMaterials().slice(start, start + this.pageSize());
  });
  readonly firstRecord = computed(() =>
    this.filteredMaterials().length ? (this.currentPage() - 1) * this.pageSize() + 1 : 0,
  );
  readonly lastRecord = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.filteredMaterials().length),
  );
  readonly pageNumbers = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pageCount() - 4));
    return Array.from({ length: Math.min(5, this.pageCount()) }, (_, index) => start + index);
  });

  ngOnInit() {
    this.searchForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchForm.controls.keyword.setValue(params.get('keyword') ?? '');
      this.search();
    });
    this.loadMaterials();
  }

  loadMaterials() {
    this.loading.set(true);
    this.error.set('');
    this.service
      .findAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.materials.set(items),
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

  changePageSize(value: string) {
    this.pageSize.set(Number(value));
    this.page.set(1);
  }

  openCreate() {
    this.editing.set(null);
    this.formError.set('');
    this.materialForm.reset({ name: '', category: '金屬類', unit: 'KG', enabled: true });
    this.editor().nativeElement.showModal();
  }

  openEdit(item: Material) {
    this.editing.set(item);
    this.formError.set('');
    this.materialForm.reset({
      name: item.name,
      category: item.category,
      unit: item.unit,
      enabled: item.enabled,
    });
    this.editor().nativeElement.showModal();
  }

  closeEditor() {
    if (!this.saving()) this.editor().nativeElement.close();
  }

  save() {
    if (this.saving()) return;
    this.materialForm.markAllAsTouched();
    if (this.materialForm.invalid) return;
    const value = this.materialForm.getRawValue();
    const request = { ...value, name: value.name.trim(), unit: value.unit.trim() };
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
          this.materials.update((items) =>
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

  askDelete(item: Material) {
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
          this.materials.update((items) => items.filter((entry) => entry.id !== item.id));
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
