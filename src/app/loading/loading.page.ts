import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
  standalone: false,
})
export class LoadingPage implements OnInit {

  constructor(private router: Router, private auth: AuthService) { }

  async ngOnInit() {
    try {
      this.auth.getVersions().subscribe({
        next: versions => { sessionStorage.setItem('loyalty_app_versions', JSON.stringify(versions)); this.router.navigateByUrl('/choice', { replaceUrl: true }); },
        error: () => this.router.navigateByUrl('/choice', { replaceUrl: true })
      });
      
    } catch (error) {
      // Fallback if backend or API fails: route to choice screen
      console.error('Startup check failed', error);
      this.router.navigateByUrl('/choice', { replaceUrl: true });
    }
  }

}
