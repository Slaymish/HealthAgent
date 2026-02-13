import { loadDotenv } from "../dotenv.js";
import { loadEnv } from "../env.js";
import { LEGACY_USER_ID, ensureLegacyUser } from "../auth.js";
import { prisma } from "../prisma.js";

const ACTION = "legacy_data_migration";

type Args = {
  targetUserId: string;
  actor: string;
  force: boolean;
};

function parseArgs(argv: string[]): Args {
  let targetUserId = "";
  let actor = "manual-cli";
  let force = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (token === "--target-user-id" || token === "--target") {
      const value = argv[i + 1];
      if (!value) throw new Error(`${token} requires a value`);
      targetUserId = value;
      i += 1;
      continue;
    }
    if (token === "--actor") {
      const value = argv[i + 1];
      if (!value) throw new Error("--actor requires a value");
      actor = value;
      i += 1;
      continue;
    }
    if (token === "--force") {
      force = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      // eslint-disable-next-line no-console
      console.log(
        [
          "Migrate all legacy-user health data to a specific user with audit logging.",
          "",
          "Usage:",
          "  pnpm --filter @health-agent/api legacy:migrate -- --target-user-id <userId> [--actor <name>] [--force]",
          "",
          "Options:",
          "  --target-user-id, --target  Destination user id (required)",
          "  --actor                     Audit actor label (default: manual-cli)",
          "  --force                     Allow migration even if destination user has ingest rows",
          "  -h, --help                  Show help"
        ].join("\n")
      );
      process.exit(0);
    }
    throw new Error(`Unknown arg: ${token}`);
  }

  if (!targetUserId) {
    throw new Error("Missing required --target-user-id");
  }

  return { targetUserId, actor, force };
}

async function writeAudit(params: {
  actor: string;
  status: "success" | "failed" | "skipped";
  targetUserId: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const { actor, status, targetUserId, message, metadata } = params;
  await prisma.adminAuditLog.create({
    data: {
      actor,
      action: ACTION,
      status,
      targetUserId,
      message,
      metadata: metadata as any
    }
  });
}

async function run() {
  loadDotenv();
  const env = loadEnv();
  await ensureLegacyUser(env);

  const args = parseArgs(process.argv.slice(2));
  const { targetUserId, actor, force } = args;

  if (targetUserId === LEGACY_USER_ID) {
    await writeAudit({
      actor,
      status: "failed",
      targetUserId,
      message: "Refused migration: target user cannot be legacy-user."
    });
    throw new Error("target_user_must_not_be_legacy_user");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    await writeAudit({
      actor,
      status: "failed",
      targetUserId,
      message: "Refused migration: target user does not exist."
    });
    throw new Error("target_user_not_found");
  }

  const priorSuccess = await prisma.adminAuditLog.findFirst({
    where: { action: ACTION, status: "success" },
    orderBy: { createdAt: "desc" }
  });
  if (priorSuccess && !force) {
    await writeAudit({
      actor,
      status: "skipped",
      targetUserId,
      message: "Skipped migration: a prior successful legacy migration is already recorded.",
      metadata: { priorAuditId: priorSuccess.id, priorCreatedAt: priorSuccess.createdAt.toISOString() }
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: true, skipped: true, reason: "already_migrated", priorAuditId: priorSuccess.id }));
    return;
  }

  const [legacyIngestCount, targetIngestCount] = await Promise.all([
    prisma.ingestFile.count({ where: { userId: LEGACY_USER_ID } }),
    prisma.ingestFile.count({ where: { userId: targetUserId } })
  ]);

  if (legacyIngestCount === 0) {
    await writeAudit({
      actor,
      status: "skipped",
      targetUserId,
      message: "Skipped migration: no legacy ingest rows to migrate."
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: true, skipped: true, reason: "no_legacy_data" }));
    return;
  }

  if (targetIngestCount > 0 && !force) {
    await writeAudit({
      actor,
      status: "failed",
      targetUserId,
      message: "Refused migration: target user already has ingest rows. Re-run with --force to override.",
      metadata: { targetIngestCount }
    });
    throw new Error("target_user_already_has_data");
  }

  let movedCounts:
    | {
        ingestFiles: number;
        dailyWeight: number;
        dailyNutrition: number;
        dailyVitals: number;
        sleepSessions: number;
        workouts: number;
        pipelineRuns: number;
        insightsDocs: number;
      }
    | null = null;

  try {
    movedCounts = await prisma.$transaction(async (tx) => {
      const [
        ingestFiles,
        dailyWeight,
        dailyNutrition,
        dailyVitals,
        sleepSessions,
        workouts,
        pipelineRuns,
        insightsDocs
      ] = await Promise.all([
        tx.ingestFile.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
        tx.dailyWeight.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
        tx.dailyNutrition.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
        tx.dailyVitals.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
        tx.sleepSession.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
        tx.workout.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
        tx.pipelineRun.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
        tx.insightsDoc.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } })
      ]);

      return {
        ingestFiles: ingestFiles.count,
        dailyWeight: dailyWeight.count,
        dailyNutrition: dailyNutrition.count,
        dailyVitals: dailyVitals.count,
        sleepSessions: sleepSessions.count,
        workouts: workouts.count,
        pipelineRuns: pipelineRuns.count,
        insightsDocs: insightsDocs.count
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeAudit({
      actor,
      status: "failed",
      targetUserId,
      message: `Migration transaction failed: ${message}`
    });
    throw err;
  }

  await writeAudit({
    actor,
    status: "success",
    targetUserId,
    message: "Migrated legacy-user data to target user.",
    metadata: movedCounts ?? {}
  });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, targetUserId, moved: movedCounts ?? {} }, null, 2));
}

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
