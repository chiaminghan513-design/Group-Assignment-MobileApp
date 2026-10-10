import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: false,
})
export class WalletPage implements OnInit {
  refreshing = false;
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor(
    public loyalty: LoyaltyDataService,
    private router: Router,
    private auth: AuthService,
  ) { }

  openActivity(item: { id: string; type: string }) {
    if (item.type === 'topup' && item.id) this.router.navigate(['/topup-details'], { queryParams: { id: item.id } });
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.refreshWallet();
  }

  refreshFromGesture(event: CustomEvent) {
    this.refreshWallet(event.target as HTMLIonRefresherElement);
  }

  private refreshWallet(refresher?: HTMLIonRefresherElement) {
    if (!localStorage.getItem('auth_token') || this.refreshing) {
      void refresher?.complete();
      return;
    }

    this.refreshing = true;
    this.auth.getMemberDetails().pipe(
      finalize(() => {
        this.refreshing = false;
        void refresher?.complete();
        this.changeDetector.detectChanges();
      }),
    ).subscribe({
      next: data => {
        this.loyalty.applyDashboard(data);
        this.changeDetector.detectChanges();
      },
      error: () => undefined,
    });
  }

}
