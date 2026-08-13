import assert from "node:assert/strict";
import test from "node:test";

import { sendOwnerNotification } from "./notifications";

test("owner notifications default to Chris and use the configured provider", async (t) => {
  const priorKey = process.env.RESEND_API_KEY;
  const priorRecipient = process.env.ADMIN_NOTIFICATION_EMAIL;
  const priorFetch = global.fetch;
  process.env.RESEND_API_KEY = "test-key";
  delete process.env.ADMIN_NOTIFICATION_EMAIL;
  let requestBody = "";
  global.fetch = async (_input, init) => {
    requestBody = String(init?.body);
    return new Response(JSON.stringify({ id: "email-1" }), { status: 200 });
  };
  t.after(() => {
    process.env.RESEND_API_KEY = priorKey;
    process.env.ADMIN_NOTIFICATION_EMAIL = priorRecipient;
    global.fetch = priorFetch;
  });

  const result = await sendOwnerNotification({ subject: "New registration", text: "Saved" });
  assert.equal(result.sent, true);
  assert.match(requestBody, /chris\.a\.robertson@gmail\.com/);
  assert.match(requestBody, /New registration/);
});
