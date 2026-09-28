import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular/lazy';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { AuthService } from '../services/auth';

type Feature = 'qr' | 'my-rewards' | 'vouchers' | 'notifications' | 'stores' | 'feedback' | 'forgot-password' | 'edit-profile' | 'addresses' | 'ordering';

@Component({
  selector: 'app-member-feature',
  templateUrl: './member-feature.page.html',
  styleUrls: ['./member-feature.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class MemberFeaturePage implements OnInit {
  feature: Feature = 'qr';
  title = '';
  contactValue = '';
  feedback = '';
  profile = { name: '', email: '', phone: '+60 12 345 6789' };
  readonly qrRows = ['101011001', '010101110', '111010101', '001111001', '110010111', '011101010', '100011101', '010110011', '111001010'];

  constructor(private route: ActivatedRoute, public loyalty: LoyaltyDataService, private alerts: AlertController, private auth: AuthService) {}

  ngOnInit() {
    this.feature = (this.route.snapshot.data['feature'] || 'qr') as Feature;
    this.title = ({ qr: 'Member QR', 'my-rewards': 'My rewards', vouchers: 'My vouchers', notifications: 'Notifications', stores: 'Stores', feedback: 'Feedback', 'forgot-password': 'Reset password', 'edit-profile': 'Edit profile', addresses: 'Delivery addresses', ordering: 'Order ahead' })[this.feature];
    this.profile.name = this.loyalty.member.name;
  }

  async confirm(message: string) {
    const alert = await this.alerts.create({ header: 'Done', message, buttons: ['OK'] });
    await alert.present();
  }

  submitFeedback() { if (this.feedback.trim()) { this.confirm('Thank you. Your feedback has been saved.'); this.feedback = ''; } }
  resetPassword() {
    if (!this.contactValue.trim()) { return; }
    this.auth.requestPasswordReset(this.contactValue).subscribe({
      next: () => this.confirm('A reset verification code has been requested for your phone number.'),
      error: () => this.confirm('We could not request a reset code. Please verify the phone number and try again.')
    });
  }
}
