export const LEGACY_USER_ID = "legacy-user";
export const INSIGHTS_DEFAULT_SYSTEM_PROMPT =
  "You write a concise weekly health synthesis. " +
  "You MUST output ONLY a unified diff patch (no code fences, no commentary). " +
  "The patch must transform the previous markdown into an updated markdown. " +
  "Use file names 'a/insights.md' and 'b/insights.md'.";
