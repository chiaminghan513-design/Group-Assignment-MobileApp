import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { LoyaltyDataService, Reward } from '../services/loyalty-data.service';

@Component({
  selector: 'app-rewards',
  templateUrl: './rewards.page.html',
  styleUrls: ['./rewards.page.scss'],
  standalone: false,
})
export class RewardsPage implements OnInit {

  constructor(public loyalty: LoyaltyDataService, private alertController: AlertController) { }

  async redeem(reward: Reward) {
    const alert = await this.alertController.create({ header: 'Redeem reward?', message: `${reward.points} points will be used for ${reward.name}.`, buttons: ['Cancel', { text: 'Show QR', handler: () => {} }] });
    await alert.present();
  }

  ngOnInit() {
  }

}
