import assert from "node:assert/strict";
import test from "node:test";

import { sourceIsInUse } from "./sources-section";

test("a source is in use only when it publishes content and has a usable URL", () => {
  assert.equal(sourceIsInUse({ publishedContentCount: 4, url: "https://example.gov/events" }), true);
  assert.equal(sourceIsInUse({ publishedContentCount: 0, url: "https://example.gov/events" }), false);
  assert.equal(sourceIsInUse({ publishedContentCount: 4, url: "" }), false);
  assert.equal(sourceIsInUse({ publishedContentCount: 4, url: "calendar pending" }), false);
});
