import { generateLuminText } from "@/lib/lumin-ai-runtime"
import { planGenesisTask } from "@/lib/lumin-genesis"

/** Three bounded analysis passes. No tools or external actions are invoked. */
export async function analyzeGenesisObjective(objective: string) {
  const plan = planGenesisTask(objective)
  const results: { role: string; response: string }[] = []
  for (const step of plan.steps) {
    const prior = results.map(item => item.role + ": " + item.response.slice(0, 2000)).join("\n")
    const answer = await generateLuminText({
      system: "És o Lumin Genesis. Papel: " + step.role + ". Produz uma análise textual fundamentada. Não afirmes ter executado ferramentas, testes ou ações externas. Indica incertezas.",
      prompt: "Objetivo: " + plan.objective + "\nEtapa: " + step.goal + "\nAnálise anterior:\n" + prior,
      maxOutputTokens: 900,
      temperature: 0,
    })
    results.push({ role: step.role, response: answer.text.slice(0, 5000) })
  }
  return { plan, results, status: "analysis_complete" }
}
