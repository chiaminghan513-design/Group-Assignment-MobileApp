import { Injectable } from '@angular/core';
import { Observable, from, forkJoin, of, catchError, map } from 'rxjs';
import { reconcileMemberHistory } from './member-history';
import { environment } from '../../environments/environment';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = Capacitor.isNativePlatform() ? environment.nativeApiBaseUrl : environment.apiBaseUrl;
  private readonly deviceId = this.getDeviceId();
  private pendingRegistration: { name: string; email: string; password: string; birthday: string; referralCode: string; phoneNumber: string } | null = null;

  setPendingRegistration(value: { name: string; email: string; password: string; birthday: string; referralCode: string; phoneNumber: string }) {
    this.pendingRegistration = { ...value };
  }

  takePendingRegistration() {
    const value = this.pendingRegistration;
    this.pendingRegistration = null;
    return value;
  }

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

  updatePushDeviceId(deviceId: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/device`, { deviceId });
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
    const path = `/members/${encodeURIComponent(phoneNumber)}/history/`;
    const history = this.get(path + encodeURIComponent(type));
    if (!['all', 'payments', 'points'].includes(type)) return history;
    return forkJoin({ history, spends: this.get(path + 'spends').pipe(catchError(() => of([]))) })
      .pipe(map(result => reconcileMemberHistory(result.history, result.spends, type)));
  }

  getTopUpDetails(topupId: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.get(`/members/${encodeURIComponent(phoneNumber)}/topups/${encodeURIComponent(topupId)}`);
  }

  getNotification(notificationId: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.get(`/members/${encodeURIComponent(phoneNumber)}/notifications/${encodeURIComponent(notificationId)}`);
  }

  getNotifications(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.get(`/members/${encodeURIComponent(phoneNumber)}/notifications`);
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

  addAddress(address: { address: string; latitude: number; longitude: number; receiverPhone: string; receiverName: string }, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/addresses`, address);
  }

  updateAddress(addressId: string, address: { address: string; latitude: number; longitude: number; receiverPhone: string; receiverName: string; isDefault: boolean }, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.post(`/members/${encodeURIComponent(phoneNumber)}/addresses/${encodeURIComponent(addressId)}`, address);
  }

  deleteAddress(addressId: string, phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    return this.request(`/members/${encodeURIComponent(phoneNumber)}/addresses/${encodeURIComponent(addressId)}`, {
      method: 'DELETE', headers: this.authorizationHeaders()
    });
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    const token = localStorage.getItem('auth_token') || '';
    return this.request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  }

  private get<T>(path: string): Observable<T> {
    return this.request<T>(path, { headers: this.authorizationHeaders() });
  }

  private authorizationHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private request<T>(path: string, options: RequestInit = {}): Observable<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    return from(fetch(`${this.apiUrl}${path}`, { ...options, signal: options.signal || controller.signal })
      .then(async response => {
        const payload = response.status === 204 ? null : await response.json().catch(() => null);
        if (!response.ok) throw { status: response.status, statusText: response.statusText, error: payload };
        return payload as T;
      })
      .finally(() => clearTimeout(timeout)));
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
