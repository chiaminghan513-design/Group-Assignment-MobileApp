import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ToastController } from '@ionic/angular/lazy';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { AuthService } from '../services/auth';
import QRCode from 'qrcode';

type Feature = 'qr' | 'my-rewards' | 'vouchers' | 'notifications' | 'notification-details' | 'reward-details' | 'topup-details' | 'stores' | 'feedback' | 'forgot-password' | 'edit-profile' | 'referrals' | 'verify-email' | 'deactivate-account' | 'addresses' | 'ordering';

@Component({
  selector: 'app-member-feature',
  templateUrl: './member-feature.page.html',
  styleUrls: ['./member-feature.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class MemberFeaturePage implements OnInit, OnDestroy {
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
  detailPreview = false;
  emailOtp = '';
  emailOtpHint = '';
  emailRequested = false;
  addressForm = { id: '', address: '', receiverName: '', receiverPhone: '', latitude: 0, longitude: 0, isDefault: false };
  locating = false;
  notificationLoading = false;
  notificationError = '';
  private notificationRequest?: Subscription;
  private qrPageActive = false;
  private destroyed = false;
  private qrGeneration = 0;
  private qrRenewal?: ReturnType<typeof setTimeout>;
  private qrRequest?: Subscription;
  private appStateListener?: PluginListenerHandle;

  constructor(private route: ActivatedRoute, private router: Router, public loyalty: LoyaltyDataService, private alerts: AlertController, private auth: AuthService, private changeDetector: ChangeDetectorRef, private toasts: ToastController) {}

  ngOnInit() {
    this.feature = (this.route.snapshot.data['feature'] || 'qr') as Feature;
    this.title = ({ qr: 'Member QR', 'my-rewards': 'My rewards', vouchers: 'My vouchers', notifications: 'Notifications', 'notification-details': 'Notification', 'reward-details': 'Reward details', 'topup-details': 'Top-up details', stores: 'Stores', feedback: 'Feedback', 'forgot-password': 'Reset password', 'edit-profile': 'Edit profile', referrals: 'Referrals', 'verify-email': 'Verify email', 'deactivate-account': 'Deactivate account', addresses: 'Delivery addresses', ordering: 'Order ahead' })[this.feature];
    this.profile.name = this.loyalty.member.name;
    this.profile.email = this.loyalty.member.email;
    this.profile.phone = this.loyalty.member.phoneNumber;
    this.profile.birthday = this.loyalty.member.birthDate;
    this.profile.imageByte = this.loyalty.member.image;
    if (this.feature === 'qr') {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (!this.qrPageActive) return;
        if (isActive) this.loadMemberQr();
        else this.clearMemberQr();
      }).then(listener => {
        if (this.destroyed) void listener.remove();
        else this.appStateListener = listener;
      });
    }
    this.detailId = this.route.snapshot.queryParamMap.get('id') || '';
    this.detailVoucher = this.route.snapshot.queryParamMap.get('kind') === 'voucher';
    this.detailPreview = this.route.snapshot.queryParamMap.get('preview') === 'true';
    if (this.feature === 'reward-details' && this.detailId) this.loadRewardDetails();
    if (this.feature === 'topup-details' && this.detailId) this.loadTopUpDetails();
    if (this.feature === 'notification-details' && this.detailId) this.loadNotification();
  }

  ionViewWillEnter() {
    if (this.feature === 'notifications') this.loadNotifications();
    if (this.feature !== 'qr') return;
    this.qrPageActive = true;
    this.loadMemberQr();
  }

  ionViewWillLeave() {
    this.notificationRequest?.unsubscribe();
    if (this.feature !== 'qr') return;
    this.qrPageActive = false;
    this.clearMemberQr();
  }

  ngOnDestroy() {
    this.notificationRequest?.unsubscribe();
    this.destroyed = true;
    this.qrPageActive = false;
    this.clearMemberQr();
    void this.appStateListener?.remove();
  }

  private clearMemberQr() {
    this.qrGeneration++;
    clearTimeout(this.qrRenewal);
    this.qrRequest?.unsubscribe();
    this.qrDataUrl = '';
    this.qrError = '';
  }

  private loadTopUpDetails() {
    this.auth.getTopUpDetails(this.detailId).subscribe({
      next: result => this.detail = Array.isArray(result) ? result[0] : result,
      error: error => this.confirm(error?.error?.message || 'Unable to load this top-up record.')
    });
  }

  private loadRewardDetails() {
    if (this.detailPreview) {
      const offer = this.loyalty.rewards.find(item => item.id === this.detailId);
      if (offer) {
        this.detail = {
          Name: offer.name,
          Description: offer.description,
          Point: offer.points,
          Category: offer.category
        };
        return;
      }
    }
    this.auth.getRewardDetails(this.detailId, this.detailVoucher).subscribe({
      next: result => {
        this.detail = Array.isArray(result) ? result[0] : result;
        if (!this.detailPreview) this.showRewardCode();
      },
      error: error => this.confirm(error?.error?.message || 'Unable to load this item.')
    });
  }

  showRewardCode() {
    const pointCost = Number(this.detail?.Point || 0);
    if (this.detailPreview && this.loyalty.member.points < pointCost) return;
    this.qrError = '';
    this.auth.getRewardQr(this.detailId, this.detailVoucher).subscribe({
      next: qr => this.renderRewardQr(qr.qrToken),
      error: error => {
        this.qrError = error?.error?.message || 'Unable to create the redemption QR.';
        this.changeDetector.detectChanges();
      }
    });
  }

  get rewardPointCost() { return Number(this.detail?.Point || 0); }
  get rewardPointsNeeded() { return Math.max(0, this.rewardPointCost - this.loyalty.member.points); }

  private renderRewardQr(token: string) {
    const payload = JSON.stringify({ t: 'R', p: this.loyalty.member.phoneNumber, r: this.detailId, k: this.detailVoucher ? 'v' : 'r', v: token });
    QRCode.toDataURL(payload, { width: 360, margin: 4, errorCorrectionLevel: 'L', color: { dark: '#141615', light: '#ffffff' } })
      .then(url => { this.qrDataUrl = url; this.changeDetector.detectChanges(); })
      .catch(() => { this.qrError = 'Unable to render the redemption QR.'; this.changeDetector.detectChanges(); });
  }

  private loadNotification() {
    this.auth.getNotification(this.detailId).subscribe({
      next: result => {
        this.detail = Array.isArray(result) ? result[0] : result;
        this.changeDetector.detectChanges();
        this.auth.markNotificationRead(this.detailId).subscribe({
          next: () => { this.loyalty.notifications = this.loyalty.notifications.map(item => item.id === this.detailId ? { ...item, unread: false } : item); this.changeDetector.detectChanges(); },
          error: () => { this.notificationError = 'The message opened, but its read status could not be saved.'; this.changeDetector.detectChanges(); }
        });
      },
      error: error => this.confirm(error?.error?.message || 'Unable to load this notification.')
    });
  }

  loadNotifications() {
    this.notificationRequest?.unsubscribe();
    this.notificationLoading = true;
    this.notificationError = '';
    this.notificationRequest = this.auth.getNotifications().subscribe({
      next: result => { this.loyalty.setNotifications(result); this.notificationLoading = false; this.changeDetector.detectChanges(); },
      error: () => { this.notificationLoading = false; this.notificationError = 'Your latest messages could not be loaded. Please try again.'; this.changeDetector.detectChanges(); }
    });
  }

  private loadMemberQr() {
    this.clearMemberQr();
    const generation = this.qrGeneration;
    this.changeDetector.detectChanges();
    this.qrRequest = this.auth.getMemberQr().subscribe({
      next: ({ qrToken, expiresInSeconds }) => {
        if (generation !== this.qrGeneration || !this.qrPageActive) return;
        // Renew with a safety margin before the server's advertised expiry.
        const renewalMs = Math.max(1000, (expiresInSeconds - 75) * 1000);
        this.qrRenewal = setTimeout(() => this.loadMemberQr(), renewalMs);
        QRCode.toDataURL(qrToken, {
          width: 420, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#141615', light: '#ffffff' }
        }).then(url => {
          if (generation !== this.qrGeneration || !this.qrPageActive) return;
          this.qrDataUrl = url;
          this.changeDetector.detectChanges();
        }).catch(() => {
          if (generation !== this.qrGeneration || !this.qrPageActive) return;
          this.qrError = 'Unable to render your member QR code.';
          this.changeDetector.detectChanges();
        });
      },
      error: error => {
        if (generation !== this.qrGeneration || !this.qrPageActive) return;
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

  async confirm(message: string, color = 'warning') {
    if (message.startsWith('Verification code:')) {
      const alert = await this.alerts.create({ header: 'Verification code', message, buttons: ['OK'] });
      await alert.present();
      return;
    }
    const toast = await this.toasts.create({ message, color, position: 'top', duration: 4500, buttons: [{ text: 'Dismiss', role: 'cancel' }] });
    await toast.present();
  }

  submitFeedback() {
    if (!this.feedback.trim()) {
      this.confirm('Tell us about your visit before sending feedback.');
      return;
    }
    this.auth.submitMemberFeedback(this.feedback).subscribe({
      next: () => { this.confirm('Thank you. Your feedback was submitted.', 'success'); this.feedback = ''; },
      error: error => this.confirm(error?.error?.message || 'We could not submit your feedback.')
    });
  }

  markAllNotificationsRead() {
    this.auth.markAllNotificationsRead().subscribe({
      next: () => { this.loyalty.notifications = this.loyalty.notifications.map(item => ({ ...item, unread: false })); this.changeDetector.detectChanges(); this.confirm('All notifications were marked as read.', 'success'); },
      error: error => this.confirm(error?.error?.message || 'Unable to update notifications.')
    });
  }

  openDirections(outlet: { name: string; address: string }) {
    const destination = encodeURIComponent(outlet.address || outlet.name);
    if (!navigator.geolocation) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank', 'noopener,noreferrer');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`, '_blank', 'noopener,noreferrer');
      },
      () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank', 'noopener,noreferrer'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async shareReferral() {
    const code = this.loyalty.member.referralCode;
    if (!code) return;
    const shareData = { title: 'Join Eduvo Rewards', text: `Join Eduvo Rewards with my referral code: ${code}` };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* The member may cancel the share sheet. */ }
    }
    await navigator.clipboard?.writeText(code);
    await this.confirm('Referral code copied. You can paste it into any messaging app.', 'success');
  }

  editAddress(address: { id: string; detail: string; receiverName: string; receiverPhone: string; latitude: number; longitude: number; isDefault: boolean }) {
    this.addressForm = { id: address.id, address: address.detail, receiverName: address.receiverName, receiverPhone: address.receiverPhone, latitude: address.latitude, longitude: address.longitude, isDefault: address.isDefault };
  }

  clearAddressForm() {
    this.addressForm = { id: '', address: '', receiverName: '', receiverPhone: '', latitude: 0, longitude: 0, isDefault: false };
  }

  useCurrentLocation() {
    if (!navigator.geolocation || this.locating) return;
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      position => {
        this.addressForm.latitude = position.coords.latitude;
        this.addressForm.longitude = position.coords.longitude;
        this.locating = false;
        this.changeDetector.detectChanges();
      },
      () => { this.locating = false; this.confirm('Location permission was not granted. You can still enter the address manually.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  saveAddress() {
    if (!this.addressForm.address.trim() || !this.addressForm.receiverName.trim() || !/^\+?\d{8,15}$/.test(this.addressForm.receiverPhone.trim())) {
      this.confirm('Enter the delivery address, receiver name, and a valid receiver phone number.');
      return;
    }
    const payload = { address: this.addressForm.address.trim(), receiverName: this.addressForm.receiverName.trim(), receiverPhone: this.addressForm.receiverPhone.trim(), latitude: this.addressForm.latitude, longitude: this.addressForm.longitude, isDefault: this.addressForm.isDefault };
    const request = this.addressForm.id ? this.auth.updateAddress(this.addressForm.id, payload) : this.auth.addAddress(payload);
    request.subscribe({
      next: () => { this.clearAddressForm(); this.refreshDashboard('Delivery address saved.'); },
      error: error => this.confirm(error?.error?.message || 'Unable to save this delivery address.')
    });
  }

  async deleteAddress(addressId: string) {
    const alert = await this.alerts.create({
      header: 'Delete address?', message: 'This delivery address will be removed from your account.',
      buttons: ['Cancel', { text: 'Delete', role: 'destructive', handler: () => this.auth.deleteAddress(addressId).subscribe({
        next: () => this.refreshDashboard('Delivery address deleted.'),
        error: error => this.confirm(error?.error?.message || 'Unable to delete this delivery address.')
      }) }]
    });
    await alert.present();
  }

  private refreshDashboard(message?: string) {
    this.auth.getMemberDetails().subscribe({
      next: data => { this.loyalty.applyDashboard(data); if (message) this.confirm(message, 'success'); },
      error: error => this.confirm(error?.error?.message || 'The latest account information could not be loaded.')
    });
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
      next: () => { this.loyalty.member.emailVerified = true; this.confirm('Your email is verified.', 'success'); },
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
    const name = this.profile.name.trim();
    const email = this.profile.email.trim();
    if (name.length < 2) {
      this.confirm('Enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.confirm('Enter a valid email address.');
      return;
    }
    if (this.profile.birthday && new Date(this.profile.birthday) > new Date()) {
      this.confirm('Birthday cannot be in the future.');
      return;
    }
    this.profile = { ...this.profile, name, email };
    this.auth.updateMemberProfile(this.profile).subscribe({
      next: result => { this.loyalty.applyMember(result?.member || { Name: this.profile.name, Email: this.profile.email, PhoneNumber: this.profile.phone }); this.confirm('Your profile changes were saved.', 'success'); },
      error: error => this.confirm(error?.error?.message || 'We could not save your profile changes.')
    });
  }
  resetPassword() {
    const phoneNumber = this.contactValue.trim();
    if (!/^\+?\d{8,15}$/.test(phoneNumber)) {
      this.confirm('Enter a valid phone number before requesting a reset code.');
      return;
    }
    this.auth.requestPasswordReset(phoneNumber).subscribe({
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
      next: () => this.confirm('Your password has been reset. You can now sign in with the new password.', 'success'),
      error: error => this.confirm(error?.error?.message || 'We could not reset your password.')
    });
  }
}
