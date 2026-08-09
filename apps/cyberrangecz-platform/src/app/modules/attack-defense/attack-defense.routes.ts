import { Routes } from '@angular/router';

export const ATTACK_DEFENSE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'vpn',
    pathMatch: 'full',
  },
  {
    path: 'vpn',
    loadComponent: () =>
      import('./vpn/vpn.component').then((m) => m.VpnComponent),
    data: { breadcrumb: 'VPN Management', title: 'VPN Management' },
  },
  {
    path: 'game-control',
    loadComponent: () =>
      import('./game-control/game-control.component').then((m) => m.GameControlComponent),
    data: { breadcrumb: 'Start / End', title: 'Game Control' },
  },
  {
    path: 'checker',
    loadComponent: () =>
      import('./checker/checker.component').then((m) => m.CheckerComponent),
    data: { breadcrumb: 'Checker Editor', title: 'Checker Editor' },
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./logs/logs.component').then((m) => m.LogsComponent),
    data: { breadcrumb: 'Logs', title: 'Logs' },
  },
];
