import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DriverComponent } from './components/driver/driver.component';
import { LiveTrackerComponent } from './components/live-tracker/live-tracker.component';

const routes: Routes = [
  { path: 'driver', component: DriverComponent },
  { path: 'tracker', component: LiveTrackerComponent },
  { path: '', redirectTo: '/tracker', pathMatch: 'full' },
  { path: '**', redirectTo: '/tracker' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
