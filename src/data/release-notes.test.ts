import assert from "node:assert/strict";
import test from "node:test";

import { RELEASE_NOTES } from "@/data/release-notes";

test("release notes use unique slugs and appear newest first", () => {
  const slugs = RELEASE_NOTES.map((release) => release.slug);
  const dates = RELEASE_NOTES.map((release) => release.publishedOn);

  assert.equal(new Set(slugs).size, slugs.length);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test("release notes contain useful plain-language content", () => {
  for (const release of RELEASE_NOTES) {
    assert.match(release.publishedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(release.title.length > 0);
    assert.ok(release.summary.length > 0);
    assert.ok(release.highlights.length > 0);
    if (release.version) assert.match(release.version, /^\d+\.\d+\.\d+$/);
  }
});

test("versioned releases use unique semantic versions", () => {
  const versions = RELEASE_NOTES.flatMap((release) => release.version ? [release.version] : []);
  assert.equal(new Set(versions).size, versions.length);
  assert.equal(RELEASE_NOTES[0].version, "2.1.0");
});
