export interface SimplexStep {
    type: string;
    phase: number;

    enteringV: string;
    leavingV: string;

    pivotRow: number;
    pivotCol: number;

    basis: string[];

    variables: string[];
    equations: number[][];
    objective: number[];
    rhs: number[];

    result: number;

    comment: string;
    operations: string[];
}