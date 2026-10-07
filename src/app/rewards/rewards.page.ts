import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
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

  constructor(public loyalty: LoyaltyDataService, private alertController: AlertController, private router: Router) { }

  async redeem(reward: Reward) {
    const alert = await this.alertController.create({ header: 'Show reward code?', message: `Show ${reward.name} at the counter. The POS confirms whether points are deducted.`, buttons: ['Cancel', { text: 'Show QR', handler: () => this.router.navigate(['/reward-details'], { queryParams: { id: reward.id, kind: reward.voucher ? 'voucher' : 'reward' } }) }] });
    await alert.present();
  }

  ngOnInit() {
  }

}
