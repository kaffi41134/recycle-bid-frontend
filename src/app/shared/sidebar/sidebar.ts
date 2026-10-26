import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideBarcode,
  LucideChartColumn,
  LucideClipboardList,
  LucideDynamicIcon,
  LucideGavel,
  LucideLeaf,
  LucideLayoutDashboard,
  LucideRecycle,
  LucideSettings,
  LucideTrendingUp,
  type LucideIconInput,
} from '@lucide/angular';

interface NavItem {
  readonly icon: LucideIconInput;
  readonly label: string;
  readonly route?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly brandIcon = LucideLeaf;
  readonly highlight = signal({ top: 0, height: 0 });
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: LucideLayoutDashboard },
    { label: '回收品項管理', icon: LucideRecycle, route: '/materials' },
    { label: '台塑標案', icon: LucideGavel, route: '/bids' },
    { label: '政府標案', icon: LucideGavel, route: '/government-bids' },
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
