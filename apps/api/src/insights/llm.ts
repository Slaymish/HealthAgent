import { spawn } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";
import { INSIGHTS_DEFAULT_SYSTEM_PROMPT } from "@health-agent/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TINKER_MODEL_PATH =
  "tinker://1bdf299a-25aa-5110-877d-9ce6c42f64af:train:0/sampler_weights/insights-agent-model";
const DEFAULT_TINKER_BRIDGE_CMD = "python3";

type FetchImpl = typeof fetch;

export function buildInsightsPrompts(params: {
  previousMarkdown: string;
  metricsPack: unknown;
  systemPrompt?: string | null;
}): { system: string; user: string } {
  const { previousMarkdown, metricsPack, systemPrompt } = params;

  const baseSystem = INSIGHTS_DEFAULT_SYSTEM_PROMPT;
  const trimmedSystemPrompt = systemPrompt?.trim();
  const system = trimmedSystemPrompt
    ? `${baseSystem}\n\nUser preferences:\n${trimmedSystemPrompt}`
    : baseSystem;

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

  return { system, user };
}

export function buildTinkerInvocation(params: {
  bridgeCommand: string;
  bridgeScriptPath: string;
  modelPath: string;
  userInput: string;
  systemPrompt: string;
}): { command: string; args: string[] } {
  const { bridgeCommand, bridgeScriptPath, modelPath, userInput, systemPrompt } = params;
  return {
    command: bridgeCommand,
    args: [bridgeScriptPath, modelPath, userInput, systemPrompt]
  };
}

async function runTinkerBridge(params: {
  userInput: string;
  systemPrompt: string;
  timeoutMs: number;
  bridgeCommand?: string;
  modelPath?: string;
}): Promise<string> {
  const {
    userInput,
    systemPrompt,
    timeoutMs,
    bridgeCommand = process.env.TINKER_BRIDGE_CMD ?? DEFAULT_TINKER_BRIDGE_CMD,
    modelPath = process.env.TINKER_MODEL_PATH ?? DEFAULT_TINKER_MODEL_PATH
  } = params;
  // Resolved path to bridge file (in apps/api directory)
  // __dirname will be /app/apps/api/dist/insights/ at runtime
  // We need to go from there to /app/apps/api/tinker_bridge.py
  const bridgeScriptPath = path.resolve(__dirname, "../../tinker_bridge.py");
  const invocation = buildTinkerInvocation({
    bridgeCommand,
    bridgeScriptPath,
    modelPath,
    userInput,
    systemPrompt
  });

  return new Promise<string>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let settled = false;
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      if (settled) return;
      settled = true;
      reject(new Error(`Tinker sampling timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    function finish(fn: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    }

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      finish(() => reject(new Error(`Tinker bridge failed to start: ${err.message}`)));
    });
    child.on("close", (code, signal) => {
      if (code === 0) {
        finish(() => resolve(stdout.trim()));
        return;
      }
      const detail = stderr.trim() || (signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`);
      finish(() => reject(new Error(`Tinker sampling failed: ${detail}`)));
    });
  });
}

async function runOpenAI(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userInput: string;
  timeoutMs: number;
  fetchImpl?: FetchImpl;
}): Promise<string> {
  const { apiKey, model, systemPrompt, userInput, timeoutMs, fetchImpl = fetch } = params;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ]
      }),
      signal: controller.signal
    });

    const payload = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string | null } }>; error?: { message?: string } }
      | null;

    if (!res.ok) {
      const reason = payload?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`OpenAI request failed: ${reason}`);
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenAI response did not contain message content");
    }
    return content;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenAI request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateInsightsUnifiedDiff(
  params: {
    apiKey: string;
    model: string;
    previousMarkdown: string;
    metricsPack: unknown;
    systemPrompt?: string | null;
    openaiTimeoutMs?: number;
    tinkerTimeoutMs?: number;
    tinkerBridgeCommand?: string;
    tinkerModelPath?: string;
  },
  options?: { fetchImpl?: FetchImpl }
): Promise<string> {
  const {
    apiKey,
    model,
    previousMarkdown,
    metricsPack,
    systemPrompt,
    openaiTimeoutMs = 45000,
    tinkerTimeoutMs = 90000,
    tinkerBridgeCommand,
    tinkerModelPath
  } = params;
  const { system, user } = buildInsightsPrompts({ previousMarkdown, metricsPack, systemPrompt });
  const userInput = `HEALTH_SUMMARY: ${user}`;

  if (model === "tinker") {
    return runTinkerBridge({
      userInput,
      systemPrompt: system,
      timeoutMs: tinkerTimeoutMs,
      bridgeCommand: tinkerBridgeCommand,
      modelPath: tinkerModelPath
    });
  }

  return runOpenAI({
    apiKey,
    model,
    systemPrompt: system,
    userInput,
    timeoutMs: openaiTimeoutMs,
    fetchImpl: options?.fetchImpl
  });
}
