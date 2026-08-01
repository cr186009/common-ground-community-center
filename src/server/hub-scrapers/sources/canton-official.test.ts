import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverExploreCantonListings,
  parseCantonEventsHtml,
  parseExploreCantonEventDetail,
} from "./canton-official";

const source = { name: "City of Canton", url: "https://www.cantonga.gov/our-city/city-calendar", city: "Canton", county: "Cherokee" };

test("parses Canton CivicPlus event dates as Eastern time", () => {
  const html = `
    <article class="list-item" data-event-id="812">
      <div class="date">Aug 1 6:00 PM - 10:00 PM</div>
      <span class="sr-only">08/01/2026 6:00 PM</span>
      <span class="sr-only">08/01/2026 10:00 PM</span>
      <h3 class="item-title"><a href="/Home/Components/Calendar/Event/812/18">River Rock Concert &amp; Festival</a></h3>
      <div class="category">Parks &amp; Recreation</div>
      <div class="location">Etowah River Park</div>
      <div class="address">600 Brown Industrial Parkway, Canton, GA</div>
      <div class="description"><p>A free, family-friendly outdoor concert.</p></div>
    </article>`;

  const [event] = parseCantonEventsHtml(html, source, new Date("2026-07-31T12:00:00Z"));
  assert.equal(event.title, "River Rock Concert & Festival");
  assert.equal(event.startDateTime.toISOString(), "2026-08-01T22:00:00.000Z");
  assert.equal(event.endDateTime?.toISOString(), "2026-08-02T02:00:00.000Z");
  assert.equal(event.originalUrl, "https://www.cantonga.gov/Home/Components/Calendar/Event/812/18");
  assert.equal(event.isFree, true);
  assert.equal(event.isAllDay, false);
  assert.equal(event.timeZone, "America/New_York");
  assert.equal(event.sourceUrl, source.url);
});

test("ignores malformed and past Canton records", () => {
  const html = `
    <div class="list-item"><h3 class="item-title">No date</h3></div>
    <div class="list-item"><span>01/01/2025 6:00 PM</span><h3 class="item-title">Past</h3></div>
    <div class="list-item"><span>02/30/2027 6:00 PM</span><h3 class="item-title">Impossible date</h3></div>`;
  assert.deepEqual(parseCantonEventsHtml(html, source, new Date("2026-07-31T12:00:00Z")), []);
});

test("discovers Explore Canton listing occurrences", () => {
  const html = `<article class="card" data-listing>
    <p class="card__date-heading">August 8</p>
    <div class="card__heading"><a href="/events/canton-farmers-market/" data-dms-category-name="Annual Event">Canton Farmers Market</a></div>
  </article>`;
  assert.deepEqual(discoverExploreCantonListings(html), [{
    url: "https://explorecantonga.com/events/canton-farmers-market/",
    dateText: "August 8",
    category: "Annual Event",
  }]);
});

test("uses Explore Canton structured times for each listed occurrence", () => {
  const html = `<main>
    <div class="detail__summary"><div class="text--content"><p>A free outdoor community market.</p></div></div>
    <div class="detail__address"><span>Brown Park</span><span>251 E. Marietta St.</span><span>Canton, GA 30114</span></div>
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Event","name":"Canton Farmers Market &amp; Music","startDate":"2026-05-30T09:00:00-04:00","endDate":"2026-05-30T12:30:00-04:00","url":"https://explorecantonga.com/events/canton-farmers-market/","image":{"url":"https://example.com/market.jpg"},"eventStatus":"https://schema.org/EventScheduled"}]}</script>
  </main>`;
  const event = parseExploreCantonEventDetail(html, {
    url: "https://explorecantonga.com/events/canton-farmers-market/",
    dateText: "August 8",
    category: "Annual Event",
  }, source, new Date("2026-07-31T12:00:00Z"));

  assert.equal(event?.title, "Canton Farmers Market & Music");
  assert.equal(event?.startDateTime.toISOString(), "2026-08-08T13:00:00.000Z");
  assert.equal(event?.endDateTime?.toISOString(), "2026-08-08T16:30:00.000Z");
  assert.equal(event?.locationName, "Brown Park");
  assert.equal(event?.address, "Brown Park, 251 E. Marietta St., Canton, GA 30114");
  assert.equal(event?.isAllDay, false);
  assert.equal(event?.sourceUrl, source.url);
  assert.equal(event?.originalUrl, "https://explorecantonga.com/events/canton-farmers-market/");
});

test("rejects past, cancelled, malformed-date, and malformed-title Explore Canton details", () => {
  const detail = (name: string, status = "https://schema.org/EventScheduled") => `
    <script type="application/ld+json">${JSON.stringify({
      "@type": "Event",
      name,
      startDate: "2026-05-30T09:00:00-04:00",
      endDate: "2026-05-30T12:30:00-04:00",
      eventStatus: status,
    })}</script>`;
  const listing = { url: "https://explorecantonga.com/events/example/", dateText: "July 1, 2026", category: "Community" };

  assert.equal(parseExploreCantonEventDetail(detail("Past event"), listing, source, new Date("2026-07-31T12:00:00Z")), null);
  assert.equal(parseExploreCantonEventDetail(detail("Cancelled", "https://schema.org/EventCancelled"), { ...listing, dateText: "August 8, 2026" }, source), null);
  assert.equal(parseExploreCantonEventDetail(detail("Bad date"), { ...listing, dateText: "February 30, 2027" }, source), null);
  assert.equal(parseExploreCantonEventDetail(detail(""), { ...listing, dateText: "August 8, 2026" }, source), null);
});
