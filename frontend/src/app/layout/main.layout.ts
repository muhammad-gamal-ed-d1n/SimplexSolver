import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProblemType } from '../model/problem.type';
import { Constraints } from '../model/constraints';
import { Engine } from '../services/engine';
import { SolverResult } from '../model/solver.result';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main.layout.html',
  styleUrls: ['./main.layout.css']
})
export class MainLayout {
  public Constraints = Constraints;
  public ProblemType = ProblemType;

  nVars = 0;
  nConstraints = 0;
  result!: SolverResult;
  objectKeys = Object.keys;
  varConstraints = []

  variables: string[] = [];

  objective: number[] = [];
  type: ProblemType = ProblemType.MAX;

  public constraints: Constraints[] = [];
  equations: number[][] = [];
  rhs: number[] = [];

  generated = false;

  constructor(private engine: Engine) {}

  solve() {
    this.sendToSolver(this.engine);

    const result = this.engine.solve();

    this.result = result;
  }

  generateTable() {
    this.variables = Array.from({ length: this.nVars }, (_, i) => `x${i}`);

    this.objective = new Array(this.nVars).fill(0);

    this.equations = Array.from(
      { length: this.nConstraints },
      () => new Array(this.nVars).fill(0)
    );

    this.rhs = new Array(this.nConstraints).fill(0);

    this.constraints = new Array(this.nConstraints).fill(Constraints.LESSTHANOREQUAL);

    this.generated = true;
  }

  buildInput() {
    return {
      type: this.type,
      objective: this.objective,
      variables: this.variables,
      equations: this.equations,
      rhs: this.rhs,
      constraints: this.constraints
    };
  }

  private sendToSolver(engine: Engine) {
    engine.type = this.type;

    engine.variables = structuredClone(this.variables);
    console.log(this.variables);
    
    engine.objective = structuredClone(this.objective);

    engine.equations = structuredClone(this.equations);
    console.log(this.equations);
    
    engine.rhs = structuredClone(this.rhs);

    engine.constraints = structuredClone(this.constraints);
    engine.varConstraints = structuredClone(this.varConstraints);

    engine.nVariables = this.variables.length;
    engine.nConstraints = this.constraints.length;

    engine.result = 0;

    engine.basis = [];
    engine.steps = [];
    engine.enteringV = '';
    engine.leavingV = '';

    engine['tmpBreak'] = false;
  }
}