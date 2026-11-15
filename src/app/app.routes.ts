import { Routes } from '@angular/router'
import { environment } from '../environments/environment'

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/calendar/calendar').then((m) => m.CalendarPage) },
  { path: 'foods', loadComponent: () => import('./pages/foods/foods').then((m) => m.FoodsPage) },
  { path: 'allergens', loadComponent: () => import('./pages/allergens/allergens').then((m) => m.AllergensPage) },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage) },
  ...(environment.production
    ? []
    : [
        {
          path: 'dev/components',
          loadComponent: () => import('./dev/components-demo/components-demo').then((m) => m.ComponentsDemo),
        },
      ]),
  { path: '**', redirectTo: '' },
]
