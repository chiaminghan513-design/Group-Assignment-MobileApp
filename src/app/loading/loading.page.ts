import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { AlertController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
  standalone: false,
})
export class LoadingPage implements OnInit {

  constructor(private router: Router, private auth: AuthService, private alerts: AlertController) { }

  async ngOnInit() {
    try {
      this.auth.getVersions().subscribe({
        next: versions => { sessionStorage.setItem('loyalty_app_versions', JSON.stringify(versions)); this.checkForUpdate(versions); },
        error: () => this.router.navigateByUrl('/choice', { replaceUrl: true })
      });
      
    } catch (error) {
      // Fallback if backend or API fails: route to choice screen
      console.error('Startup check failed', error);
      this.router.navigateByUrl('/choice', { replaceUrl: true });
    }
  }

  private async checkForUpdate(value: any) {
    const versions = Array.isArray(value) ? value : (value?.data || value?.items || []);
    const platform = Capacitor.getPlatform();
    const operatingSystem = platform === 'ios' ? 'ios' : 'android';
    const record = versions.find((item: any) => String(item.OperatingSystem || item.Platform || '').toLowerCase() === operatingSystem);
    let installedVersion = environment.appVersion;
    if (Capacitor.isNativePlatform()) {
      try { installedVersion = (await App.getInfo()).version || installedVersion; } catch { /* Use the configured version. */ }
    }
    if (record && this.compareVersions(installedVersion, String(record.BuildNumber || record.Version || '0')) < 0) {
      const forced = ['1', 'true', 'required', 'force'].includes(String(record.Setting || '').toLowerCase());
      const alert = await this.alerts.create({
        header: forced ? 'Update required' : 'Update available',
        message: `Eduvo Rewards ${record.BuildNumber || record.Version} is available. Update the app to receive the latest fixes and features.`,
        backdropDismiss: !forced,
        buttons: forced ? [{ text: 'Close app', handler: () => App.exitApp() }] : ['Continue']
      });
      await alert.present();
      if (forced) return;
    }
    this.router.navigateByUrl('/choice', { replaceUrl: true });
  }

  private compareVersions(left: string, right: string) {
    const a = left.split('.').map(part => Number(part) || 0);
    const b = right.split('.').map(part => Number(part) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
      if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) < (b[index] || 0) ? -1 : 1;
    }
    return 0;
  }

}
