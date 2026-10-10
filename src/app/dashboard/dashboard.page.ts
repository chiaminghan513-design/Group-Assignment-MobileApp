import { ChangeDetectorRef, Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { AuthService } from '../services/auth';
import { PushNotificationService } from '../services/push-notification.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {
  get stampGoalReached(): boolean {
    const goal = this.loyalty.member.stampsNeeded;
    return Number.isFinite(goal) && goal > 0 && this.loyalty.member.stamps >= goal;
  }
  get stampSlots() { return Array.from({ length: this.loyalty.member.stampsNeeded }); }
  get rewardProgressPercent(): number | null {
    const goal = this.loyalty.member.rewardGoalPoints;
    const points = this.loyalty.member.points;
    if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(points)) return null;
    return Math.min(100, Math.max(0, (points / goal) * 100));
  }

  loading = true;
  private refreshInProgress = false;
  private polling?: Subscription;
  private appStateListener?: PluginListenerHandle;
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor(
    public loyalty: LoyaltyDataService,
    private auth: AuthService,
    private pushNotifications: PushNotificationService,
    private zone: NgZone,
  ) { }

  ngOnInit() {
    this.pushNotifications.initializeForSignedInMember();
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.zone.run(() => this.refreshDashboard());
      }
    }).then(listener => {
      this.appStateListener = listener;
    });
  }

  ionViewWillEnter() {
    this.refreshDashboard(true);
  }

  ionViewDidEnter() {
    this.stopPolling();
    this.polling = interval(5000).subscribe(() => this.refreshDashboard());
  }

  ionViewWillLeave() {
    this.stopPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    void this.appStateListener?.remove();
  }

  refreshFromGesture(event: CustomEvent) {
    this.refreshDashboard(false, event.target as HTMLIonRefresherElement);
  }

  private refreshDashboard(showLoading = false, refresher?: HTMLIonRefresherElement) {
    if (!localStorage.getItem('auth_token') || this.refreshInProgress) {
      void refresher?.complete();
      return;
    }

    this.refreshInProgress = true;
    if (showLoading) this.loading = true;

    this.auth.getMemberDetails().pipe(
      finalize(() => {
        this.refreshInProgress = false;
        this.loading = false;
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

  private stopPolling() {
    this.polling?.unsubscribe();
    this.polling = undefined;
  }
}
