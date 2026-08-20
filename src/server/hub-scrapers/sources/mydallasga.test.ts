import assert from "node:assert/strict";
import test from "node:test";

import {
  collectDetailUrls,
  findJsonLdEvent,
  parseMyDallasEventDetail,
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

test("MyDallasGA parser finds Event data nested in a JSON-LD graph", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "Downtown Dallas" },
      { "@type": ["Event"], name: "Concert", startDate: "2026-09-12T19:00:00-04:00" },
    ],
  })}</script>`;

  assert.equal(findJsonLdEvent(html)?.name, "Concert");
});

test("MyDallasGA detail parser preserves all-day dates in Eastern time", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Event",
    name: "Downtown Festival",
    startDate: "2026-09-12",
    location: {
      "@type": "Place",
      name: "Downtown Dallas",
      address: { streetAddress: "123 Main St", addressLocality: "Dallas" },
    },
  })}</script>`;

  const event = parseMyDallasEventDetail(
    html,
    "https://www.mydallasga.com/event-details-registration/downtown-festival",
    { name: "Downtown Dallas / MyDallasGA", url: "https://www.mydallasga.com/events" },
  );

  assert.equal(event?.isAllDay, true);
  assert.equal(event?.startDateTime.toISOString(), "2026-09-12T04:00:00.000Z");
  assert.equal(event?.address, "123 Main St");
});

test("MyDallasGA detail parser excludes cancelled and explicitly out-of-city events", () => {
  const makeHtml = (event: object) =>
    `<script type="application/ld+json">${JSON.stringify({ "@type": "Event", ...event })}</script>`;
  const source = { name: "Downtown Dallas / MyDallasGA", url: "https://www.mydallasga.com/events" };
  const detailUrl = "https://www.mydallasga.com/event-details-registration/example";

  assert.equal(parseMyDallasEventDetail(makeHtml({
    name: "Cancelled concert",
    startDate: "2026-09-12T19:00:00-04:00",
    eventStatus: "https://schema.org/EventCancelled",
  }), detailUrl, source), null);

  assert.equal(parseMyDallasEventDetail(makeHtml({
    name: "Out of town concert",
    startDate: "2026-09-12T19:00:00-04:00",
    location: { address: { addressLocality: "Atlanta" } },
  }), detailUrl, source), null);
});
