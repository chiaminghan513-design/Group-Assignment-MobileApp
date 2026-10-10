import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth';
import { LoyaltyDataService } from '../services/loyalty-data.service';

export const memberAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const loyalty = inject(LoyaltyDataService);
  const token = localStorage.getItem('auth_token')?.trim();
  const phoneNumber = localStorage.getItem('member_phone')?.trim();

  if (!token || !phoneNumber) return router.createUrlTree(['/choice']);
  if (loyalty.dashboardLoaded) return true;

  return auth.getMemberDetails(phoneNumber).pipe(
    map(data => {
      loyalty.applyDashboard(data);
      return true;
    }),
    catchError(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('member_phone');
      loyalty.clearMember();
      return of(router.createUrlTree(['/choice']));
    })
  );
};
