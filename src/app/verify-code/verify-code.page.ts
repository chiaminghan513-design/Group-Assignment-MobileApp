import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { LoyaltyDataService } from '../services/loyalty-data.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.page.html',
  styleUrls: ['./verify-code.page.scss'],
  standalone: false
})
export class VerifyCodePage implements OnInit {
  phoneNumber: string = '';
  mode: string = '';
  otpCode: string = '';
  referralCode: string = '';
  firstLogin: string = 'True';
  accountStatus: string = '';
  otpHint: string = '';
  signup = { name: '', email: '', password: '', birthday: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loyalty: LoyaltyDataService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Grab phone number and mode ('login' or 'signup') passed from previous page
    this.route.queryParams.subscribe(params => {
      this.phoneNumber = params['phone'] || '';
      this.mode = params['mode'] || 'login';
      this.referralCode = params['referral'] || '';
      this.firstLogin = params['firstLogin'] || 'True';
      this.accountStatus = params['accountStatus'] || '';
      this.otpHint = params['otpHint'] || '';
      this.signup = { name: params['name'] || '', email: params['email'] || '', password: params['password'] || '', birthday: params['birthday'] || '' };
    });
  }

  onVerifyCode() {
    if (!/^\d{6}$/.test(this.otpCode)) { this.showError('Enter the complete six-digit verification code.'); return; }
    if (this.mode === 'login') {
      // Call backend login verification endpoint
      this.authService.loginVerify(this.phoneNumber, this.otpCode, this.firstLogin, this.accountStatus).subscribe({
        next: (res: any) => {
          console.log('Login verified successfully:', res);
          
          // Save session token
          localStorage.setItem('auth_token', res.sessionToken || res.token || '');
          localStorage.setItem('member_phone', this.phoneNumber);
          this.loyalty.applyMember(res.member || res);

          // Fetch member details before routing to home
          this.loadMemberDetailsAndRedirect();
        },
        error: (err) => {
          console.error('Invalid verification code', err); this.showError(err?.error?.message || 'The verification code could not be accepted.');
        }
      });
    } else {
      this.authService.registerMember({
        Name: this.signup.name, Email: this.signup.email, PhoneNumber: this.phoneNumber,
        ReferralBy: this.referralCode, Password: this.signup.password, Birthday: this.signup.birthday,
        EmailSubcribe: 'true', Image: '', ImageByte: ''
      }).subscribe({
        next: (res: any) => {
          localStorage.setItem('auth_token', res.sessionToken || res.token || '');
          localStorage.setItem('member_phone', this.phoneNumber);
          this.loyalty.applyMember(res.member || { Name: this.signup.name, Email: this.signup.email, PhoneNumber: this.phoneNumber });
          this.loadMemberDetailsAndRedirect();
        },
        error: (err) => { console.error('Could not create the account', err); this.showError(err?.error?.message || 'We could not create the account.'); }
      });
    }
  }

  loadMemberDetailsAndRedirect() {
    this.authService.getMemberDetails().subscribe({
      next: (details) => {
        console.log('Member details loaded:', details);
        // Save details locally if needed, then navigate to dashboard
        localStorage.setItem('member_profile', JSON.stringify(details));
        this.loyalty.applyMember(details);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Failed to load member details', err);
        this.router.navigate(['/dashboard']); // Route anyway as fallback
      }
    });
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({ message, color: 'danger', duration: 4500, position: 'top' });
    await toast.present();
  }
}
