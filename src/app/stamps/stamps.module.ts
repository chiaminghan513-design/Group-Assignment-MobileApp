import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { StampsPageRoutingModule } from './stamps-routing.module';

import { StampsPage } from './stamps.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StampsPageRoutingModule
  ],
  declarations: [StampsPage]
})
export class StampsPageModule {}
