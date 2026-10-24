import test from "node:test"
import assert from "node:assert/strict"
import { planGenesisTask, assessGenesisCandidate } from "../lib/lumin-genesis"

test("bounded plan has dependency chain and requires approval", () => {
  const plan = planGenesisTask("Build a calculator")
  assert.equal(plan.steps.length, 3)
  assert.equal(plan.maxParallel, 3)
  assert.equal(plan.requiresApproval, true)
  assert.deepEqual(plan.steps[2].dependsOn, ["develop"])
})
test("reject empty objective", () => assert.throws(() => planGenesisTask(" ")))
test("never auto-deploys a candidate", () => {
  const result = assessGenesisCandidate({ baselinePassed: 5, candidatePassed: 8, total: 10, safetyPassed: true })
  assert.equal(result.eligibleForHumanReview, true)
  assert.equal(result.automaticallyDeploy, false)
})
test("failed safety evaluation prevents promotion", () => {
  assert.equal(assessGenesisCandidate({ baselinePassed: 5, candidatePassed: 9, total: 10, safetyPassed: false }).eligibleForHumanReview, false)
})
