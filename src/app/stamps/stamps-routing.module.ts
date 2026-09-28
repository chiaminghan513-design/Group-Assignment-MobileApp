import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StampsPage } from './stamps.page';

const routes: Routes = [
  {
    path: '',
    component: StampsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StampsPageRoutingModule {}
