import { SimplexStep } from "./simplex.step";

export interface SolverResult {
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNBOUNDED';

  problemType: 'SIMPLEX' | 'TWO_PHASE';

  value: number;

  variables: Record<string, number>;

  steps: SimplexStep[];
}