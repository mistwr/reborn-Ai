export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { html, projectName } = await req.json()

    if (!html) {
      return Response.json({ error: "HTML é obrigatório" }, { status: 400 })
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN

    if (!VERCEL_TOKEN) {
      return Response.json(
        {
          error: "Configure VERCEL_TOKEN para fazer deploy",
          instructions:
            "Vá em vercel.com/account/tokens e crie um token. Adicione como VERCEL_TOKEN nas variáveis de ambiente.",
        },
        { status: 400 },
      )
    }

    const name = projectName || `reborn-site-${Date.now()}`

    // Criar projeto no Vercel
    const deployResponse = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        files: [
          {
            file: "index.html",
            data: Buffer.from(html).toString("base64"),
            encoding: "base64",
          },
        ],
        projectSettings: {
          framework: null,
        },
        target: "production",
      }),
    })

    if (!deployResponse.ok) {
      const errorData = await deployResponse.json()
      console.error("[v0] Vercel deploy error:", errorData)
      return Response.json({ error: errorData.error?.message || "Erro no deploy" }, { status: 500 })
    }

    const deployData = await deployResponse.json()

    return Response.json({
      success: true,
      url: `https://${deployData.url}`,
      projectUrl: `https://vercel.com/${deployData.ownerId}/${deployData.name}`,
      id: deployData.id,
    })
  } catch (error: any) {
    console.error("[v0] Deploy error:", error)
    return Response.json({ error: error?.message || "Erro ao fazer deploy" }, { status: 500 })
  }
}
