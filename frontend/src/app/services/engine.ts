import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Engine {
  private constraints: Constraints[] = []
  private equations: number[][] = []
  private objective: number[] = []
  private rhs: number[] = []
  private basis: string[] = []
  private type!: ProblemType;
  private nConstraints!: number;
  private nVariables!: number;

  public simplex() {
    // this is done to unify the logic of min and max problems, by turning a min problem into a max one
    this.flipSignOfObjfn();
    // TODO: check if it is already optimized

  }

  private flipSignOfObjfn() {
    for (let i = 0; i < this.nVariables; i++) {
      this.objective[i] *= -1;
    }
  }

  private standardize() {
    for (let i = 0; i < this.nConstraints; i++) {
      if (this.constraints[i] == Constraints.LESSTHANOREQUAL) { // add surplus
        // add a variable equal to zero to all equations
        this.addVariable();
        // set surplus coefficient to one
        this.equations[i][this.nVariables - 1] = 1;
      }
      else if (this.constraints[i] == Constraints.GREATERTHANOREQUAL) {
        // TODO: add artificials and implement two phase simplex
      }
    }
  }

  private addVariable() {
    for (let i = 0; i <  this.nConstraints; i++) {
      this.equations[i] = [...this.equations[i], 0];
    }

    this.objective = [...this.objective, 0];
    this.nVariables++;
  }

  private isOptimized() {
    for (let num of this.objective) {
      // return false if any entry is less than zero
      if (num < 0) return false;
    }
    return true;
  }
}
