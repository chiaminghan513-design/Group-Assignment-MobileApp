import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  checkVersion(): Observable<any> { return this.get('/health'); }
  keepLoginUser(): Observable<any> { return this.get('/health'); }

  private get(path: string): Observable<any> {
    return from(fetch(`${this.baseUrl}${path}`).then(async response => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw { status: response.status, statusText: response.statusText, error: payload };
      return payload;
    }));
  }
}
