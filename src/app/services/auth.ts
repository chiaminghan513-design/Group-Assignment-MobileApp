import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiBaseUrl;
  private useMock = false;
  private readonly deviceId = this.getDeviceId();

  checkReferralCode(referralCode: string): Observable<any> {
    if (this.useMock) return of({ valid: true, message: 'Valid referral code' }).pipe(delay(400));
    return this.post('/member/referral/check', { referralCode });
  }

  registerOtp(phoneNumber: string, deviceId = this.deviceId): Observable<any> {
    if (this.useMock) return of({ success: true, otpCode: '123456' }).pipe(delay(400));
    return this.post('/auth/register-otp', { phoneNumber, deviceId });
  }

  registerMember(payload: any): Observable<any> {
    if (this.useMock) return of({ success: true, token: 'mock-signup-token-xyz' }).pipe(delay(400));
    return this.post('/auth/register', {
      name: payload.Name, email: payload.Email, phoneNumber: payload.PhoneNumber,
      referralBy: payload.ReferralBy, password: payload.Password, birthday: payload.Birthday
    });
  }

  requestOtp(phoneNumber: string, deviceId = this.deviceId): Observable<any> {
    if (this.useMock) return of({ success: true, otpCode: '654321' }).pipe(delay(400));
    return this.post('/auth/request-otp', { phoneNumber, deviceId });
  }

  loginVerify(phoneNumber: string, code: string, firstLogin = 'True', accountStatus = ''): Observable<any> {
    if (this.useMock) return of({ success: true, token: 'mock-login-token-abc' }).pipe(delay(400));
    return this.post('/auth/login/phone', { phoneNumber, otp: code, firstLogin, accountStatus, deviceId: this.deviceId });
  }

  checkRegistrationAvailability(phoneNumber: string, email: string): Observable<{ phoneAvailable: boolean; emailAvailable: boolean }> {
    return this.post('/member/availability', { phoneNumber, email });
  }

  loginWithEmail(email: string, password: string): Observable<any> {
    if (this.useMock) return of({ success: true, token: 'mock-email-token-abc' }).pipe(delay(400));
    return this.post('/auth/login/email', { email, password });
  }

  requestPasswordReset(phoneNumber: string): Observable<any> {
    if (this.useMock) return of({ success: true, otpCode: '123456' }).pipe(delay(400));
    return this.post('/auth/request-otp', { phoneNumber, deviceId: this.deviceId });
  }

  getMemberDetails(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    if (this.useMock) return of({ tier: 'Gold', points: 1250, balance: 45.50, stamps: 3 }).pipe(delay(400));
    const token = localStorage.getItem('auth_token') || '';
    return this.request(`/members/${encodeURIComponent(phoneNumber)}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  private request<T>(path: string, options: RequestInit = {}): Observable<T> {
    return from(fetch(`${this.apiUrl}${path}`, options).then(async response => {
      const payload = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw { status: response.status, statusText: response.statusText, error: payload };
      return payload as T;
    }));
  }

  private getDeviceId(): string {
    const key = 'loyalty_device_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  }
}
