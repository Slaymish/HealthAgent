import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Env } from "./env.js";

export async function applyMigrations(env: Env): Promise<void> {
  if (!env.PRISMA_MIGRATE_ON_START) return;

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(moduleDir, "../../..");
  const prismaBin = path.join(repoRoot, "node_modules/.bin/prisma");
  const schemaPath = path.join(repoRoot, "apps/api/prisma/schema.prisma");

  if (!fs.existsSync(prismaBin)) {
    console.warn(
      `[db] Prisma CLI not found at ${prismaBin}. Skipping migrations. ` +
        "Install Prisma CLI (move prisma to dependencies or install dev deps) or set PRISMA_MIGRATE_ON_START=false."
    );
    return;
  }

  console.log("[db] Running prisma migrate deploy to ensure tables are present...");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(prismaBin, ["migrate", "deploy", "--schema", schemaPath], {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`prisma migrate deploy exited with code ${code ?? "unknown"}`));
      }
    });
  });
}
