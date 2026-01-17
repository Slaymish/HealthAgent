// Helper to safely read the session without failing the page render.
// Falls back to null when auth is misconfigured (e.g., missing secret) or throws.
export async function getSessionOrNull() {
  // If no secret is present at all, skip calling auth to avoid runtime crashes.
  if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    return null;
  }

  try {
    const { auth } = await import("../auth");
    return await auth();
  } catch (err) {
    console.error("auth_failed", err);
    return null;
  }
}
