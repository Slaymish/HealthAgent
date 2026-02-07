import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireUserFromInternalRequest } from "../auth.js";
import { loadEnv } from "../env.js";

const hoursThreshold = 36;

export async function alertsRoutes(app: FastifyInstance) {
  const env = loadEnv();

  app.get("/check", async (req, reply) => {
    const user = await requireUserFromInternalRequest({ req, reply, env });
    if (!user) return;

    const lastIngest = await prisma.ingestFile.findFirst({
      where: { userId: user.id },
      orderBy: { receivedAt: "desc" }
    });

    const now = new Date();
    const thresholdMs = hoursThreshold * 60 * 60 * 1000;
    const isStale = lastIngest
      ? now.getTime() - lastIngest.receivedAt.getTime() > thresholdMs
      : true;

    if (isStale) {
      const hoursSinceLastIngest = lastIngest
        ? Math.floor((now.getTime() - lastIngest.receivedAt.getTime()) / (60 * 60 * 1000))
        : null;

      return reply.code(200).send({
        alert: {
          type: lastIngest ? "stale_data" : "no_data",
          message: lastIngest
            ? `Last health data ingest was ${hoursSinceLastIngest} hours ago (threshold: ${hoursThreshold} hours)`
            : "No health data has been ingested yet",
          details: {
            lastIngestReceivedAt: lastIngest?.receivedAt ?? null,
            hoursSinceLastIngest,
            thresholdHours: hoursThreshold
          }
        }
      });
    }

    return reply.code(200).send({
      alert: null
    });
  });
}
