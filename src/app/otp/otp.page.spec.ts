import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OTPPage } from './otp.page';

describe('OTPPage', () => {
  let component: OTPPage;
  let fixture: ComponentFixture<OTPPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OTPPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
