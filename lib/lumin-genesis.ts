/**
 * LUMIN Genesis 0.2: bounded, deterministic task decomposition.
 * This module only plans work; it cannot execute tools, spawn processes,
 * access networks, change its own permissions, or deploy code.
 */
export type GenesisRole = "research" | "developer" | "reviewer"
export type GenesisStep = { id: string; role: GenesisRole; goal: string; dependsOn: string[] }
export type GenesisPlan = { objective: string; steps: GenesisStep[]; requiresApproval: true; maxParallel: number }
const MAX_OBJECTIVE = 1200
const MAX_PARALLEL = 3

export function planGenesisTask(objective: string): GenesisPlan {
  const clean = objective.trim().replace(/\s+/g, " ").slice(0, MAX_OBJECTIVE)
  if (!clean) throw new Error("Genesis requires a non-empty objective")
  return {
    objective: clean,
    maxParallel: MAX_PARALLEL,
    requiresApproval: true,
    steps: [
      { id: "research", role: "research", goal: "Identify requirements, constraints, and verifiable references for: " + clean, dependsOn: [] },
      { id: "develop", role: "developer", goal: "Propose a reversible implementation and tests for: " + clean, dependsOn: ["research"] },
      { id: "review", role: "reviewer", goal: "Review evidence, run authorized tests in isolation, and report limitations", dependsOn: ["develop"] },
    ],
  }
}

export function assessGenesisCandidate(input: { baselinePassed: number; candidatePassed: number; total: number; safetyPassed: boolean }) {
  const { baselinePassed, candidatePassed, total, safetyPassed } = input
  if (![baselinePassed, candidatePassed, total].every(Number.isInteger) || total <= 0 || baselinePassed < 0 || candidatePassed < 0 || baselinePassed > total || candidatePassed > total) {
    throw new Error("Invalid benchmark results")
  }
  const improvement = (candidatePassed - baselinePassed) / total
  return { improvement, eligibleForHumanReview: safetyPassed && improvement > 0, automaticallyDeploy: false }
}
