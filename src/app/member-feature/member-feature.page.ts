import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular/lazy';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { AuthService } from '../services/auth';
import QRCode from 'qrcode';

type Feature = 'qr' | 'my-rewards' | 'vouchers' | 'notifications' | 'notification-details' | 'reward-details' | 'stores' | 'feedback' | 'forgot-password' | 'edit-profile' | 'referrals' | 'verify-email' | 'deactivate-account' | 'addresses' | 'ordering';

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
  resetOtp = '';
  resetPasswordValue = '';
  resetRequested = false;
  resetOtpHint = '';
  feedback = '';
  profile = { name: '', email: '', phone: '', birthday: '', imageByte: '' };
  qrDataUrl = '';
  qrError = '';
  detail: any = null;
  detailId = '';
  detailVoucher = false;
  emailOtp = '';
  emailOtpHint = '';
  emailRequested = false;

  constructor(private route: ActivatedRoute, private router: Router, public loyalty: LoyaltyDataService, private alerts: AlertController, private auth: AuthService, private changeDetector: ChangeDetectorRef) {}

  ngOnInit() {
    this.feature = (this.route.snapshot.data['feature'] || 'qr') as Feature;
    this.title = ({ qr: 'Member QR', 'my-rewards': 'My rewards', vouchers: 'My vouchers', notifications: 'Notifications', 'notification-details': 'Notification', 'reward-details': 'Reward details', stores: 'Stores', feedback: 'Feedback', 'forgot-password': 'Reset password', 'edit-profile': 'Edit profile', referrals: 'Referrals', 'verify-email': 'Verify email', 'deactivate-account': 'Deactivate account', addresses: 'Delivery addresses', ordering: 'Order ahead' })[this.feature];
    this.profile.name = this.loyalty.member.name;
    this.profile.email = this.loyalty.member.email;
    this.profile.phone = this.loyalty.member.phoneNumber;
    this.profile.birthday = this.loyalty.member.birthDate;
    this.profile.imageByte = this.loyalty.member.image;
    if (this.feature === 'qr') this.loadMemberQr();
    this.detailId = this.route.snapshot.queryParamMap.get('id') || '';
    this.detailVoucher = this.route.snapshot.queryParamMap.get('kind') === 'voucher';
    if (this.feature === 'reward-details' && this.detailId) this.loadRewardDetails();
    if (this.feature === 'notification-details' && this.detailId) this.loadNotification();
  }

  private loadRewardDetails() {
    this.auth.getRewardDetails(this.detailId, this.detailVoucher).subscribe({
      next: result => {
        this.detail = Array.isArray(result) ? result[0] : result;
        this.auth.getRewardQr(this.detailId, this.detailVoucher).subscribe({
          next: qr => this.renderRewardQr(qr.qrToken),
          error: () => this.qrError = 'Unable to create the redemption QR.'
        });
      },
      error: error => this.confirm(error?.error?.message || 'Unable to load this item.')
    });
  }

  private renderRewardQr(token: string) {
    const payload = JSON.stringify({ type: 'LOYALTY_REWARD', phoneNumber: this.loyalty.member.phoneNumber, rewardId: this.detailId, kind: this.detailVoucher ? 'voucher' : 'reward', verificationToken: token });
    QRCode.toDataURL(payload, { width: 260, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#141615', light: '#ffffff' } })
      .then(url => { this.qrDataUrl = url; this.changeDetector.detectChanges(); })
      .catch(() => { this.qrError = 'Unable to render the redemption QR.'; this.changeDetector.detectChanges(); });
  }

  private loadNotification() {
    this.auth.getNotification(this.detailId).subscribe({
      next: result => { this.detail = Array.isArray(result) ? result[0] : result; this.auth.markNotificationRead(this.detailId).subscribe({ next: () => {}, error: () => {} }); },
      error: error => this.confirm(error?.error?.message || 'Unable to load this notification.')
    });
  }

  private loadMemberQr() {
    this.auth.getMemberQr().subscribe({
      next: ({ qrToken }) => {
        const qrPayload = JSON.stringify({ type: 'LOYALTY_MEMBER', phoneNumber: this.loyalty.member.phoneNumber, verificationToken: qrToken });
        QRCode.toDataURL(qrPayload, {
          width: 260, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#141615', light: '#ffffff' }
        }).then(url => {
          this.qrDataUrl = url;
          this.changeDetector.detectChanges();
        }).catch(() => {
          this.qrError = 'Unable to render your member QR code.';
          this.changeDetector.detectChanges();
        });
      },
      error: error => {
        this.qrError = error?.error?.message || 'Unable to generate your member QR code.';
        this.changeDetector.detectChanges();
      }
    });
  }
  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      this.confirm('Choose an image smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.profile.imageByte = String(reader.result || '').split(',')[1] || '';
    reader.readAsDataURL(file);
  }

  async confirm(message: string) {
    const alert = await this.alerts.create({ header: 'Done', message, buttons: ['OK'] });
    await alert.present();
  }

  submitFeedback() {
    if (!this.feedback.trim()) return;
    this.auth.submitMemberFeedback(this.feedback).subscribe({
      next: () => { this.confirm('Thank you. Your feedback was submitted.'); this.feedback = ''; },
      error: error => this.confirm(error?.error?.message || 'We could not submit your feedback.')
    });
  }

  markAllNotificationsRead() {
    this.auth.markAllNotificationsRead().subscribe({
      next: () => { this.loyalty.notifications = this.loyalty.notifications.map(item => ({ ...item, unread: false })); this.confirm('All notifications were marked as read.'); },
      error: error => this.confirm(error?.error?.message || 'Unable to update notifications.')
    });
  }

  openDirections(outlet: { name: string; address: string }) {
    const query = encodeURIComponent(outlet.address || outlet.name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  }

  requestEmailVerification() {
    this.auth.requestEmailVerification().subscribe({
      next: result => { this.emailRequested = true; this.emailOtpHint = result?.OTP || ''; this.confirm(result?.OTP ? `Verification code: ${result.OTP}` : 'A verification code was sent to your registered email.'); },
      error: error => this.confirm(error?.error?.message || 'Unable to send the verification email.')
    });
  }

  confirmEmailVerification() {
    if (!/^\d{4,10}$/.test(this.emailOtp)) return;
    this.auth.confirmEmailVerification(this.emailOtp).subscribe({
      next: () => { this.loyalty.member.emailVerified = true; this.confirm('Your email is verified.'); },
      error: error => this.confirm(error?.error?.message || 'The verification code is invalid.')
    });
  }

  async deactivateAccount() {
    const alert = await this.alerts.create({
      header: 'Deactivate account?',
      message: 'You will be signed out and the loyalty account will become inactive.',
      buttons: ['Cancel', { text: 'Deactivate', role: 'destructive', handler: () => this.auth.deactivateAccount().subscribe({
        next: () => { localStorage.removeItem('auth_token'); localStorage.removeItem('member_phone'); this.loyalty.clearMember(); this.router.navigateByUrl('/choice', { replaceUrl: true }); },
        error: error => this.confirm(error?.error?.message || 'Unable to deactivate the account.')
      }) }]
    });
    await alert.present();
  }
  saveProfile() {
    this.auth.updateMemberProfile(this.profile).subscribe({
      next: result => { this.loyalty.applyMember(result?.member || { Name: this.profile.name, Email: this.profile.email, PhoneNumber: this.profile.phone }); this.confirm('Your profile changes were saved.'); },
      error: error => this.confirm(error?.error?.message || 'We could not save your profile changes.')
    });
  }
  resetPassword() {
    if (!this.contactValue.trim()) { return; }
    this.auth.requestPasswordReset(this.contactValue).subscribe({
      next: result => {
        this.resetRequested = true;
        this.resetOtpHint = result?.OTP || '';
        this.confirm(result?.OTP ? `Verification code: ${result.OTP}` : 'A reset verification code was sent to your phone number.');
      },
      error: () => this.confirm('We could not request a reset code. Please verify the phone number and try again.')
    });
  }
  confirmPasswordReset() {
    if (!/^\d{6}$/.test(this.resetOtp) || this.resetPasswordValue.length < 8) {
      this.confirm('Enter the six-digit code and a new password of at least 8 characters.');
      return;
    }
    this.auth.confirmPasswordReset(this.contactValue, this.resetOtp, this.resetPasswordValue).subscribe({
      next: () => this.confirm('Your password has been reset. You can now sign in with the new password.'),
      error: error => this.confirm(error?.error?.message || 'We could not reset your password.')
    });
  }
}
