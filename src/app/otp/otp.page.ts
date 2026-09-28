import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../services/auth'

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: false,
})
export class OTPPage implements OnInit {
phoneNumber: string = '';

  constructor(
    private router: Router,
    private authService: AuthService, // Inject your service here
    private toastController: ToastController
  ) {}

  requestOtp() {
      this.authService.requestOtp(this.phoneNumber).subscribe({
        next: async (res: any) => {
          console.log('OTP sent successfully:', res);

          const toast = await this.toastController.create({
            message: 'A verification code has been sent to your phone number.',
            duration: 5000, // Display for 5 seconds
            position: 'top',
            color: 'dark'
          });
          await toast.present();

          // Navigate to the verify code page and pass the phone number
          this.router.navigate(['/verify-code'], { queryParams: { phone: this.phoneNumber } });
        },
        error: (err) => {
          console.error('Failed to request OTP', err);
        }
      });  
    }
  
  ngOnInit(): void {
    
  }
}
