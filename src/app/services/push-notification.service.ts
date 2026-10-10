import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { AuthService } from './auth';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private initialized = false;

  constructor(private auth: AuthService, private alerts: AlertController, private router: Router) {}

  async initializeForSignedInMember() {
    if (this.initialized || !Capacitor.isNativePlatform() || !localStorage.getItem('auth_token') || !localStorage.getItem('member_phone')) return;
    this.initialized = true;
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.addListener('registration', (token: Token) => {
      if (!token.value) return;
      this.auth.updatePushDeviceId(token.value).subscribe({ next: () => undefined, error: () => undefined });
    });
    await PushNotifications.addListener('pushNotificationReceived', async notification => {
      const alert = await this.alerts.create({
        header: notification.title || 'Eduvo Rewards',
        message: notification.body || 'You have a new loyalty update.',
        buttons: [{ text: 'View', handler: () => this.router.navigateByUrl('/notifications') }, 'Close']
      });
      await alert.present();
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', () => this.router.navigateByUrl('/notifications'));
    await PushNotifications.register();
  }
}
