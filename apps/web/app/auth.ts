import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import { generateIngestToken, hashToken } from "./lib/tokens";
import { ensureUserHasIngestToken } from "./lib/user-provisioning";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const resolvedSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
if (!resolvedSecret) {
  throw new Error("Missing required environment variable: NEXTAUTH_SECRET (or AUTH_SECRET)");
}

const githubClientId = requireEnv("GITHUB_CLIENT_ID");
const githubClientSecret = requireEnv("GITHUB_CLIENT_SECRET");

const baseAdapter = PrismaAdapter(prisma);
const adapter: Adapter = {
  ...baseAdapter,
  async createUser(data: AdapterUser) {
    const token = generateIngestToken();
    const hash = hashToken(token);
    const preview = token.slice(-6);
    const user = await prisma.user.create({
      data: {
        ...data,
        ingestTokenHash: hash,
        ingestTokenPreview: preview
      }
    });
    return user;
  }
};

export const authOptions: NextAuthOptions = {
  adapter,
  providers: [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret
    })
  ],
  secret: resolvedSecret,
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    }
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await ensureUserHasIngestToken(user.id);
    }
  }
};
