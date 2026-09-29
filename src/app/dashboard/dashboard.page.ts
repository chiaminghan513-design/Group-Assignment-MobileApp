import { Component, OnInit } from '@angular/core';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  readonly stampSlots = Array.from({ length: 10 });

  loading = true;

  constructor(public loyalty: LoyaltyDataService, private auth: AuthService) { }

  ngOnInit() {
    this.auth.getMemberDetails().subscribe({
      next: data => { this.loyalty.applyDashboard(data); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

}
