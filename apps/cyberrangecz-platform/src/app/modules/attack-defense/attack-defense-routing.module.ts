import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ATTACK_DEFENSE_ROUTES } from './attack-defense.routes';

@NgModule({
  imports: [RouterModule.forChild(ATTACK_DEFENSE_ROUTES)],
  exports: [RouterModule],
})
export class AttackDefenseRoutingModule {}
