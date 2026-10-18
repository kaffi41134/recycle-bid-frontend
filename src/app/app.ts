import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LucideChevronRight, LucideHouse, LucideMenu } from '@lucide/angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Sidebar } from './shared/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, LucideChevronRight, LucideHouse, LucideMenu],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly pageTitle = computed(() =>
    this.currentUrl().split('?')[0].startsWith('/bids') ? '投標案件管理' : '回收品項管理',
  );
  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
}
