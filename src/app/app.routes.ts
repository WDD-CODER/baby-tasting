import { Routes } from '@angular/router'
import { environment } from '../environments/environment'
import { authGuard } from './core/guards/auth.guard'
import { babyGuard } from './core/guards/baby.guard'
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard'

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage) },
  {
    path: 'welcome',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/welcome/welcome').then((m) => m.WelcomePage),
  },
  {
    path: '',
    canActivate: [authGuard, babyGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/calendar/calendar').then((m) => m.CalendarPage) },
      { path: 'foods', loadComponent: () => import('./pages/foods/foods').then((m) => m.FoodsPage) },
      { path: 'allergens', loadComponent: () => import('./pages/allergens/allergens').then((m) => m.AllergensPage) },
      {
        path: 'settings',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
      ...(environment.production
        ? []
        : [
            {
              path: 'dev/components',
              loadComponent: () => import('./dev/components-demo/components-demo').then((m) => m.ComponentsDemo),
            },
          ]),
    ],
  },
  { path: '**', redirectTo: '' },
]
