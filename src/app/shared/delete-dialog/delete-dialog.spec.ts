import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteDialog } from './delete-dialog';

describe('DeleteDialog', () => {
  let fixture: ComponentFixture<DeleteDialog>;
  let dialog: HTMLDialogElement;
  let cancelButton: HTMLButtonElement;
  let confirmButton: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DeleteDialog] }).compileComponents();
    fixture = TestBed.createComponent(DeleteDialog);
    fixture.componentRef.setInput('title', '刪除測試項目');
    fixture.componentRef.setInput('message', '確定刪除「測試項目」嗎？');
    fixture.detectChanges();
    dialog = fixture.nativeElement.querySelector('dialog');
    cancelButton = dialog.querySelector<HTMLButtonElement>('.button-secondary')!;
    confirmButton = dialog.querySelector<HTMLButtonElement>('.button-danger')!;
    // jsdom 不提供原生 dialog 的開關行為。
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => dialog.removeAttribute('open');
  });

  it('emits confirmation and stays open until the parent closes it after success', () => {
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.open();
    expect(dialog.textContent).toContain('刪除測試項目');
    expect(dialog.textContent).toContain('確定刪除「測試項目」嗎？');
    confirmButton.click();
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
    fixture.componentRef.setInput('error', '刪除失敗');
    fixture.detectChanges();
    expect(dialog.textContent).toContain('刪除失敗');
    fixture.componentInstance.close();
    expect(dialog.open).toBe(false);
  });

  it('closes and emits cancellation for both the cancel button and Esc', () => {
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.componentInstance.open();
    cancelButton.click();
    expect(dialog.open).toBe(false);
    fixture.componentInstance.open();
    const event = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(false);
    expect(cancelled).toHaveBeenCalledTimes(2);
  });

  it('blocks confirmation, cancellation and Esc while deleting', () => {
    const confirmed = vi.fn();
    const cancelled = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.componentInstance.open();
    fixture.componentRef.setInput('deleting', true);
    fixture.detectChanges();
    expect(cancelButton.disabled).toBe(true);
    expect(confirmButton.disabled).toBe(true);
    expect(confirmButton.textContent).toContain('刪除中…');
    confirmButton.click();
    cancelButton.click();
    const event = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
    expect(confirmed).not.toHaveBeenCalled();
    expect(cancelled).not.toHaveBeenCalled();
    // 成功回應可能早於 deleting 狀態重設，仍必須能由父元件關閉。
    fixture.componentInstance.close();
    expect(dialog.open).toBe(false);
  });

  it('disables only confirmation while other page data is loading', () => {
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.open();
    fixture.componentRef.setInput('confirmDisabled', true);
    fixture.detectChanges();
    expect(confirmButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(false);
    confirmButton.click();
    expect(confirmed).not.toHaveBeenCalled();
    cancelButton.click();
    expect(dialog.open).toBe(false);
  });
});
