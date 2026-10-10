import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';

describe('Auth', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('keeps pending registration details in memory and consumes them once', () => {
    const registration = { name: 'Test Member', email: 'member@example.com', password: 'safe-password', birthday: '2000-01-01', referralCode: 'REF1', phoneNumber: '+60123456789' };
    service.setPendingRegistration(registration);

    expect(service.takePendingRegistration()).toEqual(registration);
    expect(service.takePendingRegistration()).toBeNull();
  });
});
