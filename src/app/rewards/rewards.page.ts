import { Component, OnInit } from '@angular/core';
import { LoyaltyDataService, Reward } from '../services/loyalty-data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rewards',
  templateUrl: './rewards.page.html',
  styleUrls: ['./rewards.page.scss'],
  standalone: false,
})
export class RewardsPage implements OnInit {
  selectedFilter: 'all' | 'rewards' | 'vouchers' = 'all';
  get filteredRewards() {
    if (this.selectedFilter === 'all') return this.loyalty.rewards;
    return this.loyalty.rewards.filter(item => this.selectedFilter === 'vouchers' ? item.voucher : !item.voucher);
  }

  constructor(public loyalty: LoyaltyDataService, private router: Router) { }

  viewOffer(reward: Reward) {
    this.router.navigate(['/reward-details'], {
      queryParams: { id: reward.id, kind: reward.voucher ? 'voucher' : 'reward', preview: 'true' }
    });
  }

  ngOnInit() {
  }

}
