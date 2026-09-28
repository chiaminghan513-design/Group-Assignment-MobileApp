import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StampsPage } from './stamps.page';

describe('StampsPage', () => {
  let component: StampsPage;
  let fixture: ComponentFixture<StampsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StampsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
