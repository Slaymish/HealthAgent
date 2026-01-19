import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth";
import { prisma } from "../../lib/prisma";

type PreferencesPayload = {
  targetWeightKg?: number | null;
  targetCalories?: number | null;
  targetProteinG?: number | null;
  targetFatG?: number | null;
  targetCarbsG?: number | null;
  targetSleepHours?: number | null;
  targetTrainingSessions?: number | null;
  targetFibreG?: number | null;
  insightsSystemPrompt?: string | null;
};

function parseNumberField(
  body: Record<string, unknown>,
  key: keyof PreferencesPayload,
  options?: { min?: number; int?: boolean }
): number | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined;
  const value = body[key];
  if (value === null) return null;
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`Invalid ${key}`);
  }
  if (options?.int && !Number.isInteger(value)) {
    throw new Error(`Invalid ${key}`);
  }
  if (options?.min != null && value < options.min) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function parseTextField(body: Record<string, unknown>, key: keyof PreferencesPayload): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined;
  const value = body[key];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`Invalid ${key}`);
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      targetWeightKg: true,
      targetCalories: true,
      targetProteinG: true,
      targetFatG: true,
      targetCarbsG: true,
      targetSleepHours: true,
      targetTrainingSessions: true,
      targetFibreG: true,
      insightsSystemPrompt: true
    }
  });

  return NextResponse.json({ preferences: user ?? null });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (err) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const data: PreferencesPayload = {};
    const weight = parseNumberField(body, "targetWeightKg", { min: 0.1 });
    if (weight !== undefined) data.targetWeightKg = weight;
    const calories = parseNumberField(body, "targetCalories", { min: 1, int: true });
    if (calories !== undefined) data.targetCalories = calories;
    const protein = parseNumberField(body, "targetProteinG", { min: 0 });
    if (protein !== undefined) data.targetProteinG = protein;
    const fat = parseNumberField(body, "targetFatG", { min: 0 });
    if (fat !== undefined) data.targetFatG = fat;
    const carbs = parseNumberField(body, "targetCarbsG", { min: 0 });
    if (carbs !== undefined) data.targetCarbsG = carbs;
    const sleep = parseNumberField(body, "targetSleepHours", { min: 0 });
    if (sleep !== undefined) data.targetSleepHours = sleep;
    const training = parseNumberField(body, "targetTrainingSessions", { min: 0, int: true });
    if (training !== undefined) data.targetTrainingSessions = training;
    const fibre = parseNumberField(body, "targetFibreG", { min: 0 });
    if (fibre !== undefined) data.targetFibreG = fibre;
    const insightsSystemPrompt = parseTextField(body, "insightsSystemPrompt");
    if (insightsSystemPrompt !== undefined) data.insightsSystemPrompt = insightsSystemPrompt;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        targetWeightKg: true,
        targetCalories: true,
        targetProteinG: true,
        targetFatG: true,
        targetCarbsG: true,
        targetSleepHours: true,
        targetTrainingSessions: true,
        targetFibreG: true,
        insightsSystemPrompt: true
      }
    });

    return NextResponse.json({ preferences: user });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "invalid_input" }, { status: 400 });
  }
}
