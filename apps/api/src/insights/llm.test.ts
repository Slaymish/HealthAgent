import assert from "node:assert/strict";
import { buildInsightsPrompts, buildTinkerInvocation, generateInsightsUnifiedDiff } from "./llm.js";

async function run() {
  const prompts = buildInsightsPrompts({
    previousMarkdown: "## Weekly synthesis\n- Previous\n",
    metricsPack: { weight: { latest: 80 } },
    systemPrompt: "Prefer concise recommendations."
  });
  assert.match(prompts.system, /User preferences:/);
  assert.match(prompts.user, /METRICS PACK \(JSON\):/);

  const malicious = "\"; touch /tmp/pwn #";
  const invocation = buildTinkerInvocation({
    bridgeCommand: "python3",
    bridgeScriptPath: "/app/tinker_bridge.py",
    modelPath: "tinker://model",
    userInput: malicious,
    systemPrompt: "system"
  });
  assert.equal(invocation.command, "python3");
  assert.equal(invocation.args.length, 4);
  assert.equal(invocation.args[2], malicious);

  let fetchCalls = 0;
  const response = await generateInsightsUnifiedDiff(
    {
      apiKey: "test-key",
      model: "gpt-4o-mini",
      previousMarkdown: "## Weekly synthesis\n- Previous\n",
      metricsPack: { weight: { latest: 80 } },
      systemPrompt: null
    },
    {
      fetchImpl: (async (url: string, init?: RequestInit) => {
        fetchCalls += 1;
        assert.equal(url, "https://api.openai.com/v1/chat/completions");
        assert.equal(init?.method, "POST");
        const headers = init?.headers as Record<string, string> | undefined;
        assert.ok(headers);
        assert.equal(headers?.authorization, "Bearer test-key");
        assert.ok(init?.signal, "expected abort signal for timeout handling");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: "## Weekly synthesis\n- Updated\n" } }]
          })
        } as Response;
      }) as any
    }
  );
  assert.equal(fetchCalls, 1);
  assert.equal(response, "## Weekly synthesis\n- Updated");

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true }));
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
