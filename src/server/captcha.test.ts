import assert from "node:assert/strict";
import test from "node:test";

import { verifyCaptcha } from "./captcha";

test("CAPTCHA rejects a missing token when configured", async (t) => {
  const prior = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  t.after(() => { process.env.TURNSTILE_SECRET_KEY = prior; });
  assert.equal(await verifyCaptcha(""), false);
});

test("CAPTCHA accepts a successful Turnstile response", async (t) => {
  const priorSecret = process.env.TURNSTILE_SECRET_KEY;
  const priorFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  global.fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
  t.after(() => {
    process.env.TURNSTILE_SECRET_KEY = priorSecret;
    global.fetch = priorFetch;
  });
  assert.equal(await verifyCaptcha("valid-token"), true);
});
