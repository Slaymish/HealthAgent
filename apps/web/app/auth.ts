import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";

const resolvedSecret =
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??
  // Fallback keeps the app from crashing if secret is missing; replace in prod.
  "development-only-secret";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? ""
    })
  ],
  secret: resolvedSecret
};

// Used for server components/actions (session, signIn/signOut helpers).
export const { auth } = NextAuth(authOptions);
