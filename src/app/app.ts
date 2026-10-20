import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, TitleStrategy } from '@angular/router';
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
  private readonly titleStrategy = inject(TitleStrategy);
  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.titleStrategy.buildTitle(this.router.routerState.snapshot) ?? ''),
    ),
    { initialValue: this.titleStrategy.buildTitle(this.router.routerState.snapshot) ?? '' },
  );
  readonly sidebarOpen = signal(false);
  readonly sidebarExpanded = signal(true);
}
