import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideTrash, LucideUndo2 } from '@lucide/angular';

@Component({
  selector: 'app-delete-dialog',
  imports: [LucideTrash, LucideUndo2],
  templateUrl: './delete-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly deleting = input(false);
  readonly error = input('');
  readonly confirmDisabled = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  open() {
    this.dialog().nativeElement.showModal();
  }

  close() {
    this.dialog().nativeElement.close();
  }

  cancel(event?: Event) {
    event?.preventDefault();
    if (this.deleting()) return;
    this.close();
    this.cancelled.emit();
  }

  confirm() {
    if (this.deleting() || this.confirmDisabled()) return;
    this.confirmed.emit();
  }
}
