import assert from "node:assert/strict";
import test from "node:test";

import { evaluateKidFriendlySafety } from "./kid-friendly-classifier";

test("blocks a Spring Awakening-like event despite youth and teen wording", () => {
  const result = evaluateKidFriendlySafety({
    title: "Spring Awakening",
    description:
      "A teen musical with sexual content, suicide, abuse, and mature themes. Viewer discretion advised.",
    tags: ["youth theatre"],
    isKidFriendly: true,
  });

  assert.equal(result.decision, false);
  assert.equal(result.hasConflict, true);
  assert.ok(result.positiveEvidence.includes("children or youth audience"));
  assert.ok(result.blockingReasons.includes("sexual or explicit content"));
  assert.ok(result.blockingReasons.includes("suicide or self-harm content"));
});

test("allows a legitimate event with explicit family audience evidence", () => {
  const result = evaluateKidFriendlySafety({
    title: "Family Storytime in the Park",
    description: "Stories and crafts for toddlers and children with their caregivers.",
    tags: ["library"],
    isKidFriendly: true,
  });

  assert.equal(result.decision, true);
  assert.equal(result.hasConflict, false);
  assert.deepEqual(result.blockingReasons, []);
});

test("does not infer kid-friendly from generic community or school wording", () => {
  const result = evaluateKidFriendlySafety({
    title: "Community School Board Meeting",
    description: "Monthly business meeting.",
    tags: ["school"],
    isKidFriendly: true,
  });

  assert.equal(result.decision, false);
  assert.equal(result.hasConflict, false);
  assert.deepEqual(result.positiveEvidence, []);
});

test("age restrictions block otherwise family-positive wording", () => {
  const result = evaluateKidFriendlySafety({
    title: "Family Trivia After Dark",
    description: "Adults only. Must be 21+ to enter.",
    isKidFriendly: true,
  });

  assert.equal(result.decision, false);
  assert.equal(result.hasConflict, true);
  assert.ok(
    result.blockingReasons.includes("adults-only or age-restricted admission"),
  );
});
