import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/apiservice'; // Adjust path to your service

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
  standalone: false,
})
export class LoadingPage implements OnInit {

  constructor(private router: Router, private apiService: ApiService) { }

  async ngOnInit() {
    try {
      // A connected build should check ManageVersion/GetAllVersion here.
      // Use the saved session while this project is running in mock-data mode.
      const sessionActive = !!localStorage.getItem('auth_token');

      if (sessionActive) {
        // If logged in, go straight to the Dashboard (Home)
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      } else {
        // If not logged in, go to the Choice screen (Login/Register)
        this.router.navigateByUrl('/choice', { replaceUrl: true });
      }
      
    } catch (error) {
      // Fallback if backend or API fails: route to choice screen
      console.error('Startup check failed', error);
      this.router.navigateByUrl('/choice', { replaceUrl: true });
    }
  }

}
