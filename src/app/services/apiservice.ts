import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = Capacitor.isNativePlatform() ? environment.nativeApiBaseUrl : environment.apiBaseUrl;

  checkVersion(): Observable<any> { return this.get('/app/versions'); }
  keepLoginUser(phoneNumber: string, deviceId: string): Observable<any> { return this.post('/auth/keep-login', { phoneNumber, deviceId }); }

  private get(path: string): Observable<any> {
    return from(fetch(`${this.baseUrl}${path}`).then(async response => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw { status: response.status, statusText: response.statusText, error: payload };
      return payload;
    }));
  }

  private post(path: string, body: unknown): Observable<any> {
    return from(fetch(`${this.baseUrl}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(async response => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw { status: response.status, statusText: response.statusText, error: payload };
      return payload;
    }));
  }
}
