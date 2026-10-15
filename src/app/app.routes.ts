import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'materials',
    loadComponent: () => import('./materials/materials').then((m) => m.Materials),
  },
  { path: '', redirectTo: 'materials', pathMatch: 'full' },
  { path: '**', redirectTo: 'materials' },
];
