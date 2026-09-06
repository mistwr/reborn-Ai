import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
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

// Local development only. Never expose a universal credentials login in production.
if (
  process.env.NODE_ENV !== "production" &&
  process.env.AUTH_ENABLE_DEMO_CREDENTIALS === "true" &&
  process.env.AUTH_DEMO_PASSWORD
) {
  providers.push(
    CredentialsProvider({
      name: "Development Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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
}

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
      const email = (user?.email || token?.email || "").toLowerCase()
      token.role = ownerEmails.has(email) ? "owner" : "user"
      token.isFounder = token.role === "owner"
      return token
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub
        session.user.role = token.role || "user"
        session.user.isFounder = Boolean(token.isFounder)
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
