import { Component, OnInit } from '@angular/core';
import { LoyaltyDataService } from '../services/loyalty-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  readonly stampSlots = Array.from({ length: 10 });

  constructor(public loyalty: LoyaltyDataService) { }

  ngOnInit() {
  }

}
