import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKnownTitleCorrections,
  cleanPublicText,
  summarizePublicText,
} from "@/server/hub-scrapers/helpers";

test("known title corrections fix exact feed defects without changing proper nouns", () => {
  assert.equal(
    applyKnownTitleCorrections("Open Play: Pickbleball"),
    "Open Play: Pickleball",
  );
  assert.equal(
    applyKnownTitleCorrections("Pickle & Ball Makers Market"),
    "Pickle & Ball Makers Market",
  );
  assert.equal(
    applyKnownTitleCorrections(applyKnownTitleCorrections("Pickbleball")),
    "Pickleball",
  );
});

test("cleanPublicText decodes entities and removes source boilerplate", () => {
  const input = [
    "Music &#038; Food READ MORE »",
    "Music &#038; Food READ MORE »",
    "<p>Bring a chair.&nbsp; Everyone is welcome.</p>",
  ].join("\n\n");

  assert.equal(
    cleanPublicText(input),
    "Music & Food\n\nBring a chair. Everyone is welcome.",
  );
});

test("summarizePublicText returns bounded, word-safe card copy", () => {
  const summary = summarizePublicText(
    "A neighborhood gathering with music, food, games, and local vendors.",
    42,
  );

  assert.equal(summary, "A neighborhood gathering with music…");
  assert.ok(summary.length <= 42);
});
