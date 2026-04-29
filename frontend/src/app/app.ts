import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Engine } from './services/engine';
import { Constraints } from './model/constraints';
import { ProblemType } from './model/problem.type';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  constructor(private solver: Engine) { }

  ngOnInit() {
   this.solver.type = ProblemType.MIN;

this.solver.equations = [
  [1, 1],   // x + y >= 3
  [2, 1]    // 2x + y >= 4
];

this.solver.rhs = [3, 4];

this.solver.constraints = [
  Constraints.GREATERTHANOREQUAL,
  Constraints.GREATERTHANOREQUAL
];

this.solver.objective = [5, 4];

this.solver.nConstraints = 2;
this.solver.nVariables = 2;

this.solver.variables = ['x', 'y'];

this.solver.solve();
  }
}
