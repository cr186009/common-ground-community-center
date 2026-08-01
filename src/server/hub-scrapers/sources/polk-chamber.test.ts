import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePolkChamberDetailHtml,
  parsePolkChamberListHtml,
} from "./polk-chamber";

test("parses GrowthZone cards with exact Eastern timestamps", () => {
  const html = `<div class="card gz-events-card">
    <div class="card-header"><img class="gz-events-img" src="/jazz.jpg"></div>
    <h5 class="gz-card-title"><a href="/events/details/chamber-jazz-7080">Chamber Jazz &amp; Business After Hours</a></h5>
    <li class="gz-card-date"><span content="2026-08-21T18:00">Friday Aug 21</span><meta content="2026-08-21T20:00"></li>
    <span class="gz-cat">Arts &amp; Culture</span><span class="gz-cat">Polk County Community</span>
  </div>`;

  const [item] = parsePolkChamberListHtml(html, new Date("2026-08-01T12:00:00Z"));
  assert.equal(item.title, "Chamber Jazz & Business After Hours");
  assert.equal(item.startDateTime.toISOString(), "2026-08-21T22:00:00.000Z");
  assert.equal(item.endDateTime?.toISOString(), "2026-08-22T00:00:00.000Z");
  assert.equal(item.originalUrl, "https://business.polkgeorgia.com/events/details/chamber-jazz-7080");
  assert.equal(item.imageUrl, "https://business.polkgeorgia.com/jazz.jpg");
  assert.deepEqual(item.categories, ["Arts & Culture", "Polk County Community"]);
});

test("enriches Chamber items with detail copy, address, and city", () => {
  const [item] = parsePolkChamberListHtml(`<div class="gz-events-card">
    <h5 class="gz-card-title"><a href="/events/details/chamber-jazz-7080">Chamber Jazz</a></h5>
    <li class="gz-card-date"><span content="2026-08-21T18:00"></span><meta content="2026-08-21T20:00"></li>
    <span class="gz-cat">Arts &amp; Culture</span>
  </div>`, new Date("2026-08-01T12:00:00Z"));
  const detail = `<main><h1>Chamber Jazz</h1><p>Enjoy live music and community conversation.</p>
    <h5>Date and Time</h5><p>Friday, August 21</p>
    <h5>Location</h5><p>209 Main Street<br>Cedartown, GA 30125</p>
    <h5>Contact Information</h5><p>Polk Chamber</p></main>`;

  const event = parsePolkChamberDetailHtml(detail, item, {
    name: "Polk County Chamber events",
    url: "https://business.polkgeorgia.com/events",
  });
  assert.equal(event.city, "Cedartown");
  assert.equal(event.locationName, "209 Main Street Cedartown, GA 30125");
  assert.equal(event.category, "MUSIC");
  assert.equal(event.timeZone, "America/New_York");
  assert.equal(event.sourceName, "Polk County Chamber events");
});

test("rejects stale and malformed Chamber cards", () => {
  const html = `<div class="gz-events-card"><h5 class="gz-card-title"><a href="/old">Old</a></h5><span content="2024-01-01T10:00"></span></div>
    <div class="gz-events-card"><h5 class="gz-card-title"><a href="/bad">Bad</a></h5><span content="not-a-date"></span></div>`;
  assert.deepEqual(parsePolkChamberListHtml(html, new Date("2026-08-01T12:00:00Z")), []);
});
