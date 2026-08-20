import assert from "node:assert/strict";
import test from "node:test";

import {
  getHighestRankedAlert,
  type AlertBannerItem,
} from "./collapsible-alert-banner";

function alert(
  id: string,
  severity: AlertBannerItem["severity"],
): AlertBannerItem {
  return {
    id,
    title: `${severity} alert`,
    severity,
    severityLabel: severity,
    alertTypeLabel: "Weather",
    sourceUrl: "https://example.com",
    description: null,
  };
}

test("alert summaries consistently select the highest-ranked alert", () => {
  const alerts = [alert("low", "LOW"), alert("emergency", "EMERGENCY"), alert("high", "HIGH")];
  assert.equal(getHighestRankedAlert(alerts)?.id, "emergency");
});

test("equal severity alerts preserve source ordering", () => {
  const alerts = [alert("first", "HIGH"), alert("second", "HIGH")];
  assert.equal(getHighestRankedAlert(alerts)?.id, "first");
  assert.equal(getHighestRankedAlert([]), null);
});
