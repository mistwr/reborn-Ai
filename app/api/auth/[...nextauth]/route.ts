import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { isUserPro } from "@/lib/billing/store"

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
const SUPABASE_URL = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_URL?.trim() || "https://yqninaripblwhcfcwwnr.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_PUBLISHABLE_KEY?.trim() || "sb_publishable_zlhSNpfeS3gjBDPsxOPiCQ_DYkKwgb_"

const ownerEmails = new Set(
  (process.env.REBORN_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

const providers: any[] = []

async function loadLuminAccount(userId: string, accessToken: string) {
  try {
    const accountResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/lumin_accounts?user_id=eq.${encodeURIComponent(userId)}&select=account_type,active_organization_id,onboarding_completed,display_name&limit=1`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    )

    const accounts = await accountResponse.json().catch(() => [])
    if (!accountResponse.ok || !Array.isArray(accounts) || !accounts[0]) return null

    const account = accounts[0]
    let organization: any = null

    if (account.active_organization_id) {
      const orgResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/lumin_organizations?id=eq.${encodeURIComponent(account.active_organization_id)}&select=id,name,sector,website,plan&limit=1`,
        {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      )
      const orgs = await orgResponse.json().catch(() => [])
      if (orgResponse.ok && Array.isArray(orgs)) organization = orgs[0] || null
    }

    return { account, organization }
  } catch (error) {
    console.error("[Lumin Auth] could not load account context", error)
    return null
  }
}

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  )
}

providers.push(
  CredentialsProvider({
    name: "Lumin OTP",
    credentials: {
      accessToken: { label: "Supabase access token", type: "text" },
      email: { label: "Email", type: "email" },
      password: { label: "Development password", type: "password" },
    },
    async authorize(credentials) {
      const accessToken = credentials?.accessToken?.trim()

      if (accessToken) {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })
        const user = await response.json().catch(() => null)
        if (!response.ok || !user?.id || !user?.email) return null

        const context = await loadLuminAccount(user.id, accessToken)
        const account = context?.account
        const organization = context?.organization

        return {
          id: user.id,
          email: String(user.email).trim().toLowerCase(),
          name: account?.display_name || user.user_metadata?.name || user.user_metadata?.full_name || String(user.email).split("@")[0],
          accountType: account?.account_type || "personal",
          onboardingCompleted: Boolean(account?.onboarding_completed),
          organizationId: organization?.id || account?.active_organization_id || null,
          organizationName: organization?.name || null,
          organizationSector: organization?.sector || null,
          organizationWebsite: organization?.website || null,
          organizationPlan: organization?.plan || null,
        } as any
      }

      const demoAllowed =
        process.env.NODE_ENV !== "production" &&
        process.env.AUTH_ENABLE_DEMO_CREDENTIALS === "true" &&
        Boolean(process.env.AUTH_DEMO_PASSWORD)

      if (!demoAllowed) return null

      const email = credentials?.email?.trim().toLowerCase()
      const password = credentials?.password
      if (!email || password !== process.env.AUTH_DEMO_PASSWORD) return null

      return {
        id: `dev:${email}`,
        email,
        name: email.split("@")[0],
        accountType: "personal",
        onboardingCompleted: true,
      } as any
    },
  }),
)

export const authOptions = {
  providers,
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: any) {
      const email = (user?.email || token?.email || "").trim().toLowerCase()
      const isFounder = ownerEmails.has(email)

      if (user) {
        token.accountType = user.accountType || token.accountType || "personal"
        token.onboardingCompleted = user.onboardingCompleted ?? token.onboardingCompleted ?? false
        token.organizationId = user.organizationId ?? token.organizationId ?? null
        token.organizationName = user.organizationName ?? token.organizationName ?? null
        token.organizationSector = user.organizationSector ?? token.organizationSector ?? null
        token.organizationWebsite = user.organizationWebsite ?? token.organizationWebsite ?? null
        token.organizationPlan = user.organizationPlan ?? token.organizationPlan ?? null
      }

      token.role = isFounder ? "owner" : "user"
      token.isFounder = isFounder

      if (isFounder) {
        token.plan = "pro"
        token.isPro = true
      } else if (email) {
        try {
          token.isPro = await isUserPro(email)
          token.plan = token.isPro ? "pro" : "free"
        } catch (error) {
          console.error("[Lumin Auth] could not resolve billing plan", error)
          token.isPro = false
          token.plan = "free"
        }
      } else {
        token.isPro = false
        token.plan = "free"
      }

      return token
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub
        session.user.role = token.role || "user"
        session.user.isFounder = Boolean(token.isFounder)
        session.user.plan = token.plan || "free"
        session.user.isPro = Boolean(token.isPro)
        session.user.accountType = token.accountType || "personal"
        session.user.onboardingCompleted = Boolean(token.onboardingCompleted)
        session.user.organizationId = token.organizationId || null
        session.user.organizationName = token.organizationName || null
        session.user.organizationSector = token.organizationSector || null
        session.user.organizationWebsite = token.organizationWebsite || null
        session.user.organizationPlan = token.organizationPlan || null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
