"use client"

import { useMemo, useState } from "react"
import { BarChart3, Brain, Globe2, Loader2, Sparkles, Target, TrendingUp } from "lucide-react"

type Post = {
  plays: number
  likes: number
  comments: number
  shares: number
  saves: number
  caption: string
}

type LocalAnalysis = {
  posts: Post[]
  avgPlays: number
  avgEngagement: number
  hookCounts: Record<string, number>
  topPosts: Array<Post & { hook: string; engagement: number }>
}

type DecisionResponse = {
  provider?: string
  calibrated?: boolean
  model?: string
  answers?: Record<string, any>
  error?: string
}

type SocialResponse = {
  status?: string
  stopReason?: string
  report?: string
  posts?: Post[]
  source?: string
  error?: string
  details?: string
}

const SAMPLE = `plays|likes|comments|shares|saves|caption
272800|2700|320|38|583|What should I focus on in business?
198400|3910|401|92|711|3 mistakes that are killing your sales
164200|3020|212|71|640|Nobody tells you this when you start a business
126900|2260|164|45|402|Before you spend another euro on ads, do this
98400|1840|118|39|355|How we turned one simple offer into recurring revenue`

const HOOK_LABELS: Record<string, string> = {
  curiosity: "Curiosidade",
  recognition: "Reconhecimento",
  result: "Resultado",
  authority: "Autoridade",
  problem: "Problema",
  urgency: "Urgência",
  question: "Pergunta",
}

const FORMAT_LABELS: Record<string, string> = {
  q_and_a: "Pergunta + resposta",
  demo: "Demonstração",
  story: "História curta",
  before_after: "Antes / depois",
  tutorial: "Tutorial",
  proof: "Prova / caso real",
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(",", ".")
  if (!cleaned) return 0
  const multiplier = cleaned.endsWith("m") ? 1_000_000 : cleaned.endsWith("k") ? 1_000 : 1
  const base = Number(cleaned.replace(/[km]$/, ""))
  return Number.isFinite(base) ? base * multiplier : 0
}

function normalizePost(raw: any): Post {
  return {
    plays: numberValue(raw.plays ?? raw.views ?? raw.reproducoes ?? raw.visualizacoes),
    likes: numberValue(raw.likes ?? raw.gostos),
    comments: numberValue(raw.comments ?? raw.comentarios),
    shares: numberValue(raw.shares ?? raw.partilhas),
    saves: numberValue(raw.saves ?? raw.guardados ?? raw.bookmarks),
    caption: String(raw.caption ?? raw.text ?? raw.hook ?? raw.legenda ?? raw.title ?? "").trim().slice(0, 800),
  }
}

function parseRows(input: string): Post[] {
  const text = input.trim()
  if (!text) return []

  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed = JSON.parse(text)
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.posts) ? parsed.posts : []
    return rows.map(normalizePost).filter((p: Post) => p.plays > 0 || p.caption)
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const delimiter = lines[0].includes("|") ? "|" : lines[0].includes("\t") ? "\t" : ";"
  const headers = lines[0].split(delimiter).map((value) => value.trim().toLowerCase())

  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split(delimiter)
      const raw: Record<string, string> = {}
      headers.forEach((header, i) => {
        raw[header] = cells[i]?.trim() ?? ""
      })
      return normalizePost(raw)
    })
    .filter((post) => post.plays > 0 || post.caption)
}

function classifyHook(caption: string) {
  const text = caption.toLowerCase()
  if (/\?|como |how |what |why |qual |porque/.test(text)) return "question"
  if (/ningu[eé]m|nobody|voc[eê]|you |isto acontece|se sentes|if you/.test(text)) return "recognition"
  if (/resultado|result|fatur|vendas|sales|receita|revenue|cresceu|grew|x\d|%/.test(text)) return "result"
  if (/erro|mistake|problema|problem|matar|killing|perder|losing|falha/.test(text)) return "problem"
  if (/antes de|before|agora|today|hoje|urgente|last chance/.test(text)) return "urgency"
  if (/aprendi|anos|years|clientes|clients|experiencia|experience|especialista/.test(text)) return "authority"
  return "curiosity"
}

function analyseLocal(posts: Post[]): LocalAnalysis {
  const enriched = posts.map((post) => {
    const interactions = post.likes + post.comments + post.shares + post.saves
    const engagement = post.plays > 0 ? interactions / post.plays : 0
    return { ...post, hook: classifyHook(post.caption), engagement }
  })

  const hookCounts: Record<string, number> = {}
  for (const post of enriched) hookCounts[post.hook] = (hookCounts[post.hook] ?? 0) + 1

  const avgPlays = enriched.length
    ? enriched.reduce((sum, post) => sum + post.plays, 0) / enriched.length
    : 0
  const avgEngagement = enriched.length
    ? enriched.reduce((sum, post) => sum + post.engagement, 0) / enriched.length
    : 0

  const topPosts = [...enriched]
    .sort((a, b) => (b.plays * (1 + b.engagement * 3)) - (a.plays * (1 + a.engagement * 3)))
    .slice(0, 12)

  return { posts, avgPlays, avgEngagement, hookCounts, topPosts }
}

function compactState(analysis: LocalAnalysis) {
  return {
    account_summary: {
      posts_analysed: analysis.posts.length,
      average_plays: Math.round(analysis.avgPlays),
      average_engagement_rate: Number((analysis.avgEngagement * 100).toFixed(3)),
      hook_frequency: analysis.hookCounts,
    },
    strongest_posts: analysis.topPosts.map((post, index) => ({
      rank: index + 1,
      plays: Math.round(post.plays),
      likes: Math.round(post.likes),
      comments: Math.round(post.comments),
      shares: Math.round(post.shares),
      saves: Math.round(post.saves),
      engagement_rate: Number((post.engagement * 100).toFixed(3)),
      detected_hook: post.hook,
      caption: post.caption.slice(0, 320),
    })),
  }
}

function winnerFromCounts(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "curiosity"
}

function pct(value: number) {
  return `${(value * 100).toFixed(value * 100 >= 10 ? 1 : 2)}%`
}

function shortNumber(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

export function CreatorIntelligence() {
  const [input, setInput] = useState(SAMPLE)
  const [local, setLocal] = useState<LocalAnalysis | null>(null)
  const [decision, setDecision] = useState<DecisionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socialQuery, setSocialQuery] = useState("")
  const [socialPlatform, setSocialPlatform] = useState("instagram")
  const [socialLoading, setSocialLoading] = useState(false)
  const [social, setSocial] = useState<SocialResponse | null>(null)

  const topHook = useMemo(
    () => local ? winnerFromCounts(local.hookCounts) : "curiosity",
    [local],
  )

  async function analysePosts(parsed: Post[]) {
    const localResult = analyseLocal(parsed)
    setLocal(localResult)
    setDecision(null)
    setLoading(true)

    try {
      const response = await fetch("/api/creator-intelligence/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: compactState(localResult),
          questions: {
            best_hook: {
              type: "choice",
              instructions: "Which hook family should be prioritised for the next short-form post based on the strongest evidence in this account?",
              criteria: {
                curiosity: "Open loop, surprise, missing information",
                recognition: "Audience immediately recognises itself or its situation",
                result: "Concrete outcome, transformation, money or measurable gain",
                authority: "Experience, expertise, evidence or credibility",
                problem: "Pain, mistake, loss or common failure",
                urgency: "Time pressure, act-before framing or immediate relevance",
                question: "Direct question that creates a knowledge gap",
              },
            },
            next_format: {
              type: "choice",
              instructions: "Which short-form structure is the strongest next test for this account?",
              criteria: {
                q_and_a: "Ask a sharp question, answer immediately, then expand",
                demo: "Show the product or process working",
                story: "Short narrative with tension, turn and lesson",
                before_after: "Contrast the old state with the result",
                tutorial: "Step-by-step practical instruction",
                proof: "Case study, customer proof, numbers or receipts",
              },
            },
            replication_score: {
              type: "score",
              instructions: "How strongly do these results justify intentionally replicating the winning patterns in the next batch of content?",
              criteria: [
                "weak evidence",
                "some signal but too noisy",
                "useful pattern worth testing",
                "strong repeatable pattern",
                "very strong signal: build the next batch around it",
              ],
            },
            strong_candidate: {
              type: "noul",
              instructions: "Is there enough evidence here to define a clear winning content pattern rather than random variation?",
            },
          },
        }),
      })

      const json: DecisionResponse = await response.json()
      if (!response.ok) throw new Error(json.error || "Erro no motor de decisão")
      setDecision(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  async function analyse() {
    setError(null)
    let parsed: Post[]
    try {
      parsed = parseRows(input)
    } catch {
      setError("Não consegui ler os dados. Usa JSON ou linhas separadas por |.")
      return
    }
    if (parsed.length < 2) {
      setError("Cola pelo menos 2 publicações para comparar padrões.")
      return
    }
    await analysePosts(parsed)
  }

  async function researchSocial() {
    const query = socialQuery.trim()
    if (query.length < 2) {
      setError("Indica uma conta, URL ou objetivo para o Lumin pesquisar.")
      return
    }

    setError(null)
    setSocial(null)
    setSocialLoading(true)
    try {
      const response = await fetch("/api/creator-intelligence/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, platform: socialPlatform, limit: 8, maxSteps: 12 }),
      })
      const json: SocialResponse = await response.json()
      setSocial(json)
      if (!response.ok) throw new Error(json.error || "Erro na pesquisa social local")

      const posts = Array.isArray(json.posts) ? json.posts : []
      if (posts.length >= 2) {
        setInput(JSON.stringify(posts, null, 2))
        await analysePosts(posts)
      } else if (json.status === "blocked" || /login/i.test(json.stopReason || "")) {
        setError("A pesquisa chegou à rede social, mas falta iniciar sessão no browser local.")
      } else {
        setError("A pesquisa terminou, mas ainda não recolheu publicações suficientes para comparar padrões.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setSocialLoading(false)
    }
  }

  const hookDecision = decision?.answers?.best_hook?.choice as string | undefined
  const formatDecision = decision?.answers?.next_format?.choice as string | undefined
  const scoreDecision = Number(decision?.answers?.replication_score?.score ?? 0)
  const strongCandidate = Number(decision?.answers?.strong_candidate?.noul ?? 0)
  const chosenHook = hookDecision || topHook

  return (
    <div className="h-full overflow-y-auto bg-[#050506] text-white">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 to-violet-500/10">
              <Brain className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-amber-300/80">
                Lumin Creator Intelligence
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Descobre o padrão. Replica o que funciona.</h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500">
            Analisa publicações, engagement, hooks e formatos. O Lumin transforma os sinais da conta numa decisão prática sobre o próximo conteúdo a testar.
          </p>
        </div>

        <section className="mb-4 rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[.06] via-white/[.02] to-violet-500/[.06] p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-amber-300" />
            <div className="text-sm font-medium text-white">Pesquisa social automática</div>
            <span className="ml-auto rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-emerald-300">
              LOCAL
            </span>
          </div>

          <div className="grid gap-2 md:grid-cols-[150px_1fr_auto]">
            <select
              value={socialPlatform}
              onChange={(event) => setSocialPlatform(event.target.value)}
              className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-zinc-200 outline-none focus:border-amber-300/30"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="auto">Auto</option>
            </select>
            <input
              value={socialQuery}
              onChange={(event) => setSocialQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !socialLoading) void researchSocial() }}
              placeholder="Ex.: analisa @conta e encontra os padrões dos vídeos que mais resultam"
              className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-amber-300/30"
            />
            <button
              type="button"
              onClick={researchSocial}
              disabled={socialLoading || loading}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {socialLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
              {socialLoading ? "A pesquisar..." : "Analisar conta"}
            </button>
          </div>

          {social && (
            <div className="mt-3 rounded-2xl border border-white/[.06] bg-black/20 p-3 text-xs leading-relaxed text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-zinc-200">Jev Social:</b>
                <span>{social.status || "concluído"}</span>
                {social.posts && <span>· {social.posts.length} publicações recolhidas</span>}
              </div>
              {social.stopReason && <div className="mt-1 text-zinc-500">{social.stopReason}</div>}
              {social.report && <div className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-zinc-500">{social.report}</div>}
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-3xl border border-white/[.08] bg-white/[.025] p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Dados das publicações</div>
                <div className="mt-1 text-xs text-zinc-600">JSON ou plays|likes|comments|shares|saves|caption</div>
              </div>
              <button
                type="button"
                onClick={() => setInput(SAMPLE)}
                className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-amber-300/25 hover:text-white"
              >
                Carregar exemplo
              </button>
            </div>

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              className="min-h-[330px] w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-6 text-zinc-300 outline-none transition focus:border-amber-300/30 focus:ring-2 focus:ring-amber-300/10"
            />

            <button
              type="button"
              onClick={analyse}
              disabled={loading}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 px-4 text-sm font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "A analisar..." : "Analisar padrões"}
            </button>

            {error && (
              <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section className="rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[.08] via-white/[.025] to-amber-300/[.04] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-300" />
                <div className="text-sm font-medium text-white">Decisão do Lumin</div>
                {decision?.provider && (
                  <span className="ml-auto rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-300">
                    {decision.provider}
                  </span>
                )}
              </div>

              {!decision ? (
                <div className="text-sm leading-relaxed text-zinc-500">
                  Depois da análise, o Lumin escolhe o hook prioritário, o formato seguinte e a força do padrão. Se Kev estiver configurado, a decisão passa por esse motor; caso contrário usa a inteligência interna do Lumin.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">Hook prioritário</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{HOOK_LABELS[chosenHook] || chosenHook}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">Estrutura seguinte</div>
                    <div className="mt-1 text-base font-medium text-zinc-200">{FORMAT_LABELS[formatDecision || ""] || formatDecision || "A testar"}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Metric label="Replicação" value={`${scoreDecision.toFixed(1)} / 4`} />
                    <Metric label="Padrão claro" value={pct(strongCandidate)} />
                    <Metric label="Calibrado" value={decision.calibrated ? "SIM" : "NÃO"} />
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/[.08] bg-white/[.025] p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-300" />
                <div className="text-sm font-medium text-white">Leitura local</div>
              </div>
              {!local ? (
                <div className="text-sm text-zinc-600">Ainda sem dados.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Publicações" value={String(local.posts.length)} />
                  <Metric label="Média plays" value={shortNumber(local.avgPlays)} />
                  <Metric label="Engagement" value={pct(local.avgEngagement)} />
                  <Metric label="Hook mais usado" value={HOOK_LABELS[topHook] || topHook} />
                </div>
              )}
            </section>
          </div>
        </div>

        {local && (
          <section className="mt-4 rounded-3xl border border-white/[.08] bg-white/[.025] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-300" />
              <div className="text-sm font-medium text-white">Top publicações detetadas</div>
            </div>

            <div className="space-y-2">
              {local.topPosts.slice(0, 6).map((post, index) => (
                <div
                  key={index}
                  className={`grid gap-2 rounded-2xl border p-3 text-xs sm:grid-cols-[40px_100px_105px_1fr] sm:items-center ${index === 0 ? "border-amber-300/20 bg-amber-300/[.05]" : "border-white/[.06] bg-black/15"}`}
                >
                  <strong className={index === 0 ? "text-amber-300" : "text-zinc-600"}>#{index + 1}</strong>
                  <span className="font-medium text-zinc-200">{shortNumber(post.plays)} plays</span>
                  <span className="text-zinc-600">{pct(post.engagement)} engag.</span>
                  <span className="min-w-0 truncate text-zinc-400">
                    <b className="text-zinc-300">{HOOK_LABELS[post.hook]}:</b> {post.caption || "(sem legenda)"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[.06] bg-black/20 p-3">
      <div className="text-[9px] font-semibold uppercase tracking-[.14em] text-zinc-600">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  )
}