import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-signup',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  phoneNumber: string = '';
  referralCode: string = '';
  name = '';
  email = '';
  password = '';
  birthday = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  onRegister() {
    if (this.name.trim().length < 2) { this.showError({ error: { message: 'Enter your full name.' } }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) { this.showError({ error: { message: 'Enter a valid email address.' } }); return; }
    if (!/^\+?\d{8,15}$/.test(this.phoneNumber.trim())) { this.showError({ error: { message: 'Enter a valid phone number.' } }); return; }
    if (this.password.length < 8) { this.showError({ error: { message: 'Use a password with at least 8 characters.' } }); return; }
    if (this.birthday && new Date(this.birthday) > new Date()) { this.showError({ error: { message: 'Birthday cannot be in the future.' } }); return; }
    this.authService.checkRegistrationAvailability(this.phoneNumber, this.email).subscribe({
      next: (availability) => {
        if (!availability.phoneAvailable || !availability.emailAvailable) {
          const duplicate = !availability.phoneAvailable && !availability.emailAvailable ? 'phone number and email' : (!availability.phoneAvailable ? 'phone number' : 'email');
          this.showError({ error: { message: `An account with this ${duplicate} already exists. Please use different details or sign in.` } });
          return;
        }
        this.continueRegistration();
      },
      error: (err) => this.showError(err)
    });
  }

  private continueRegistration() {
    // Check the optional referral before sending the registration OTP.
    if (this.referralCode) {
      this.authService.checkReferralCode(this.referralCode).subscribe({
        next: (refRes: any) => {
          console.log('Referral valid:', refRes);
          this.triggerRegisterOtp();
        },
        error: (err) => {
          console.error('Invalid referral code', err);
          // You can show a toast or alert for invalid referral here if needed
        }
      });
    } else {
      // If no referral code, proceed straight to registration OTP
      this.triggerRegisterOtp();
    }
  }

  triggerRegisterOtp() {
    this.authService.registerOtp(this.phoneNumber).subscribe({
      next: async (res: any) => {
        console.log('Signup OTP requested:', res);

        const toast = await this.toastController.create({
          message: res?.OTP ? `Verification code: ${res.OTP}` : 'A verification code has been sent to your phone number.',
          duration: 5000,
          position: 'top',
          color: 'dark'
        });
        await toast.present();

        // Navigate to verify page, passing phone, referral, and mode='signup'
        this.router.navigate(['/verify-code'], { 
          queryParams: { 
            phone: this.phoneNumber, 
            referral: this.referralCode, 
            name: this.name,
            email: this.email,
            password: this.password,
            birthday: this.birthday,
            mode: 'signup',
            otpHint: res?.OTP || ''
          } 
        });
      },
      error: (err) => {
        console.error('Failed to request signup OTP', err);
        this.showError(err);
      }
    });
  }

  private async showError(err: any) {
    const toast = await this.toastController.create({
      message: err?.error?.message || 'We could not send a verification code. Please try again.',
      duration: 5000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  }
}
