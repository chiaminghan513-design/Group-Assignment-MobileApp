import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../services/auth';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('recognises a reached stamp goal without reducing the available stamp balance', () => {
    component.loyalty.member.stamps = 8;
    component.loyalty.member.stampsNeeded = 5;
    expect(component.stampGoalReached).toBe(true);
    expect(component.loyalty.member.stamps).toBe(8);
    component.loyalty.member.stamps = 4;
    expect(component.stampGoalReached).toBe(false);
    component.loyalty.member.stamps = 5;
    expect(component.stampGoalReached).toBe(true);
    component.loyalty.member.stampsNeeded = 0;
    expect(component.stampGoalReached).toBe(false);
    component.loyalty.member.stampsNeeded = Number.NaN;
    expect(component.stampGoalReached).toBe(false);
  });

  it('caps completed reward progress without changing the member point balance', () => {
    component.loyalty.member.points = 1619;
    component.loyalty.member.rewardGoalPoints = 10;
    expect(component.rewardProgressPercent).toBe(100);
    expect(component.loyalty.member.points).toBe(1619);
    component.loyalty.member.points = 5;
    expect(component.rewardProgressPercent).toBe(50);
    component.loyalty.member.points = -1;
    expect(component.rewardProgressPercent).toBe(0);
  });

  it('does not invent progress when the API provides no usable reward goal', () => {
    component.loyalty.member.rewardGoalPoints = 0;
    expect(component.rewardProgressPercent).toBeNull();
    component.loyalty.member.rewardGoalPoints = NaN;
    expect(component.rewardProgressPercent).toBeNull();
  });

  it('repaints balances when an asynchronous dashboard refresh completes', () => {
    const response = new Subject<any>();
    vi.spyOn(TestBed.inject(AuthService), 'getMemberDetails').mockReturnValue(response);
    const repaint = vi.spyOn((component as any).changeDetector, 'detectChanges');
    localStorage.setItem('auth_token', 'local-session');
    component.ionViewWillEnter();
    response.next({ member: { Name: 'Lee' }, wallet: { Point: 1571, Balance: 98.2, TotalStamp: 8 } });
    expect(component.loyalty.member.points).toBe(1571);
    expect(repaint).toHaveBeenCalled();
    response.complete();
    localStorage.removeItem('auth_token');
  });
});
