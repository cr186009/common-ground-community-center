import assert from "node:assert/strict";
import test from "node:test";

import { parseStoredList } from "./hub-format";
import { partitionEventTags } from "./event-tags";

test("normalizes tags before exposing an accurate overflow count", () => {
  const normalized = parseStoredList(
    '[" Free ", "free", "Kid   friendly", "Outdoors", "Music", "Library"]',
  );
  const { visibleTags, hiddenTags } = partitionEventTags(normalized);

  assert.deepEqual(visibleTags, ["Free", "Kid friendly", "Outdoors", "Music"]);
  assert.deepEqual(hiddenTags, ["Library"]);
  assert.equal(hiddenTags.length, 1);
});

test("does not create overflow when the normalized list fits", () => {
  const normalized = parseStoredList("Free, free, Outdoors");
  const { visibleTags, hiddenTags } = partitionEventTags(normalized);

  assert.deepEqual(visibleTags, ["Free", "Outdoors"]);
  assert.deepEqual(hiddenTags, []);
});
