import assert from "node:assert/strict";
import test from "node:test";

import {
  collectDetailUrls,
  findJsonLdEvent,
} from "@/server/hub-scrapers/sources/mydallasga";

test("MyDallasGA listing canonicalizes detail links and ignores share variants", () => {
  const html = `
    <a href="/event-details-registration/food-truck-friday">Learn more</a>
    <a href="https://www.mydallasga.com/event-details-registration/food-truck-friday?utm_source=x">Duplicate</a>
    <a href="https://www.mydallasga.com/event-details-registration/food-truck-friday&quote=share">Share</a>
    <a href="https://example.com/event-details-registration/not-official">Other site</a>`;

  assert.deepEqual(Array.from(collectDetailUrls(html, "https://www.mydallasga.com/events")), [
    "https://www.mydallasga.com/event-details-registration/food-truck-friday",
  ]);
});

test("MyDallasGA parser reads the official JSON-LD event schedule", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Food Truck Friday",
    startDate: "2026-08-21T18:00:00-04:00",
    endDate: "2026-08-21T22:00:00-04:00",
  })}</script>`;

  assert.equal(findJsonLdEvent(html)?.startDate, "2026-08-21T18:00:00-04:00");
});
