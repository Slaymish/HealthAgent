import Link from "next/link";
import { Card, PageHeader } from "../components/ui";
import { getSessionOrNull } from "../lib/session";
import { prisma } from "../lib/prisma";
import PreferencesForm from "./preferences-form";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const session = await getSessionOrNull();

  if (!session?.user?.id) {
    return (
      <div className="section">
        <PageHeader title="Preferences" description="Set your targets for projections and MacroFactor goals." />
        <Card title="Sign in to edit preferences">
          <p className="muted">Create a GitHub session to set your target weight, calories, and macros.</p>
          <Link className="button" href="/api/auth/signin">
            Sign in with GitHub
          </Link>
        </Card>
      </div>
    );
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
      targetFibreG: true
    }
  });

  return (
    <div className="section">
      <PageHeader
        title="Preferences"
        description="Set targets for projections, MacroFactor goals, and recovery baselines."
      />
      <PreferencesForm initial={user ?? null} />
    </div>
  );
}
