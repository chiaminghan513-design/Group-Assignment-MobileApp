import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiBaseUrl;
  private useMock = false;
  private readonly deviceId = this.getDeviceId();

  constructor(private http: HttpClient) {}

  // ==========================================
  // PATH A: SIGN UP (NEW MEMBER)
  // ==========================================

  // 1. Check optional referral code
  checkReferralCode(referralCode: string): Observable<any> {
    if (this.useMock) {
      console.log('[MOCK] Checking referral code:', referralCode);
      return of({ valid: true, message: 'Valid referral code' }).pipe(delay(400));
    }
    return this.http.post(`${this.apiUrl}/member/referral/check`, { referralCode });
  }

  // 2. Request OTP for registration
  registerOtp(phoneNumber: string, deviceId = this.deviceId): Observable<any> {
    if (this.useMock) {
      console.log('[MOCK] Sending Sign-Up OTP to:', phoneNumber);
      return of({ success: true, otpCode: '123456' }).pipe(delay(400));
    }
    return this.http.post(`${this.apiUrl}/auth/register-otp`, { phoneNumber, deviceId });
  }

  // 3. Finalize registration after code verification
  registerMember(payload: any): Observable<any> {
    if (this.useMock) {
      console.log('[MOCK] Creating account...');
      return of({ success: true, token: 'mock-signup-token-xyz' }).pipe(delay(400));
    }
    return this.http.post(`${this.apiUrl}/auth/register`, {
      name: payload.Name, email: payload.Email, phoneNumber: payload.PhoneNumber,
      referralBy: payload.ReferralBy, password: payload.Password, birthday: payload.Birthday
    });
  }

  // ==========================================
  // PATH B: LOG IN (RETURNING MEMBER)
  // ==========================================

  // 1. Request OTP for login
  requestOtp(phoneNumber: string, deviceId = this.deviceId): Observable<any> {
    if (this.useMock) {
      console.log('[MOCK] Requesting Login OTP for:', phoneNumber);
      return of({ success: true, otpCode: '654321' }).pipe(delay(400));
    }
    return this.http.post(`${this.apiUrl}/auth/request-otp`, { phoneNumber, deviceId });
  }

  // 2. Verify login code and get profile
  loginVerify(phoneNumber: string, code: string, firstLogin = 'True', accountStatus = ''): Observable<any> {
    if (this.useMock) {
      console.log('[MOCK] Verifying login code...');
      return of({ success: true, token: 'mock-login-token-abc' }).pipe(delay(400));
    }
    return this.http.post(`${this.apiUrl}/auth/login/phone`, { phoneNumber, otp: code, firstLogin, accountStatus, deviceId: this.deviceId });
  }

  checkRegistrationAvailability(phoneNumber: string, email: string): Observable<{ phoneAvailable: boolean; emailAvailable: boolean }> {
    return this.http.post<{ phoneAvailable: boolean; emailAvailable: boolean }>(`${this.apiUrl}/member/availability`, { phoneNumber, email });
  }

  loginWithEmail(email: string, password: string): Observable<any> {
    if (this.useMock) {
      console.log('[MOCK] Signing in with email:', email);
      return of({ success: true, token: 'mock-email-token-abc' }).pipe(delay(400));
    }
    return this.http.post(`${this.apiUrl}/auth/login/email`, { email, password });
  }

  requestPasswordReset(phoneNumber: string): Observable<any> {
    if (this.useMock) { return of({ success: true, otpCode: '123456' }).pipe(delay(400)); }
    return this.http.post(`${this.apiUrl}/auth/request-otp`, { phoneNumber, deviceId: this.deviceId });
  }

  // ==========================================
  // SHARED CONVERGENCE: LOAD MEMBER DETAILS
  // ==========================================
  
  // Fetches loyalty tier, points, balance, and stamps
  getMemberDetails(phoneNumber = localStorage.getItem('member_phone') || ''): Observable<any> {
    if (this.useMock) {
      console.log('[MOCK] Fetching member details...');
      return of({
        tier: 'Gold',
        points: 1250,
        balance: 45.50,
        stamps: 3
      }).pipe(delay(400));
    }
    const token = localStorage.getItem('auth_token') || '';
    return this.http.get(`${this.apiUrl}/members/${encodeURIComponent(phoneNumber)}/dashboard`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
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
