// Helper to safely read the session without failing the page render.
// Falls back to null when auth is misconfigured (e.g., missing secret) or throws.
export async function getSessionOrNull() {
  try {
    const [{ getServerSession }, { authOptions }] = await Promise.all([
      import("next-auth/next"),
      import("../auth")
    ]);
    return await getServerSession(authOptions);
  } catch (err) {
    console.error("auth_failed", err);
    return null;
  }
}
