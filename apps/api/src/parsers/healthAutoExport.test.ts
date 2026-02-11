import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseHealthAutoExport } from "./healthAutoExport.js";

async function run() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const samplePath = path.join(here, "fixtures/healthAutoExport.sample.json");

  const raw = await fs.readFile(samplePath, "utf8");
  const payload = JSON.parse(raw) as unknown;

  const result = parseHealthAutoExport(payload);

  assert.ok(result.rows.dailyNutrition.length > 0, "expected nutrition rows");
  assert.ok(result.rows.dailyVitals.length > 0, "expected vitals rows");
  assert.ok(result.rows.workouts.length > 0, "expected workout rows");
  assert.ok(result.rows.sleepSessions.length > 0, "expected sleep session rows");

  // Sanity: calories should be in kcal range, not kJ.
  const withCalories = result.rows.dailyNutrition.filter((n) => typeof n.calories === "number");
  assert.ok(withCalories.length > 0, "expected at least one day with calories");
  const maxCalories = Math.max(...withCalories.map((n) => n.calories as number));
  assert.ok(maxCalories < 10000, "calories look unconverted (too large)");

  // Workouts should have stable source IDs.
  assert.ok(result.rows.workouts.some((w) => typeof w.sourceId === "string" && w.sourceId.length > 0));

  // Sleep sessions should have stable dedupe keys.
  assert.ok(result.rows.sleepSessions.some((s) => typeof s.dedupeKey === "string" && s.dedupeKey.length > 0));

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        counts: {
          weights: result.rows.dailyWeights.length,
          nutrition: result.rows.dailyNutrition.length,
          vitals: result.rows.dailyVitals.length,
          workouts: result.rows.workouts.length,
          sleep: result.rows.sleepSessions.length
        },
        warnings: result.warnings
      },
      null,
      2
    )
  );
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
