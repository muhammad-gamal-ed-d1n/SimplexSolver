import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Engine } from './services/engine';
import { Constraints } from './model/constraints';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  constructor(private solver: Engine) {}

  ngOnInit() {
    console.log("works");
    this.solver.equations = [[1, 1], [1, 0], [0, 1]];
    this.solver.rhs = [4, 2, 3];
    this.solver.constraints = [Constraints.LESSTHANOREQUAL, Constraints.LESSTHANOREQUAL, Constraints.LESSTHANOREQUAL];
    this.solver.objective = [3, 2];
    this.solver.nConstraints = 3;
    this.solver.nVariables = 2
    this.solver.variables = ['x', 'y']
    this.solver.basis = ['s1', 's2', 's3']
    this.solver.simplex();
  }
}
