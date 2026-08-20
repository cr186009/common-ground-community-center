import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInterestEmail, normalizePublicFirstName } from "./event-interest";

test("interest email identity is case insensitive", () => {
  assert.equal(normalizeInterestEmail(" Neighbor@Example.COM "), "neighbor@example.com");
});

test("public interest names retain only a safe first name", () => {
  assert.equal(normalizePublicFirstName("  María Robertson  "), "María");
  assert.equal(normalizePublicFirstName("<script> Chris"), "script");
});
