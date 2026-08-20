import assert from "node:assert/strict";
import test from "node:test";

import { getSourceItemIdentity } from "./source-item-identity";

test("CivicPlus identity uses EID and ignores changing calendar navigation parameters", () => {
  assert.equal(
    getSourceItemIdentity("https://www.paulding.gov/Calendar.aspx?EID=2015&month=8&year=2026&day=13&calType=0"),
    getSourceItemIdentity("https://www.paulding.gov/calendar.aspx?EID=2015&month=8&year=2026&day=20&calType=0"),
  );
});

test("different CivicPlus EIDs remain different records", () => {
  assert.notEqual(
    getSourceItemIdentity("https://www.paulding.gov/calendar.aspx?EID=2015&day=13"),
    getSourceItemIdentity("https://www.paulding.gov/calendar.aspx?EID=2037&day=13"),
  );
});
