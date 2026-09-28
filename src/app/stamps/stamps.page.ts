import { Component, OnInit } from '@angular/core';
import { LoyaltyDataService } from '../services/loyalty-data.service';

@Component({
  selector: 'app-stamps',
  templateUrl: './stamps.page.html',
  styleUrls: ['./stamps.page.scss'],
  standalone: false,
})
export class StampsPage implements OnInit {

  constructor(public loyalty: LoyaltyDataService) { }

  ngOnInit() {
  }

}
