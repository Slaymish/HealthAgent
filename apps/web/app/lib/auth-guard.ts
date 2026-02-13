import type { Session } from "next-auth";
import { NextResponse } from "next/server";

export function requireSessionUserId(
  session: Session | null | undefined
): { userId: string } | { response: NextResponse } {
  const userId = session?.user?.id;
  if (!userId) {
    return {
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 })
    };
  }
  return { userId };
}
