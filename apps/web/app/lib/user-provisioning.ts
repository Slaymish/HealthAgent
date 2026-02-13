import { prisma } from "./prisma";
import { generateIngestToken, hashToken } from "./tokens";

export async function ensureUserHasIngestToken(userId: string): Promise<{ preview: string; token?: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ingestTokenHash: true, ingestTokenPreview: true }
  });
  if (!user) return null;

  if (user.ingestTokenHash && user.ingestTokenHash.length === 64) {
    return { preview: user.ingestTokenPreview };
  }

  const token = generateIngestToken();
  const hash = hashToken(token);
  const preview = token.slice(-6);

  await prisma.user.update({
    where: { id: userId },
    data: { ingestTokenHash: hash, ingestTokenPreview: preview }
  });

  return { token, preview };
}
