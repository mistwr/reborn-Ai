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

        return {
          id: user.id,
          email: String(user.email).trim().toLowerCase(),
          name: user.user_metadata?.name || user.user_metadata?.full_name || String(user.email).split("@")[0],
        }
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
      }
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
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
