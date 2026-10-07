import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiBaseUrl;
  private readonly deviceId = this.getDeviceId();

  checkReferralCode(referralCode: string): Observable<any> {
    return this.post('/member/referral/check', { referralCode });
  }

  registerOtp(phoneNumber: string, deviceId = this.deviceId): Observable<any> {
    return this.post('/auth/register-otp', { phoneNumber, deviceId });
  }

  registerMember(payload: any): Observable<any> {
    return this.post('/auth/register', {
      name: payload.Name, email: payload.Email, phoneNumber: payload.PhoneNumber,
      referralBy: payload.ReferralBy, password: payload.Password, birthday: payload.Birthday
    });
  }

  requestOtp(phoneNumber: string, deviceId = this.deviceId): Observable<any> {
    return this.post('/auth/request-otp', { phoneNumber, deviceId });
  }

  loginVerify(phoneNumber: string, code: string, firstLogin = 'True', accountStatus = ''): Observable<any> {
    return this.post('/auth/login/phone', { phoneNumber, otp: code, firstLogin, accountStatus, deviceId: this.deviceId });
  }

  checkRegistrationAvailability(phoneNumber: string, email: string): Observable<{ phoneAvailable: boolean; emailAvailable: boolean }> {
    return this.post('/member/availability', { phoneNumber, email });
  }

  loginWithEmail(email: string, password: string): Observable<any> {
    return this.post('/auth/login/email', { email, password });
  }

  keepLogin(phoneNumber: string): Observable<any> {
    return this.post('/auth/keep-login', { phoneNumber, deviceId: this.deviceId });
  }

  requestPasswordReset(phoneNumber: string): Observable<any> {
    return this.post('/auth/password-reset/request', { phoneNumber, deviceId: this.deviceId });
  }

  confirmPasswordReset(phoneNumber: string, otp: string, newPassword: string): Observable<any> {
    return this.post('/auth/password-reset/confirm', { phoneNumber, otp, newPassword });
  }

  getMemberDetails(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    const token = localStorage.getItem('auth_token') || '';
    return this.request(`/members/${encodeURIComponent(phoneNumber)}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  getMemberQr(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<{ qrToken: string; expiresInSeconds: number }> {
    const token = localStorage.getItem('auth_token') || '';
    return this.request(`/members/${encodeURIComponent(phoneNumber)}/qr`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  getRewardDetails(rewardId: string, voucher = false, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.get(`/members/${encodeURIComponent(phoneNumber)}/rewards/${encodeURIComponent(rewardId)}?kind=${voucher ? 'voucher' : 'reward'}`);
  }

  getRewardQr(rewardId: string, voucher = false, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.get(`/members/${encodeURIComponent(phoneNumber)}/rewards/${encodeURIComponent(rewardId)}/qr?kind=${voucher ? 'voucher' : 'reward'}`);
  }

  getHistory(type: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.get(`/members/${encodeURIComponent(phoneNumber)}/history/${encodeURIComponent(type)}`);
  }

  getNotification(notificationId: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.get(`/members/${encodeURIComponent(phoneNumber)}/notifications/${encodeURIComponent(notificationId)}`);
  }

  markNotificationRead(notificationId: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/notifications/${encodeURIComponent(notificationId)}/read`, {});
  }

  markAllNotificationsRead(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/notifications/read-all`, {});
  }

  requestEmailVerification(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/email-verification/request`, {});
  }

  confirmEmailVerification(otp: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/email-verification/confirm`, { otp });
  }

  deactivateAccount(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/deactivate`, {});
  }

  getVersions(): Observable<any> { return this.get('/app/versions'); }

  updateMemberProfile(profile: { name: string; email: string; birthday?: string; imageByte?: string }, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/profile`, profile);
  }

  submitMemberFeedback(description: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/feedback`, { description });
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    const token = localStorage.getItem('auth_token') || '';
    return this.request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  }

  private get<T>(path: string): Observable<T> {
    const token = localStorage.getItem('auth_token') || '';
    return this.request<T>(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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
