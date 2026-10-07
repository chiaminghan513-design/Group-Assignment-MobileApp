import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

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
    loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'wallet',
    loadChildren: () => import('./wallet/wallet.module').then( m => m.WalletPageModule)
  },
  {
    path: 'rewards',
    loadChildren: () => import('./rewards/rewards.module').then( m => m.RewardsPageModule)
  },
  {
    path: 'stamps',
    loadChildren: () => import('./stamps/stamps.module').then( m => m.StampsPageModule)
  },
  {
    path: 'history',
    loadChildren: () => import('./history/history.module').then( m => m.HistoryPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'verify-code',
    loadChildren: () => import('./verify-code/verify-code.module').then( m => m.VerifyCodePageModule)
  },
  {
    path: 'member-qr', data: { feature: 'qr' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'my-rewards', data: { feature: 'my-rewards' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'vouchers', data: { feature: 'vouchers' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'notifications', data: { feature: 'notifications' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'notification-details', data: { feature: 'notification-details' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'reward-details', data: { feature: 'reward-details' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'stores', data: { feature: 'stores' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'feedback', data: { feature: 'feedback' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'forgot-password', data: { feature: 'forgot-password' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'edit-profile', data: { feature: 'edit-profile' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'referrals', data: { feature: 'referrals' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'verify-email', data: { feature: 'verify-email' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'deactivate-account', data: { feature: 'deactivate-account' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'addresses', data: { feature: 'addresses' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  },
  {
    path: 'ordering', data: { feature: 'ordering' }, loadComponent: () => import('./member-feature/member-feature.page').then(m => m.MemberFeaturePage)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
