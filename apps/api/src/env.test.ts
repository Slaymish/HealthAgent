import assert from "node:assert/strict";
import { loadEnv } from "./env.js";

async function run() {
  const base = {
    DATABASE_URL: "postgresql://localhost/db",
    INTERNAL_API_KEY: "internal",
    STORAGE_PROVIDER: "local"
  };

  assert.throws(
    () => loadEnv({ DATABASE_URL: "postgresql://localhost/db" }),
    /INTERNAL_API_KEY/
  );

  const parsed = loadEnv(base);
  assert.equal(parsed.INTERNAL_API_KEY, "internal");
  assert.equal(parsed.PIPELINE_MAX_INGESTS_PER_RUN, 25);

  const overrideParsed = loadEnv({ ...base, PIPELINE_MAX_INGESTS_PER_RUN: "5" });
  assert.equal(overrideParsed.PIPELINE_MAX_INGESTS_PER_RUN, 5);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true }));
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
