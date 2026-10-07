import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular/lazy';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { LoyaltyDataService } from '../services/loyalty-data.service';

@Component({
  selector: 'app-choice',
  templateUrl: './choice.page.html',
  styleUrls: ['./choice.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ChoicePage implements OnInit {
  savedPhone = localStorage.getItem('member_phone') || '';
  resuming = false;
  constructor(private router: Router, private auth: AuthService, private loyalty: LoyaltyDataService) {}

  ngOnInit() {}

  goToLogin() {
    this.router.navigateByUrl('/login');
  }

  goToRegister() {
    this.router.navigateByUrl('/register');
  }

  continueSession() {
    if (!this.savedPhone || this.resuming) return;
    this.resuming = true;
    this.auth.keepLogin(this.savedPhone).subscribe({
      next: result => {
        localStorage.setItem('auth_token', result.sessionToken || '');
        this.loyalty.applyMember(result.member);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => { this.resuming = false; localStorage.removeItem('auth_token'); }
    });
  }
}
