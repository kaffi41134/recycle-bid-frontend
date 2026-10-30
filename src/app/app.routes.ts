import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'bids',
    title: '台塑標案',
    loadComponent: () => import('./bids/formosa/bids').then((m) => m.Bids),
  },
  {
    path: 'government-bids',
    title: '政府標案',
    loadComponent: () =>
      import('./bids/government/government-bids').then((m) => m.GovernmentBids),
  },
  {
    path: 'materials',
    title: '回收品項管理',
    loadComponent: () => import('./materials/materials').then((m) => m.Materials),
  },
  { path: '', redirectTo: 'materials', pathMatch: 'full' },
  { path: '**', redirectTo: 'materials' },
];
