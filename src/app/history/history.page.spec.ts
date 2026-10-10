import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryPage } from './history.page';
import { Activity } from '../services/loyalty-data.service';

describe('HistoryPage', () => {
  let component: HistoryPage;
  let fixture: ComponentFixture<HistoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses readable labels without changing the original transaction details', () => {
    const item: Activity = { id: 'test', title: 'Original API description', subtitle: 'Receipt-test', date: '10/10/2026', amount: '+1 stamp', icon: 'ribbon-outline', type: 'stamp' };
    expect(component.activityTitle(item)).toBe('Stamps earned');
    expect(component.activityTitle({ ...item, amount: '-1 stamp' })).toBe('Stamps used');
    expect(component.activityTitle({ ...item, type: 'spend' })).toBe('Wallet payment');
    expect(component.activityTitle({ ...item, type: 'topup' })).toBe('Wallet top-up');
    expect(component.activityTitle({ ...item, type: 'earn' })).toBe('Points earned');
    expect(component.activityTitle({ ...item, type: 'reward' })).toBe(item.title);
    expect(item.title).toBe('Original API description');
    expect(item.subtitle).toBe('Receipt-test');
  });
});
