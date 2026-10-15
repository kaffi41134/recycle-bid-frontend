import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './shared/sidebar/sidebar';
import { Header } from './shared/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  readonly sidebarOpen = signal(false);

  search(keyword: string) {
    this.router.navigate(['/materials'], { queryParams: { keyword: keyword.trim() || null } });
  }
}
