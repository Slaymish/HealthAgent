import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth";
import { prisma } from "../../lib/prisma";
import { generateIngestToken, hashToken } from "../../lib/tokens";
import { requireSessionUserId } from "../../lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = requireSessionUserId(session);
  if ("response" in auth) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { ingestTokenPreview: true }
  });

  return NextResponse.json({ preview: user?.ingestTokenPreview ?? null });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = requireSessionUserId(session);
  if ("response" in auth) return auth.response;

  const token = generateIngestToken();
  const preview = token.slice(-6);
  const hashed = hashToken(token);

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      ingestTokenHash: hashed,
      ingestTokenPreview: preview
    }
  });

  return NextResponse.json({ token, preview });
}
