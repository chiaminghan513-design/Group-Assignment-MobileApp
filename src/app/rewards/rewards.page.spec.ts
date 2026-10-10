import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RewardsPage } from './rewards.page';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

describe('RewardsPage', () => {
  let component: RewardsPage;
  let fixture: ComponentFixture<RewardsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(RewardsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens offer details even when the member does not have enough points', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.viewOffer({
      id: 'reward-1', name: 'Test voucher', description: 'Test offer',
      points: 100, category: 'Voucher', colour: 'mint', voucher: true
    });

    expect(navigate).toHaveBeenCalledWith(['/reward-details'], {
      queryParams: { id: 'reward-1', kind: 'voucher', preview: 'true' }
    });
  });
});
