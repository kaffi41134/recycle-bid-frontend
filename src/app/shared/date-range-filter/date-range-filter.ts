import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateRangeSelection {
  from: string;
  to: string;
  preset: DatePreset;
}

@Component({
  selector: 'app-date-range-filter',
  templateUrl: './date-range-filter.html',
  styleUrl: './date-range-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeFilter {
  readonly label = input('日期');
  readonly from = input('');
  readonly to = input('');
  readonly activePreset = input<DatePreset>('all');
  readonly rangeChange = output<DateRangeSelection>();
  readonly presets = [
    { key: 'all', label: '全部' },
    { key: 'today', label: '今天' },
    { key: 'yesterday', label: '昨天' },
    { key: 'week', label: '本週' },
    { key: 'month', label: '本月' },
  ] as const;

  selectPreset(preset: Exclude<DatePreset, 'custom'>) {
    this.rangeChange.emit({ ...datePresetRange(preset), preset });
  }

  changeDate(field: 'from' | 'to', event: Event) {
    this.rangeChange.emit({
      from: this.from(),
      to: this.to(),
      preset: this.activePreset(),
      [field]: (event.target as HTMLInputElement).value,
    });
  }
}

// 以台灣日期計算快捷區間；本週從星期一開始，區間包含完整的一週／月份。
export function datePresetRange(preset: Exclude<DatePreset, 'custom'>, now = new Date()) {
  if (preset === 'all') return { from: '', to: '' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const start = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`);
  const end = new Date(start);
  if (preset === 'yesterday') {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setTime(start.getTime());
  } else if (preset === 'week') {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
  } else if (preset === 'month') {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  }
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
