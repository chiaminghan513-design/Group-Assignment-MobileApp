import { Component, OnInit } from '@angular/core';
import { LoyaltyDataService } from '../services/loyalty-data.service';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: false,
})
export class WalletPage implements OnInit {

  constructor(public loyalty: LoyaltyDataService) { }

  ngOnInit() {
  }

}
