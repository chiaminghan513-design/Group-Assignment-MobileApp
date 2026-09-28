import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LoyaltyDataService } from '../services/loyalty-data.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {

  constructor(public loyalty: LoyaltyDataService, private router: Router, private alertController: AlertController) { }

  async copyReferralCode() {
    await navigator.clipboard?.writeText(this.loyalty.member.referralCode);
    const alert = await this.alertController.create({ header: 'Referral code copied', message: 'Share it with a friend when they join.', buttons: ['OK'] });
    await alert.present();
  }

  logout() { localStorage.removeItem('auth_token'); localStorage.removeItem('member_phone'); this.loyalty.clearMember(); this.router.navigateByUrl('/choice', { replaceUrl: true }); }

  ngOnInit() {
  }

}
