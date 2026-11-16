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
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/tracker/log-page/log-page').then((m) => m.LogPage),
      },
      {
        path: 'timeline',
        loadComponent: () => import('./pages/tracker/timeline-page/timeline-page').then((m) => m.TimelinePage),
      },
      {
        path: 'stats',
        loadComponent: () => import('./pages/tracker/stats-page/stats-page').then((m) => m.StatsPage),
      },
      {
        path: 'tasting',
        loadComponent: () => import('./layout/tasting-section/tasting-section').then((m) => m.TastingSection),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/calendar/calendar-page/calendar-page').then((m) => m.CalendarPage),
          },
          {
            path: 'foods',
            pathMatch: 'full',
            loadComponent: () => import('./pages/foods/foods-page/foods-page').then((m) => m.FoodsPage),
          },
          {
            path: 'foods/new',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () => import('./pages/foods/food-form/food-form').then((m) => m.FoodForm),
          },
          {
            path: 'foods/allergens',
            loadComponent: () =>
              import('./pages/foods/allergens-manage/allergens-manage').then((m) => m.AllergensManage),
          },
          {
            path: 'foods/:id/edit',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () => import('./pages/foods/food-form/food-form').then((m) => m.FoodForm),
          },
          {
            path: 'foods/:id',
            pathMatch: 'full',
            loadComponent: () => import('./pages/foods/food-detail/food-detail').then((m) => m.FoodDetail),
          },
          {
            path: 'allergens',
            pathMatch: 'full',
            loadComponent: () =>
              import('./pages/allergens/allergens-page/allergens-page').then((m) => m.AllergensPage),
          },
          {
            path: 'allergens/reactions',
            loadComponent: () =>
              import('./pages/reactions/reactions-list/reactions-list').then((m) => m.ReactionsList),
          },
          {
            path: 'reactions/new',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./pages/reactions/reaction-form/reaction-form').then((m) => m.ReactionForm),
          },
          {
            path: 'reactions/:id',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./pages/reactions/reaction-form/reaction-form').then((m) => m.ReactionForm),
          },
          {
            path: 'allergens/:id',
            loadComponent: () =>
              import('./pages/allergens/allergen-detail/allergen-detail').then((m) => m.AllergenDetail),
          },
        ],
      },
      {
        path: 'settings',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
      {
        path: 'settings/icons',
        loadComponent: () => import('./pages/settings/icons-page/icons-page').then((m) => m.IconsPage),
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
