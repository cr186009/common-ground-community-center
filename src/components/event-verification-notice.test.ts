import assert from "node:assert/strict";
import test from "node:test";

import { getVerificationNoticeLabel } from "./event-verification-notice";

test("verified source times do not show a verification notice", () => {
  assert.equal(getVerificationNoticeLabel("VERIFIED", "VERIFIED"), null);
  assert.equal(getVerificationNoticeLabel("SOURCE_LISTED", "SOURCE_LISTED"), null);
});

test("unverified source times are described without contradicting the listed time", () => {
  assert.equal(
    getVerificationNoticeLabel("VERIFIED", "MISSING_EVIDENCE"),
    "Time listed by source; not independently verified",
  );
  assert.equal(
    getVerificationNoticeLabel("MISSING_EVIDENCE", "MISSING_EVIDENCE"),
    "Date not yet verified. Time listed by source; not independently verified",
  );
});
