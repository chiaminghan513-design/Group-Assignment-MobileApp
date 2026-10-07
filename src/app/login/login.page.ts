import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth';
import { LoyaltyDataService } from '../services/loyalty-data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  loginMethod: 'phone' | 'email' = 'phone';
  phoneNumber: string = '';
  email: string = '';
  password: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loyalty: LoyaltyDataService
  ) {}

  onRequestOtp() {
    if (!this.isValidPhone(this.phoneNumber)) { this.showError({ error: { message: 'Enter a valid phone number before requesting a code.' } }); return; }
    this.authService.requestOtp(this.phoneNumber).subscribe({
      next: async (res: any) => {
        console.log('Login OTP requested:', res);

        const toast = await this.toastController.create({
          message: res?.OTP ? `Verification code: ${res.OTP}` : 'A verification code has been sent to your phone number.',
          duration: 5000,
          position: 'top',
          color: 'dark'
        });
        await toast.present();

        // Navigate to the verify code page, passing the phone number
        this.router.navigate(['/verify-code'], {
          queryParams: {
            phone: this.phoneNumber,
            mode: 'login',
            firstLogin: res?.FirstLogin ?? 'True',
            accountStatus: res?.AccountStatus ?? '',
            otpHint: res?.OTP || ''
          }
        });
      },
      error: (err) => {
        console.error('Failed to request login OTP', err);
        this.showError(err);
      }
    });
  }

  onEmailLogin() {
    if (!this.email.trim() || !this.password) { return; }
    this.authService.loginWithEmail(this.email, this.password).subscribe({
      next: (res: any) => {
        const member = Array.isArray(res?.member) ? res.member[0] : (res?.member || res);
        const phoneNumber = member?.PhoneNumber || member?.phoneNumber || '';
        if (!phoneNumber) {
          this.showError({ error: { message: 'We found your account, but it is missing a phone number. Please ask an Eduvo team member for help.' } });
          return;
        }
        localStorage.setItem('auth_token', res.sessionToken || res.token || '');
        localStorage.setItem('member_phone', phoneNumber);
        this.loyalty.applyMember(member);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => { console.error('Email sign-in failed', err); this.showError(err); }
    });
  }

  private async showError(err: any) {
    const toast = await this.toastController.create({
      message: err?.error?.message || 'We could not complete that request. Please try again.',
      duration: 5000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  }

  private isValidPhone(value: string) { return /^\+?\d{8,15}$/.test(value.trim()); }
}
