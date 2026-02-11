import assert from "node:assert/strict";
import { extractBearerToken, requireUserFromInternalRequest } from "./auth.js";

function makeReply() {
  return {
    statusCode: null as number | null,
    payload: null as unknown,
    code(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    }
  };
}

async function run() {
  assert.equal(extractBearerToken("Bearer abc"), "abc");
  assert.equal(extractBearerToken("bearer xyz"), "xyz");
  assert.equal(extractBearerToken("Basic xyz"), null);
  assert.equal(extractBearerToken(undefined), null);

  const env = {
    INTERNAL_API_KEY: "internal-secret",
    PIPELINE_TOKEN: "pipeline-secret"
  } as any;
  {
    const reply = makeReply();
    const user = await requireUserFromInternalRequest({
      req: { headers: {} } as any,
      reply: reply as any,
      env
    });
    assert.equal(user, null);
    assert.equal(reply.statusCode, 401);
    assert.deepEqual(reply.payload, { error: "unauthorized" });
  }

  {
    const reply = makeReply();
    const user = await requireUserFromInternalRequest({
      req: { headers: { "x-internal-api-key": env.INTERNAL_API_KEY } } as any,
      reply: reply as any,
      env
    });
    assert.equal(user, null);
    assert.equal(reply.statusCode, 400);
    assert.deepEqual(reply.payload, { error: "missing_user" });
  }

  {
    const reply = makeReply();
    const user = await requireUserFromInternalRequest({
      req: { headers: { authorization: "Bearer pipeline-secret" } } as any,
      reply: reply as any,
      env,
      allowPipelineToken: true
    });
    assert.equal(user, null);
    assert.equal(reply.statusCode, 400);
    assert.deepEqual(reply.payload, { error: "missing_user" });
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true }));
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
