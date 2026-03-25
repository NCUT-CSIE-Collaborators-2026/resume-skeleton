import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DriftBallsComponent } from './uikit/drift-balls.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DriftBallsComponent],
  template: `
    <app-drift-balls></app-drift-balls>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
}
