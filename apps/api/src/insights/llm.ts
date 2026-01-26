import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { INSIGHTS_DEFAULT_SYSTEM_PROMPT } from "@health-agent/shared";
import { loadEnv } from "../env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateInsightsUnifiedDiff(params: {
  apiKey: string;
  model: string;
  previousMarkdown: string;
  metricsPack: unknown;
  systemPrompt?: string | null;
}): Promise<string> {
  const { previousMarkdown, metricsPack, systemPrompt } = params;

  const baseSystem = INSIGHTS_DEFAULT_SYSTEM_PROMPT;
  const trimmedSystemPrompt = systemPrompt?.trim();
  const system = trimmedSystemPrompt ? `${baseSystem}\n\nUser preferences:\n${trimmedSystemPrompt}` : baseSystem;

  const user =
    "Update the insights document using the provided metrics pack.\n" +
    "Rules:\n" +
    "- Grounded: only claim what the numbers support; if missing, say 'Data missing' briefly.\n" +
    "- Be concise and actionable: 4–8 bullets total (match the demo: no prose).\n" +
    "- Single heading only: start with exactly '## Weekly synthesis'. Do NOT use other headings (no '#', no '## Weight', etc.).\n" +
    "- Output must be ONLY the heading line and bullet lines. No paragraphs. Every non-heading line MUST start with '- '.\n" +
    "- Do NOT add empty lines or empty bullets. Every bullet must contain meaningful text.\n" +
    "- Include 1–2 'Next actions' bullets (specific, doable this week).\n" +
    "- Include EXACTLY ONE final bullet starting with '**Numbers used:**' listing the exact numbers you referenced (semicolon-separated).\n" +
    "- Keep the markdown stable: prefer updating existing bullet text over adding lots of new bullets.\n\n" +
    "Target markdown shape (example):\n" +
    "## Weekly synthesis\n" +
    "- **Weight:** <claim> (7d slope X, 14d slope Y; latest Z).\n" +
    "- **Nutrition:** <claim> (kcal 7d vs 14d; protein 7d vs 14d).\n" +
    "- **Training:** <claim> (sessions 7d vs 14d; minutes 7d vs 14d).\n" +
    "- **Sleep:** <claim> (avg 7d vs 14d).\n" +
    "- **Recovery:** <claim> (resting HR 7d vs 14d).\n" +
    "- **Next actions:** <one concrete action>.\n" +
    "- **Numbers used:** Weight …; Calories …; Protein …; Training …; Sleep …; Resting HR ….\n\n" +
    "PREVIOUS MARKDOWN:\n" +
    previousMarkdown +
    "\n\nMETRICS PACK (JSON):\n" +
    JSON.stringify(metricsPack);

  const { TINKER_MODEL_PATH, TINKER_BRIDGE_CMD } = loadEnv();
  // Resolved path to bridge file (at root of apps/api or in base dir)
  const bridgeScriptPath = path.resolve(__dirname, "../../tinker_bridge.py");

  try {
    const command = `${TINKER_BRIDGE_CMD} "${bridgeScriptPath}" "${TINKER_MODEL_PATH}" ${JSON.stringify(`HEALTH_SUMMARY: ${user}`)} ${JSON.stringify(system)}`;
    const output = execSync(command, { encoding: "utf-8" });
    return output.trim();
  } catch (err) {
    console.error("Tinker bridge error:", err);
    throw new Error(`Tinker sampling failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
