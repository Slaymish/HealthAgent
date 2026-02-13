import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function assertRouteGuards(repoRoot: string) {
  const routes = [
    "apps/web/app/api/sync/route.ts",
    "apps/web/app/api/insights/rerun/route.ts",
    "apps/web/app/api/ingest-token/route.ts",
    "apps/web/app/api/preferences/route.ts"
  ];

  for (const route of routes) {
    const content = await fs.readFile(path.join(repoRoot, route), "utf8");
    assert.match(content, /requireSessionUserId/, `${route} must use shared auth guard`);
    assert.match(content, /auth\.response/, `${route} must return unauthorized guard response`);
    if (route.endsWith("/preferences/route.ts")) {
      assert.match(content, /MAX_INSIGHTS_SYSTEM_PROMPT_CHARS/, "preferences route should enforce prompt length cap");
    }
  }
}

async function assertAuthGuardHelper(repoRoot: string) {
  const content = await fs.readFile(path.join(repoRoot, "apps/web/app/lib/auth-guard.ts"), "utf8");
  assert.match(content, /session\?\.user\?\.id/, "auth guard should resolve session user id");
  assert.match(content, /status:\s*401/, "auth guard should return 401 for unauthorized requests");
}

async function assertPageSmokeContracts(repoRoot: string) {
  const pages = [
    "apps/web/app/page.tsx",
    "apps/web/app/insights/page.tsx",
    "apps/web/app/data-quality/page.tsx"
  ];

  for (const page of pages) {
    const content = await fs.readFile(path.join(repoRoot, page), "utf8");
    assert.match(content, /getSessionOrNull/, `${page} should use safe session helper`);
    assert.match(content, /isDemo/, `${page} should preserve demo fallback behavior`);
  }
}

async function run() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "../../..");
  await assertAuthGuardHelper(repoRoot);
  await assertRouteGuards(repoRoot);
  await assertPageSmokeContracts(repoRoot);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true }));
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
