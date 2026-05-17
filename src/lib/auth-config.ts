import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Export authOptions so other modules (or a Next.js route) can import the
// configuration without invoking the handler. Also export a default handler
// which can be used directly in a Next.js route file.
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: { scope: "openid email profile" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // attach access token from provider to the jwt token
        // keep types loose here — NextAuth token is typically a Record<string, any>
        ;(token as any).accessToken = (account as any).access_token
      }
      return token
    },
    async session({ session, token }) {
      ;(session as any).accessToken = (token as any).accessToken
      return session
    },
  },
}

export default NextAuth(authOptions)