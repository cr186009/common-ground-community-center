import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSubmissionHref,
  parseSubmissionContext,
} from "./submission-context";

test("parseSubmissionContext preserves supported location and type values", () => {
  assert.deepEqual(
    parseSubmissionContext({
      city: "Dallas",
      county: "Paulding",
      submissionType: "VOLUNTEER",
    }),
    {
      city: "Dallas",
      county: "Paulding",
      submissionType: "VOLUNTEER",
    },
  );
});

test("parseSubmissionContext drops unknown public query values", () => {
  assert.deepEqual(
    parseSubmissionContext({
      city: "Elsewhere",
      county: "Unknown",
      submissionType: "ADMIN_ONLY",
    }),
    {},
  );
});

test("buildSubmissionHref carries safe context to the form", () => {
  assert.equal(
    buildSubmissionHref({
      city: "Powder Springs",
      county: "Cobb",
      submissionType: "EVENT",
    }),
    "/submit?city=Powder+Springs&county=Cobb&submissionType=EVENT",
  );
});
