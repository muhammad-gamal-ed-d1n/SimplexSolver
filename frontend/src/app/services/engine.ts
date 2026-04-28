import { Injectable } from '@angular/core';
import { Constraints } from '../model/constraints';

@Injectable({
  providedIn: 'root',
})
export class Engine {
  public constraints: Constraints[] = [];
  public equations: number[][] = [];
  public objective: number[] = [];
  public result: number = 0;
  public rhs: number[] = [];
  public basis: string[] = [];
  public variables: string[] = [];
  public type!: ProblemType;
  public nConstraints!: number;
  public nVariables!: number;
  public enteringV!: string;
  public leavingV!: string;
  private nSurplus: number = 0;

  public simplex() {
    // this is done to unify the logic of min and max problems, by turning a min problem into a max one
    this.flipSignOfObjfn();
    // TODO: check if it is already optimized

    // standardize
    this.standardize();
    console.log(this.result);
    

    // set pivots
    this.basisTranformation();
    console.log(this.result);
    

    // simplex loop until the problem is optimized
    while (!this.isOptimized()) {
      this.setEnteringAndLeavingVariables();
      console.log("looping");
      


      this.basisTranformation();
    }

    console.log(this.result);
    
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

  // adds a 0 entry to all equations
  private addVariable() {
    for (let i = 0; i < this.nConstraints; i++) {
      this.equations[i] = [...this.equations[i], 0];
    }

    this.objective = [...this.objective, 0];
    this.nVariables++;
    // TODO: handle artificials aside from surpluses. all cases ya3ny
    const surplus = `s${++this.nSurplus}`;
    this.variables = [...this.variables, surplus];
    this.basis = [...this.basis, surplus];
  }

  // checks whether objective function is optimized
  private isOptimized(): boolean {
    for (let num of this.objective) {
      // return false if any entry is less than zero
      
      if (num < 0) return false;
    }
    return true;
  }

  private findPivotColumn(): number {
    let mostngtve = 0, imostngtve = 0;

    for (let i = 0; i < this.nVariables; i++) {
      if (this.objective[i] < mostngtve) {
        mostngtve = this.objective[i];
        imostngtve = i;
      }
    }

    console.log("Z: " ,this.objective);
    console.log("imostngtve: ", imostngtve);
    
    

    return imostngtve;
  }


  // determines pivot row
  private findPivotRow(imostngtve: number): number {
    let ratios: number[] = new Array(this.nConstraints);

    for (let i = 0; i < this.nConstraints; i++) {
      let pivot = this.equations[i][imostngtve];
      ratios[i] = (pivot != 0) ?
        (this.rhs[i] / pivot) :
        -1;
    }

    let mostpstve = Math.max(...ratios), imostpstve = 0;
    for (let i = 0; i < this.nConstraints; i++) {
      if (mostpstve > ratios[i] && ratios[i] > 0) {
        mostpstve = ratios[i];
        imostpstve = i;
      }
    }
    console.log("Ratios: ", ratios);
    
    
    return imostpstve;
  }

  private setEnteringAndLeavingVariables() {
    let column = this.findPivotColumn();
    let row = this.findPivotRow(column);

    this.leavingV = this.basis[row];
    this.enteringV = this.variables[column]
    console.log("Entering: ", this.enteringV);
    console.log("Leaving: ", this.leavingV);

    //set entering variable
    this.basis[row] = this.enteringV;
    console.log("Basis", this.basis);
    
  }

  private basisTranformation() {
    console.log(this.basis);
    
    console.log(this.variables);
    
    for (let base of this.basis) {
      // find index of base element
      let row = this.basis.findIndex(b => b == base);
      let pivotIndex = this.variables.findIndex(b => b == base);
      let pivot = this.equations[row][pivotIndex];

      // TODO: if pivot equals zero it should throw an error
      if (pivot == 0) {
        console.log("Unexpected error, pivot equal to zero");
        continue;
      }
      if (pivot != 1) {
        // normalize basis row
        this.normalize(row, pivot);
      }

      // iterate over each equation and pivotize basis column
      for (let i = 0; i < this.nConstraints; i++) {
        if (i == row) continue;

        // there is no point dividing by the pivot here but i'll keep it m4 mohemm
        let factor = this.equations[i][pivotIndex] / pivot;
        for (let j = 0; j < this.nVariables; j++) {
          this.equations[i][j] -= this.equations[row][j] * factor;
        }
        this.rhs[i] -= this.rhs[row] * factor;

        // redundant but just to make sure. maybe remove later
        this.equations[i][pivotIndex] = 0;
      }

      // TODO: el factor foo2 w ta7t momken yasawe zero fa momken te optimize w t skip
      // handle objective function also
      // still no reason to divide by pivot bas 5alleeha dlw2ty
      let factor = this.objective[pivotIndex] / pivot;
      for (let i = 0; i < this.nVariables; i++) {
        this.objective[i] -= this.equations[row][i] * factor;
      }
      this.result -= this.rhs[row] * factor;
      // to make sure bardo
      this.objective[pivotIndex] = 0;
    }
  }

  private normalize(row: number, pivot: number) {
    for (let i = 0; i < this.nVariables; i++) {
      this.equations[row][i] /= pivot;
    }
  }
}
