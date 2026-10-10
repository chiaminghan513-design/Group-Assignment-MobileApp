import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LoyaltyDataService } from '../services/loyalty-data.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {

  constructor(public loyalty: LoyaltyDataService, private router: Router, private toastController: ToastController) { }

  async copyReferralCode() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(this.loyalty.member.referralCode);
      const toast = await this.toastController.create({ message: 'Referral code copied. Share it with a friend when they join.', color: 'success', position: 'top', duration: 4500 });
      await toast.present();
    } catch {
      const toast = await this.toastController.create({ message: 'Could not copy your referral code. You can select and copy it manually.', color: 'warning', position: 'top', duration: 4500 });
      await toast.present();
    }
  }

  logout() { localStorage.removeItem('auth_token'); localStorage.removeItem('member_phone'); this.loyalty.clearMember(); this.router.navigateByUrl('/choice', { replaceUrl: true }); }

  ngOnInit() {
  }

}
