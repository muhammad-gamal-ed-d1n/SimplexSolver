import { Injectable } from '@angular/core';
import { Constraints } from '../model/constraints';
import { ProblemType } from '../model/problem.type';
import { SimplexStep } from '../model/simplex.step';
import { SolverResult } from '../model/solver.result';

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
  public nSurplus: number = 0;
  public isphase2: boolean = false;
  public is2phase: boolean = false;
  public auxiliary: number[] = [];
  public artificials: string[] = [];
  public surplus: string[] = [];
  public placeholder!: number[];
  public tmpBreak = false; 
  public varConstraints: Constraints[] = [];
  public currentStep: SimplexStep = {} as SimplexStep;
  public steps: SimplexStep[] = [];

  public solve(): SolverResult {
    this.preprocessVariables();
    // this is done to unify the logic of min and max problems, by turning a min problem into a max one
    if (this.type == ProblemType.MAX){
      this.flipSignOfObjfn(this.objective);
    }
    // TODO: check if it is already optimized

    this.currentStep.type = "Standardizing"
    this.currentStep.comment = "Standardizing Simplex Problem (Adding slacks, surpluses, artificials)"
    // standardize
    this.standardize();
    console.log("VARIABLES: ", this.variables);
    for (let eq of this.equations) {
      console.log(eq);
    }
    this.currentStep.equations = structuredClone(this.equations);
    this.currentStep.result = this.result;
    this.currentStep.rhs = this.rhs;
    this.currentStep.objective = structuredClone(this.objective);
    this.currentStep.variables = structuredClone(this.variables);
    this.steps.push(structuredClone(this.currentStep));
    this.currentStep = {} as SimplexStep;

    // set basis
    this.setBasis();
    console.log("BASIS: ", this.basis);
    this.currentStep.type = "Set Basis"
    this.currentStep.comment = "Choosing the basis"
    this.currentStep.equations = structuredClone(this.equations);
    this.currentStep.result = this.result;
    this.currentStep.rhs = this.rhs;
    this.currentStep.objective = structuredClone(this.objective);
    this.currentStep.variables = structuredClone(this.variables);
    this.currentStep.basis = structuredClone(this.basis);
    this.steps.push(structuredClone(this.currentStep));
    this.currentStep = {} as SimplexStep;

    console.log("ISTWOPHASE?: ", this.isphase2);
    if (this.isphase2) {
      this.is2phase = true;
      this.solvePhaseOne()
      this.preparePhaseTwo();
      this.isphase2 = false;
    }
    // return
    // if (this.tmpBreak) return null;
    this.simplex();

    if (this.type == ProblemType.MIN) this.result *= -1;
    console.log(this.result);

    return this.buildSolverResult();
  }

  public simplex() {
    this.basisTranformation();
    for (let eq of this.equations) {
      console.log(eq);
      
    }
    console.log(this.rhs);
    

    // simplex loop until the problem is optimized
    let count = 0;
    while (true) {
      if (this.isOptimized()) {
        this.steps.push({
          type: "Optimal",
          phase: this.isphase2 ? 2 : 1,
          enteringV: "",
          leavingV: "",
          pivotRow: -1,
          pivotCol: -1,
          basis: structuredClone(this.basis),
          variables: structuredClone(this.variables),
          equations: structuredClone(this.equations),
          objective: structuredClone(this.objective),
          rhs: structuredClone(this.rhs),
          result: this.result,
          comment: "Optimal solution reached"
        } as SimplexStep);
        console.log("Here");
        console.log(count);
        console.log(this.objective);
        
        
        
        break;
      }

      
      if (count++ >= 5) break;

      this.setEnteringAndLeavingVariables();
      this.basisTranformation();
    }

    // if (this.type = ProblemType.MIN) this.result *= -1;

  }

  private solvePhaseOne() {
    this.currentStep.type = "Setting up phase one"

    this.setAuxiliary();

    this.placeholder = this.objective.slice();
    this.objective = this.auxiliary;

    this.currentStep = {
      type: "Phase Transition",
      phase: 1,

      enteringV: "",
      leavingV: "",

      pivotRow: -1,
      pivotCol: -1,

      basis: structuredClone(this.basis),
      variables: structuredClone(this.variables),
      equations: structuredClone(this.equations),
      objective: structuredClone(this.objective),
      rhs: structuredClone(this.rhs),

      result: this.result,

      operations: [
        "Artificial objective function constructed",
        "All artificial variables set to minimize feasibility error",
        "Entering Phase 1 simplex iterations"
      ],

    comment: "Start of Phase 1 (Two-Phase Simplex Method)"
  };

  this.steps.push(structuredClone(this.currentStep));
  this.currentStep = {} as SimplexStep;

    console.log("AUXOBJ", this.objective);
    this.currentStep.equations = structuredClone(this.equations);
    this.currentStep.result = this.result;
    this.currentStep.rhs = this.rhs;
    this.currentStep.objective = structuredClone(this.objective);
    this.currentStep.variables = structuredClone(this.variables);
    this.currentStep.basis = structuredClone(this.basis);
    this.steps.push(structuredClone(this.currentStep));
    this.currentStep = {} as SimplexStep;
    
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
      
      this.currentStep.type = "Choosing Pivot";
      this.currentStep.comment = "Choosing Leaving and Entering Variables";
      this.currentStep.equations = structuredClone(this.equations);
      this.currentStep.result = this.result;
      this.currentStep.rhs = this.rhs;
      this.currentStep.objective = structuredClone(this.objective);
      this.currentStep.variables = structuredClone(this.variables);
      this.currentStep.basis = structuredClone(this.basis);
      this.steps.push(structuredClone(this.currentStep));
      this.currentStep = {} as SimplexStep;
      
      this.basisTranformation();
      if (this.tmpBreak) return;
      count++

      if (this.isOptimized() && this.result > 1e-9) {

        const step: SimplexStep = {
          type: "Infeasible",
          phase: 1,

          enteringV: "",
          leavingV: "",

          pivotRow: -1,
          pivotCol: -1,

          basis: structuredClone(this.basis),
          variables: structuredClone(this.variables),
          equations: structuredClone(this.equations),
          objective: structuredClone(this.objective),
          rhs: structuredClone(this.rhs),

          result: this.result,

          operations: [
            "Phase 1 optimization completed",
            `Auxiliary objective value = ${this.result} > 0`,
            "Artificial variables could not be eliminated",
            "No feasible solution exists for the original problem"
          ],

          comment: "Problem is infeasible — Phase 1 failed to find a feasible solution"
        };

        this.steps.push(step);

        this.tmpBreak = true;
        return;
      }

    }

    if (this.result > 1e-9) {

      const step: SimplexStep = {
        type: "Infeasible",
        phase: 1,

        enteringV: "",
        leavingV: "",

        pivotRow: -1,
        pivotCol: -1,

        basis: structuredClone(this.basis),
        variables: structuredClone(this.variables),
        equations: structuredClone(this.equations),
        objective: structuredClone(this.objective),
        rhs: structuredClone(this.rhs),

        result: this.result,

        operations: [
          "Phase 1 objective is not zero",
          "Artificial variables could not be eliminated",
          "Original problem is infeasible"
        ],

        comment: "Problem is infeasible (no feasible solution exists)"
      };

      this.steps.push(step);

      this.tmpBreak = true;
      return;
    }

    this.currentStep = {
      type: "Phase Transition",
      phase: 1,

      enteringV: "",
      leavingV: "",

      pivotRow: -1,
      pivotCol: -1,

      basis: structuredClone(this.basis),
      variables: structuredClone(this.variables),
      equations: structuredClone(this.equations),
      objective: structuredClone(this.objective),
      rhs: structuredClone(this.rhs),

      result: this.result,

      operations: [
        "Phase 1 completed successfully",
        "Checking feasibility condition (auxiliary objective ≈ 0)",
        "Removing artificial objective and restoring original problem",
        "Switching to Phase 2"
      ],

      comment: "Transition from Phase 1 (auxiliary problem) to Phase 2 (original objective)"
    };

    this.steps.push(structuredClone(this.currentStep));
    this.currentStep = {} as SimplexStep;
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
        this.isphase2 = true;
        break;
      case Constraints.EQUAL:
        artificial = `a${row}`;
        this.variables = [...this.variables, artificial];
        this.artificials = [...this.artificials, artificial];
        this.addEntries(row, [1]);
        this.isphase2 = true;
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
    if (this.isphase2) {
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
    if (this.isphase2) {
      if (Math.abs(this.result) <= 1e-9){
        // for (let artificial of this.artificials) {
        //   if (this.basis.includes(artificial)) return false;
        // }
        return true;
      } else if (!this.objective.some(val => val < 0)) {
          const step: SimplexStep = {
          type: "Infeasible",
          phase: 1,

          enteringV: "",
          leavingV: "",

          pivotRow: -1,
          pivotCol: -1,

          basis: structuredClone(this.basis),
          variables: structuredClone(this.variables),
          equations: structuredClone(this.equations),
          objective: structuredClone(this.objective),
          rhs: structuredClone(this.rhs),

          result: this.result,

          operations: [
            "Phase 1 objective is not zero",
            "Artificial variables could not be eliminated",
            "Original problem is infeasible"
          ],

          comment: "Problem is infeasible (no feasible solution exists)"
        };

        this.steps.push(step);

        this.tmpBreak = true;
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

    const step: SimplexStep = {
      type: "Pivot Selection",
      phase: this.isphase2 ? 2 : 1,

      enteringV: this.enteringV,
      leavingV: this.leavingV,

      pivotRow: row,
      pivotCol: column,

      basis: structuredClone(this.basis),
      variables: structuredClone(this.variables),
      equations: structuredClone(this.equations),
      objective: structuredClone(this.objective),
      rhs: structuredClone(this.rhs),

      result: this.result,

      operations: [],
      comment: ""
  };

  step.comment = `Selected entering variable ${this.enteringV} and leaving variable ${this.leavingV} using pivot at column ${column}, row R${row + 1}`;

  step.operations.push(
    `Pivot column chosen: ${this.enteringV} (index ${column})`
  );

  step.operations.push(
    `Pivot row chosen: R${row + 1} (leaves basis variable ${this.leavingV})`
  );

  this.steps.push(step);


  }

  private basisTranformation() {
    for (let base of this.basis) {

      let step: SimplexStep = {
        type: "Pivot Operation",
        phase: this.isphase2 ? 2 : 1,
        enteringV: this.enteringV,
        leavingV: this.leavingV,
        pivotRow: -1,
        pivotCol: -1,
        basis: structuredClone(this.basis),
        variables: structuredClone(this.variables),
        equations: structuredClone(this.equations),
        objective: structuredClone(this.objective),
        rhs: structuredClone(this.rhs),
        result: this.result,
        comment: "",
        operations: []
      };

      // find index of base element
      let row = this.basis.findIndex(b => b == base);
      let pivotIndex = this.variables.findIndex(b => b == base);
      let pivot = this.equations[row][pivotIndex];

      step.pivotRow = row;
      step.pivotCol = pivotIndex;

      step.operations.push(`Pivot on R${row + 1}, column ${base}`);

      if (Math.abs(pivot) < 1e-12) {
        step.operations.push(`Pivot is zero at R${row + 1}, attempting repair`);

        let repaired = false;

        for (let i = 0; i < this.nConstraints; i++) {
          if (i === row) continue;

          let altPivot = this.equations[i][pivotIndex];

          if (Math.abs(altPivot) > 1e-12) {
            step.operations.push(`Swapping basis: R${row + 1} <-> R${i + 1}`);

            [this.basis[row], this.basis[i]] = [this.basis[i], this.basis[row]];

            row = i;
            pivot = altPivot;
            repaired = true;
            break;
          }
        }

      if (!repaired) {
        step.operations.push(`Unrecoverable pivot at R${row + 1}`);
        this.steps.push(step);

        const failStep: SimplexStep = {
          type: "Infeasible",
          phase: this.isphase2 ? 2 : 1,

          enteringV: "",
          leavingV: "",

          pivotRow: -1,
          pivotCol: -1,

          basis: structuredClone(this.basis),
          variables: structuredClone(this.variables),
          equations: structuredClone(this.equations),
          objective: structuredClone(this.objective),
          rhs: structuredClone(this.rhs),

          result: this.result,

          operations: [
            "Pivot could not be repaired",
            "Tableau is numerically unstable or invalid",
            "Terminating solver"
          ],

          comment: "Solver terminated — problem may be infeasible or degenerate"
        };

        this.steps.push(failStep);

        this.tmpBreak = true;
        return;
      }
      }

      if (pivot != 1) {
        step.operations.push(`Normalize R${row + 1} = R${row + 1} / ${pivot}`);

        this.normalize(row, pivot);
        pivot = 1;
      }

      for (let i = 0; i < this.nConstraints; i++) {
        if (i == row) continue;

        let factor = this.equations[i][pivotIndex] / pivot;

        step.operations.push(
          `R${i + 1} = R${i + 1} - (${factor}) * R${row + 1}`
        );

        for (let j = 0; j < this.nVariables; j++) {
          this.equations[i][j] -= this.equations[row][j] * factor;
        }

        this.rhs[i] -= this.rhs[row] * factor;
        this.equations[i][pivotIndex] = 0;
      }

      let factor = this.objective[pivotIndex] / pivot;

      step.operations.push(
        `Z = Z - (${factor}) * R${row + 1}`
      );

      for (let i = 0; i < this.nVariables; i++) {
        this.objective[i] -= this.equations[row][i] * factor;
      }

      this.result -= this.rhs[row] * factor;
      this.objective[pivotIndex] = 0;

      this.steps.push(step);
    }
  }

  private normalize(row: number, pivot: number) {
    for (let i = 0; i < this.nVariables; i++) {
      this.equations[row][i] /= pivot;
    }
    this.rhs[row] /= pivot;
  }

  private preprocessVariables() {
    let newVars: string[] = [];
    let newEqs: number[][] = [];
    let newObj: number[] = [];

    // init new equations
    for (let i = 0; i < this.nConstraints; i++) {
      newEqs[i] = [];
    }

    for (let j = 0; j < this.nVariables; j++) {
      let varName = this.variables[j];
      let constraint = this.varConstraints[j];

      if (constraint === Constraints.EQUAL) {
        let pos = varName + "''"; // x''
        let neg = varName + "'";  // x'

        newVars.push(pos, neg);

        for (let i = 0; i < this.nConstraints; i++) {
          let coeff = this.equations[i][j];
          newEqs[i].push(coeff);     // x''
          newEqs[i].push(-coeff);    // x'
        }

        let c = this.objective[j];
        newObj.push(c);
        newObj.push(-c);
    }

    else if (constraint === Constraints.LESSTHANOREQUAL) {
      let newVar = varName + "'";

      newVars.push(newVar);

      for (let i = 0; i < this.nConstraints; i++) {
        let coeff = this.equations[i][j];
        newEqs[i].push(-coeff);
      }

      let c = this.objective[j];
      newObj.push(-c);
    }

    else {
      newVars.push(varName);

      for (let i = 0; i < this.nConstraints; i++) {
        newEqs[i].push(this.equations[i][j]);
      }

      newObj.push(this.objective[j]);
    }
  }

  // apply
  this.variables = newVars;
  this.equations = newEqs;
  this.objective = newObj;
  this.nVariables = newVars.length;

  this.currentStep.type = "Setup";
  this.currentStep.comment = "Setting Up Problem Variables (Handling Negative and Unrestricted Variables)";
  this.currentStep.equations = structuredClone(this.equations);
  this.currentStep.result = this.result;
  this.currentStep.rhs = this.rhs;
  this.currentStep.objective = structuredClone(this.objective);
  this.currentStep.variables = structuredClone(this.variables);
  this.steps.push(structuredClone(this.currentStep));
  this.currentStep = {} as SimplexStep;
}

public buildSolverResult(): SolverResult {
  const variables: Record<string, number> = {};

  // extract variable values from final basis
  for (let i = 0; i < this.basis.length; i++) {
    const varName = this.basis[i];
    const varIndex = this.variables.indexOf(varName);

    if (varIndex === -1) continue;

    let value = this.rhs[i];

    // basic safety: ignore tiny numerical noise
    if (Math.abs(value) < 1e-10) value = 0;

    variables[varName] = value;
  }

  // infer status
  let status: SolverResult['status'] = 'OPTIMAL';

  if (this.isphase2 && this.result > 1e-9) {
    status = 'INFEASIBLE';
  }

  // optional safety: if solver broke early
  if (this.tmpBreak) {
    status = 'INFEASIBLE';
  }

  return {
    status,
    problemType: this.is2phase ? 'TWO_PHASE' : 'SIMPLEX',
    value: this.type === ProblemType.MIN ? this.result * -1 : this.result,
    variables,
    steps: structuredClone(this.steps)
  };
}
}
