import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { html, projectName } = await request.json()

    if (!html || !projectName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const vercelToken = process.env.VERCEL_TOKEN

    if (!vercelToken) {
      return NextResponse.json({ error: "Vercel token not configured" }, { status: 500 })
    }

    // Create deployment
    const deployResponse = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        files: [
          {
            file: "index.html",
            data: html,
          },
        ],
        projectSettings: {
          framework: null,
        },
      }),
    })

    const deployData = await deployResponse.json()

    if (!deployResponse.ok) {
      return NextResponse.json({ error: deployData.error?.message || "Deployment failed" }, { status: 500 })
    }

    return NextResponse.json({
      url: `https://${deployData.url}`,
      deploymentId: deployData.id,
    })
  } catch (error) {
    console.error("Deploy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
