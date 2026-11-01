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

  // Unit conversion: a US-locale export sends lb and mi. Downstream assumes kg
  // and km, so the parser must convert rather than storing the raw qty.
  const usPayload = {
    data: {
      metrics: [
        {
          name: "weight_body_mass",
          units: "lb",
          data: [{ date: "2026-02-01 07:00:00 +0000", qty: 180, source: "Health" }]
        }
      ],
      workouts: [
        {
          name: "Run",
          start: "2026-02-01 08:00:00 +0000",
          end: "2026-02-01 08:30:00 +0000",
          duration: 1800,
          distance: { qty: 3.1, units: "mi" },
          speed: { qty: 6.2, units: "mi/hr" }
        }
      ]
    }
  };
  const usResult = parseHealthAutoExport(usPayload);

  const usWeight = usResult.rows.dailyWeights[0]?.weightKg;
  assert.ok(usWeight != null, "expected a converted weight row");
  assert.ok(Math.abs((usWeight as number) - 81.6466) < 0.01, `180 lb should be ~81.65 kg, got ${usWeight}`);

  const usWorkout = usResult.rows.workouts[0];
  if (!usWorkout) throw new Error("expected a converted workout row");
  assert.ok(
    Math.abs((usWorkout.distanceKm as number) - 4.98895) < 0.001,
    `3.1 mi should be ~4.989 km, got ${usWorkout.distanceKm}`
  );
  assert.ok(
    Math.abs((usWorkout.avgPace as number) - 6.0134) < 0.01,
    `6.2 mi/hr should be ~6.01 min/km, got ${usWorkout.avgPace}`
  );
  assert.ok(
    usResult.warnings.some((w) => w.includes("converted to kg")),
    "expected a note that weight units were converted"
  );

  // Identity must survive the conversion: the pre-conversion parser hashed the
  // raw quantity, so the same workout re-exported in km has to keep the same
  // sourceId or ingest inserts a duplicate instead of updating the row.
  const kmPayload = {
    data: {
      metrics: [],
      workouts: [
        {
          name: "Run",
          start: "2026-02-01 08:00:00 +0000",
          end: "2026-02-01 08:30:00 +0000",
          duration: 1800,
          distance: { qty: 3.1 },
          speed: { qty: 6.2 }
        }
      ]
    }
  };
  const kmResult = parseHealthAutoExport(kmPayload);
  assert.equal(
    usResult.rows.workouts[0]?.sourceId,
    kmResult.rows.workouts[0]?.sourceId,
    "converting units must not change the workout sourceId"
  );
  assert.ok(
    (kmResult.rows.workouts[0]?.distanceKm as number) !== (usWorkout.distanceKm as number),
    "the stored distance should still differ between km and mi input"
  );

  // Unknown units are skipped with a warning, never stored as if they were kg.
  const unknownPayload = {
    data: {
      metrics: [
        {
          name: "weight_body_mass",
          units: "stone",
          data: [{ date: "2026-02-02 07:00:00 +0000", qty: 12 }]
        }
      ],
      workouts: [
        {
          id: "odd-run",
          name: "Row",
          start: "2026-02-02 08:00:00 +0000",
          end: "2026-02-02 08:30:00 +0000",
          duration: 1800,
          distance: { qty: 5000, units: "furlong" }
        }
      ]
    }
  };
  const unknownResult = parseHealthAutoExport(unknownPayload);
  assert.equal(unknownResult.rows.dailyWeights.length, 0, "unknown weight units must not produce a weight row");
  assert.equal(unknownResult.rows.workouts[0]?.distanceKm ?? null, null, "unknown distance units must not produce a distance");
  assert.ok(
    unknownResult.warnings.some((w) => w.includes("weight_body_mass units 'stone'")),
    "expected a warning for the unknown weight unit"
  );
  assert.ok(
    unknownResult.warnings.some((w) => w.includes("distance units 'furlong'")),
    "expected a warning for the unknown distance unit"
  );

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
