import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // 1. Check version on launch
  checkVersion(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  // 2. Check if user session is preserved (Mobile specific)
  keepLoginUser(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }
}
