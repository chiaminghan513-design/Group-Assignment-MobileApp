import { Component, OnInit } from '@angular/core';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false,
})
export class HistoryPage implements OnInit {

  selectedFilter = 'all';
  loading = false;
  constructor(public loyalty: LoyaltyDataService, private auth: AuthService) { }

  ngOnInit() {
  }

  load(type: any) {
    if (!type) return;
    this.loading = true;
    this.auth.getHistory(type).subscribe({
      next: result => { this.loyalty.setHistory(result); this.loading = false; },
      error: () => { this.loyalty.setHistory([]); this.loading = false; }
    });
  }

}
