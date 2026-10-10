import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subscription, timeout } from 'rxjs';
import { Activity, LoyaltyDataService } from '../services/loyalty-data.service';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false,
})
export class HistoryPage implements OnInit, OnDestroy {

  selectedFilter = 'all';
  activityTitle(item: Activity): string {
    if (item.type === 'stamp') return item.amount.startsWith('-') ? 'Stamps used' : 'Stamps earned';
    if (item.type === 'spend') return 'Wallet payment';
    if (item.type === 'topup') return 'Wallet top-up';
    if (item.type === 'earn') return 'Points earned';
    return item.title;
  }
  loading = false;
  private historyRequest?: Subscription;
  constructor(public loyalty: LoyaltyDataService, private auth: AuthService, private changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.load(this.selectedFilter);
  }

  load(type: any) {
    if (!type) return;
    this.historyRequest?.unsubscribe();
    this.loading = true;
    this.historyRequest = this.auth.getHistory(type).pipe(
      timeout(18_000),
      finalize(() => {
        this.loading = false;
        this.changeDetector.detectChanges();
      })
    ).subscribe({
      next: result => this.loyalty.setHistory(result),
      error: () => this.loyalty.setHistory([])
    });
  }

  ngOnDestroy() { this.historyRequest?.unsubscribe(); }

}
