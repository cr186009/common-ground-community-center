import assert from "node:assert/strict";
import test from "node:test";

import {
  auditScraperInventory,
  getInventoryMismatch,
} from "@/server/scraper-inventory";

test("inventory matching ignores casing and repeated whitespace", () => {
  const audit = auditScraperInventory(
    ["Paulding Calendar", "Database only"],
    ["  paulding   calendar ", "Registry only"],
  );

  assert.deepEqual(audit.matched, ["Paulding Calendar"]);
  assert.deepEqual(audit.databaseOnly, ["Database only"]);
  assert.deepEqual(audit.registryOnly, ["Registry only"]);
  assert.equal(getInventoryMismatch("PAULDING CALENDAR", ["Paulding Calendar"]), "NONE");
  assert.equal(getInventoryMismatch("Unknown", ["Paulding Calendar"]), "DATABASE_ONLY");
});

test("inventory audit reports normalized duplicate database names", () => {
  const audit = auditScraperInventory(
    ["City Events", " city   events "],
    ["City Events"],
  );

  assert.equal(audit.duplicateDatabaseNames.length, 1);
  assert.deepEqual(audit.duplicateDatabaseNames[0], ["City Events", " city   events "]);
});
