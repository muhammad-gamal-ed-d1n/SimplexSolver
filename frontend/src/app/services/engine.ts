import { Injectable } from '@angular/core';
import { Constraints } from '../model/constraints';
import { ProblemType } from '../model/problem.type';

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
  private is2phase: boolean = false;
  private auxiliary: number[] = [];
  private artificials: string[] = [];
  private surplus: string[] = [];
  private placeholder!: number[];
  private tmpBreak = false;

  public solve() {
    // this is done to unify the logic of min and max problems, by turning a min problem into a max one
    if (this.type == ProblemType.MAX){
      this.flipSignOfObjfn(this.objective);
    }
    // TODO: check if it is already optimized

    // standardize
    this.standardize();
    console.log("VARIABLES: ", this.variables);
    for (let eq of this.equations) {
      console.log(eq);
      
    }

    // set basis
    this.setBasis();
    console.log("BASIS: ", this.basis);
    
    console.log("ISTWOPHASE?: ", this.is2phase);
    if (this.is2phase) {
      this.solvePhaseOne()
      this.preparePhaseTwo();
    }
    // return
    if (this.tmpBreak) return;
    this.simplex();

    if (this.type == ProblemType.MIN) this.result *= -1;
    console.log(this.result);
  }

  public simplex() {
    this.basisTranformation();
    for (let eq of this.equations) {
      console.log(eq);
      
    }
    console.log(this.rhs);
    

    // simplex loop until the problem is optimized
    let count = 0;
    while (!this.isOptimized() && count++ < 5 ) {
      this.setEnteringAndLeavingVariables();
  
      this.basisTranformation();
      console.log("========STEP=======");
      console.log("BASIS: ", this.basis);
      console.log("Equations: ");
      for (let eq of this.equations) {
        console.log(eq);
      }
      console.log("OBJFUNC");
      console.log(this.objective);
      console.log("=====STEP DONE=====");
      
    }

    // if (this.type = ProblemType.MIN) this.result *= -1;

  }

  private solvePhaseOne() {
    this.setAuxiliary();

    this.placeholder = this.objective.slice();
    this.objective = this.auxiliary;
    console.log("AUXOBJ", this.objective);
    
    this.basisTranformation();
    console.log("AFTER TRANSFORMAION: ");
    console.log("2PHASEVARS: ", this.variables);
    for (let eq of this.equations) {
      console.log(eq);
    }
    console.log(this.objective);
    console.log("RHS: ", this.rhs);
    console.log("Z: ", this.result);
    
    
    

    let count = 0;
    while (!this.isOptimized() && count < 30) {
      this.setEnteringAndLeavingVariables();
      console.log("HEREHERERHERHE");
      
      this.basisTranformation();
      if (this.tmpBreak) return;
      count++
    }

    if (this.result > 0) {
      console.log("infeasible");
      console.log(this.result);
      console.log(this.basis);
      
      
      return;

    }
  }

  private preparePhaseTwo() {
    this.objective = this.placeholder;
    this.fixBasis();
  }

  private fixBasis() {
    for (let base of this.basis) {
      if (this.artificials.includes(base)) {
        // remove artificial from basis
        let row = this.basis.indexOf(base);
        for (let i = 0; i < this.nVariables; i++) {
          let value = this.equations[row][i];
          let variable = this.variables[i];
          if (value != 0 && !this.basis.includes(variable) && !this.artificials.includes(variable)) {
            // make variable enter the basis
            console.log("ENTERING: ", variable);
            console.log("LEAVING: ", base);

            this.basis[row] = variable;
            console.log(this.basis);

            this.basisTranformation();
            break;
          }
        }
      }
    }

    // remove all artificials
    for (let artificial of this.artificials) {
      // remove artificial from problem
      let column = this.variables.indexOf(artificial);
      this.removeVariable(column)
    }
  }

  private removeVariable(column: number) {
    // remove from variable list
    this.variables.splice(column, 1);

    // remove column
    for (let i = 0; i < this.nConstraints; i++) {
      this.equations[i].splice(column, 1);
    }

    // remove from obj function
    this.objective.splice(column, 1);
    this.nVariables--;
  }

  private setAuxiliary() {
    this.auxiliary = new Array(this.nVariables).fill(0);
    for (let artificial of this.artificials) {
      const aindex = this.variables.indexOf(artificial);
      this.auxiliary[aindex] = 1;
    }
  }

  private flipSignOfObjfn(row: number[]) {
    for (let i = 0; i < this.nVariables; i++) {
      row[i] *= -1;
    }
  }

  private standardize() {
    for (let i = 0; i < this.nConstraints; i++) {
      // add surplus/artificial variables
      this.addVariable(this.constraints[i], i);
    }
  }

  // adds a 0 entry to all equations
  private addVariable(constraint: Constraints, row: number) {
    // for (let i = 0; i < this.nConstraints; i++) {
    //   this.equations[i] = [...this.equations[i], 0];
    // }

    // TODO: handle artificials aside from surpluses. all cases ya3ny
    let surplus = '', artificial = '';
    switch (constraint) {
      case Constraints.LESSTHANOREQUAL:
        surplus = `s${row}`;
        this.variables = [...this.variables, surplus];
        this.surplus = [...this.surplus, surplus];
        this.addEntries(row, [1]);
        break;
      case Constraints.GREATERTHANOREQUAL:
        artificial = `a${row}`;
        surplus = `s${row}`;
        this.variables = [...this.variables, surplus, artificial];
        this.artificials = [...this.artificials, artificial]
        this.surplus = [...this.surplus, surplus];
        this.addEntries(row, [-1, 1]);
        this.is2phase = true;
        break;
      case Constraints.EQUAL:
        artificial = `a${row}`;
        this.variables = [...this.variables, artificial];
        this.artificials = [...this.artificials, artificial];
        this.addEntries(row, [1]);
        this.is2phase = true;
        break;
      default:
        // Should not occur
        break;
    }
  }

  private addEntries(row: number, values: number[]) {
    for (let value of values) {
      for (let i = 0; i < this.nConstraints; i++) {
        this.equations[i] = [...this.equations[i], 0];
      }
      this.objective = [...this.objective, 0];
      this.nVariables++;
      this.equations[row][this.nVariables - 1] = value;
    }
  }

  private setBasis() {
    this.basis = [];
    if (this.is2phase) {
      for (let artificial of this.artificials) {
        this.basis = [...this.basis, artificial];
      }

      for (let surplus of this.surplus) {
        if (this.basis.length == this.nConstraints) break;
        let flag = false
        for (let artificial of this.artificials) {
          if (surplus.at(1) == artificial.at(1)) {
            flag = true;
            break;
          }
        }
        if (flag) continue;
        this.basis = [...this.basis, surplus];
      }
    } else {
      for (let surplus of this.surplus) {
        this.basis = [...this.basis, surplus];
      }
    }
  }

  // checks whether objective function is optimized
  private isOptimized(): boolean {
    if (this.is2phase) {
      if (Math.abs(this.result) <= 1e-9){
        // for (let artificial of this.artificials) {
        //   if (this.basis.includes(artificial)) return false;
        // }
        return true;
      }
      return false;
    }
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

    if (mostngtve >= 0) console.log("BIG ISSUE HERE");
    
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
    console.log("Z: ", this.objective);
    
    return imostpstve;
  }

  private setEnteringAndLeavingVariables() {
    let column = this.findPivotColumn();
    let row = this.findPivotRow(column);

    this.leavingV = this.basis[row];
    this.enteringV = this.variables[column]
    console.log("Entering: ", this.enteringV);
    console.log("Leaving: ", this.leavingV);
    console.log("Z: ", this.objective);
    
    //set entering variable
    this.basis[row] = this.enteringV;
    console.log("Basis", this.basis);

  }

  private basisTranformation() {
    for (let base of this.basis) {
      // find index of base element
      let row = this.basis.findIndex(b => b == base);
      let pivotIndex = this.variables.findIndex(b => b == base);
      let pivot = this.equations[row][pivotIndex];



      // TODO: if pivot equals zero it should throw an error
      if (pivot === 0) {
        console.log("EQUATIONS:");
        for (let arr of this.equations) {
          console.log(arr);

        }
        console.log("PIVOT AT: ", row, ", ", pivotIndex);
        console.log("Unexpected error, pivot equal to zero");
        console.log("ZERO PIVOT", this.equations[row][pivotIndex]);
        this.tmpBreak = true;

        return;
      }
      if (pivot != 1) {
        // normalize basis row
        this.normalize(row, pivot);
        pivot = 1;
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

    console.log("EQUS: ");
    for (let eq of this.equations) {
      console.log(eq);
    }
  }

  private normalize(row: number, pivot: number) {
    for (let i = 0; i < this.nVariables; i++) {
      this.equations[row][i] /= pivot;
    }
    this.rhs[row] /= pivot;
  }
}
