import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";
import { requireUserFromInternalRequest } from "../auth.js";
import { loadEnv } from "../env.js";

interface HealthCheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message?: string;
  details?: unknown;
}

export async function healthRoutes(app: FastifyInstance) {
  const env = loadEnv();

  app.get("/full", async (req, reply) => {
    const user = await requireUserFromInternalRequest({ req, reply, env });
    if (!user) return;

    const results: HealthCheckResult[] = [];

    // 1. Database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.push({
        name: "database",
        status: "pass",
        message: "Database connection successful"
      });
    } catch (error) {
      results.push({
        name: "database",
        status: "fail",
        message: "Database connection failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // 2. Ingest state (check for recent data)
    const lastIngest = await prisma.ingestFile.findFirst({
      where: { userId: user.id },
      orderBy: { receivedAt: "desc" }
    });

    if (!lastIngest) {
      results.push({
        name: "ingest_state",
        status: "warn",
        message: "No health data ingested yet"
      });
    } else {
      const hoursSinceLastIngest = Math.floor(
        (Date.now() - lastIngest.receivedAt.getTime()) / (60 * 60 * 1000)
      );

      results.push({
        name: "ingest_state",
        status: "pass",
        message: `Last ingest: ${hoursSinceLastIngest} hours ago`,
        details: {
          lastIngestReceivedAt: lastIngest.receivedAt,
          hoursSinceLastIngest
        }
      });
    }

    // 3. Configuration checks
    const configChecks: HealthCheckResult[] = [];

    if (!env.INGEST_TOKEN) {
      configChecks.push({
        name: "ingest_token",
        status: "warn",
        message: "INGEST_TOKEN not configured"
      });
    } else {
      configChecks.push({
        name: "ingest_token",
        status: "pass",
        message: "INGEST_TOKEN configured"
      });
    }

    if (!env.DATABASE_URL) {
      configChecks.push({
        name: "database_url",
        status: "fail",
        message: "DATABASE_URL not configured"
      });
    } else {
      configChecks.push({
        name: "database_url",
        status: "pass",
        message: "DATABASE_URL configured"
      });
    }

    if (env.INSIGHTS_ENABLED && !env.OPENAI_API_KEY) {
      configChecks.push({
        name: "openai_key",
        status: "warn",
        message: "INSIGHTS_ENABLED=true but OPENAI_API_KEY not configured"
      });
    } else if (!env.INSIGHTS_ENABLED) {
      configChecks.push({
        name: "openai_key",
        status: "pass",
        message: "INSIGHTS_ENABLED=false"
      });
    } else {
      configChecks.push({
        name: "openai_key",
        status: "pass",
        message: "OPENAI_API_KEY configured"
      });
    }

    results.push({
      name: "configuration",
      status: configChecks.some(c => c.status === "fail")
        ? "fail"
        : configChecks.some(c => c.status === "warn")
        ? "warn"
        : "pass",
      message: `${configChecks.filter(c => c.status === "pass").length}/${configChecks.length} config checks passed`,
      details: configChecks
    });

    // Determine overall status
    const hasFailures = results.some(r => r.status === "fail");
    const hasWarnings = results.some(r => r.status === "warn");

    const overallStatus = hasFailures ? "fail" : hasWarnings ? "warn" : "pass";
    const statusCode = overallStatus === "fail" ? 503 : 200;

    return reply.code(statusCode).send({
      status: overallStatus,
      checks: results
    });
  });
}
