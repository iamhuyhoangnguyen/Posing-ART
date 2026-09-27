import assert from "node:assert/strict";
import { test } from "node:test";
import { withGeminiUnavailableRetry } from "../src/services/geminiRetry";

test("retries Gemini 503 twice using the configured backoff then succeeds", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const result = await withGeminiUnavailableRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error("temporarily unavailable"), { status: 503 });
    return "ok";
  }, {
    wait: async (delayMs) => { delays.push(delayMs); },
  });

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [500, 1500]);
});

test("does not retry 429 quota errors or malformed-request errors", async () => {
  for (const error of [
    Object.assign(new Error("quota exceeded"), { status: 429 }),
    Object.assign(new Error("invalid request"), { status: 400 }),
  ]) {
    let attempts = 0;
    await assert.rejects(withGeminiUnavailableRetry(async () => {
      attempts += 1;
      throw error;
    }, { wait: async () => { throw new Error("unexpected retry delay"); } }), error);
    assert.equal(attempts, 1);
  }
});

test("stops after two retries when Gemini remains unavailable", async () => {
  let attempts = 0;
  const retryNumbers: number[] = [];
  await assert.rejects(withGeminiUnavailableRetry(async () => {
    attempts += 1;
    throw Object.assign(new Error(JSON.stringify({ error: { code: 503, status: "UNAVAILABLE" } })), { status: 503 });
  }, {
    wait: async () => undefined,
    onRetry: (retryNumber) => retryNumbers.push(retryNumber),
  }));

  assert.equal(attempts, 3);
  assert.deepEqual(retryNumbers, [1, 2]);
});
