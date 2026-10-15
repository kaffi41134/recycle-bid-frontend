import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { LucideSearch } from '@lucide/angular';

@Component({
  selector: 'app-header',
  imports: [LucideSearch],
  templateUrl: './header.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  readonly sidebarOpen = model(false);
  readonly search = output<string>();
}
