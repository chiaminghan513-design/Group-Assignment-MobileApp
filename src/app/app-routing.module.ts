import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { memberAuthGuard } from './guards/member-auth.guard';

const routes: Routes = [
  {
    path: 'home',
    redirectTo: 'choice',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'loading',
    pathMatch: 'full'
  },
  {
    path: 'loading',
    loadChildren: () => import('./loading/loading.module').then( m => m.LoadingPageModule)
  },
  {
    path: 'otp',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'choice',
    loadComponent: () => import('./choice/choice.page').then(m => m.ChoicePage)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'dashboard',
    canActivate: [memberAuthGuard],
    loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'wallet',
    canActivate: [memberAuthGuard],
    loadChildren: () => import('./wallet/wallet.module').then( m => m.WalletPageModule)
  },
  {
    path: 'rewards',
    canActivate: [memberAuthGuard],
    loadChildren: () => import('./rewards/rewards.module').then( m => m.RewardsPageModule)
  },
  {
    path: 'stamps',
    canActivate: [memberAuthGuard],
    loadChildren: () => import('./stamps/stamps.module').then( m => m.StampsPageModule)
  },
  {
    path: 'history',
    canActivate: [memberAuthGuard],
    loadChildren: () => import('./history/history.module').then( m => m.HistoryPageModule)
  },
  {
    path: 'profile',
    canActivate: [memberAuthGuard],
    loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'verify-code',
    loadChildren: () => import('./verify-code/verify-code.module').then( m => m.VerifyCodePageModule)
  },
  {
    path: 'member-qr', canActivate: [memberAuthGuard], data: { feature: 'qr' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'my-rewards', canActivate: [memberAuthGuard], data: { feature: 'my-rewards' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'vouchers', canActivate: [memberAuthGuard], data: { feature: 'vouchers' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'notifications', canActivate: [memberAuthGuard], data: { feature: 'notifications' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'notification-details', canActivate: [memberAuthGuard], data: { feature: 'notification-details' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'reward-details', canActivate: [memberAuthGuard], data: { feature: 'reward-details' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'topup-details', canActivate: [memberAuthGuard], data: { feature: 'topup-details' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'stores', canActivate: [memberAuthGuard], data: { feature: 'stores' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'feedback', canActivate: [memberAuthGuard], data: { feature: 'feedback' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'forgot-password', data: { feature: 'forgot-password' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'edit-profile', canActivate: [memberAuthGuard], data: { feature: 'edit-profile' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'referrals', canActivate: [memberAuthGuard], data: { feature: 'referrals' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'verify-email', canActivate: [memberAuthGuard], data: { feature: 'verify-email' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'deactivate-account', canActivate: [memberAuthGuard], data: { feature: 'deactivate-account' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'addresses', canActivate: [memberAuthGuard], data: { feature: 'addresses' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'ordering', canActivate: [memberAuthGuard], data: { feature: 'ordering' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
