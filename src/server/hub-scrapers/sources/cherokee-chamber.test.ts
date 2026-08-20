import assert from "node:assert/strict";
import test from "node:test";
import { discoverCherokeeChamberDetails, parseCherokeeChamberDetail } from "./cherokee-chamber";

const source = { name: "Cherokee County Chamber events", url: "https://widgets.cherokeechamber.com/feeds/events/event.aspx?cid=94&wid=701" };
test("discovers stable Chamber detail IDs", () => assert.deepEqual(discoverCherokeeChamberDetails(`<a href="/feeds/events/event.aspx?id=4281&amp;wid=701&amp;cid=94">Event</a><a href="/feeds/events/event.aspx?id=4281&amp;wid=701&amp;cid=94">same</a>`), ["https://widgets.cherokeechamber.com/feeds/events/event.aspx?id=4281&wid=701&cid=94"]));
test("parses Chamber JSON-LD and filters outside Canton", () => {
  const fixture = (city: string) => `<script type="application/ld+json">${JSON.stringify({ "@type": "Event", name: "Good Morning Cherokee", startDate: "2026-09-03T06:30:00-0400", endDate: "2026-09-03T09:00:00-0400", location: { "@type": "Place", name: "Conference Center", address: { streetAddress: "1130 Bluffs Parkway", addressLocality: city, addressRegion: "GA", postalCode: "30114" } } })}</script>`;
  const event = parseCherokeeChamberDetail(fixture("Canton"), source, "https://widgets.cherokeechamber.com/feeds/events/event.aspx?id=4281&wid=701&cid=94", new Date("2026-08-01T00:00:00Z"));
  assert.equal(event?.startDateTime.toISOString(), "2026-09-03T10:30:00.000Z");
  assert.equal(event?.address, "1130 Bluffs Parkway, Canton GA 30114");
  assert.equal(parseCherokeeChamberDetail(fixture("Woodstock"), source, "x", new Date("2026-08-01T00:00:00Z")), null);
});
