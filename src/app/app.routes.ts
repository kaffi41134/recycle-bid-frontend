import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'bids',
    title: '投標案件管理｜Recycle Bid System',
    loadComponent: () => import('./bids/bids').then((m) => m.Bids),
  },
  {
    path: 'materials',
    title: '回收品項管理｜Recycle Bid System',
    loadComponent: () => import('./materials/materials').then((m) => m.Materials),
  },
  { path: '', redirectTo: 'materials', pathMatch: 'full' },
  { path: '**', redirectTo: 'materials' },
];
