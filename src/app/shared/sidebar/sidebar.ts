import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideBarcode,
  LucideChartColumn,
  LucideClipboardList,
  LucideDynamicIcon,
  LucideGavel,
  LucideLayoutDashboard,
  LucideRecycle,
  LucideRefreshCcw,
  LucideSettings,
  LucideTrendingUp,
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly brandIcon = LucideRefreshCcw;
  readonly open = model(false);
  readonly collapsed = input(false);
  readonly highlight = signal({ top: 0, height: 0 });
  readonly navigation = [
    { label: 'Dashboard', icon: LucideLayoutDashboard },
    { label: '回收品項管理', icon: LucideRecycle },
    { label: '投標案件管理', icon: LucideGavel },
    { label: '回收紀錄', icon: LucideClipboardList },
    { label: 'Barcode', icon: LucideBarcode },
    { label: '金屬價格', icon: LucideTrendingUp },
    { label: '報表', icon: LucideChartColumn },
    { label: '系統設定', icon: LucideSettings },
  ];

  moveHighlight(item: HTMLElement): void {
    this.highlight.set({ top: item.offsetTop, height: item.offsetHeight });
  }
}
