import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { OTPPageRoutingModule } from './otp-routing.module';

import { OTPPage } from './otp.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OTPPageRoutingModule
  ],
  declarations: [OTPPage]
})
export class OTPPageModule {}
