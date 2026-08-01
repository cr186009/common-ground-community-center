import assert from "node:assert/strict";
import test from "node:test";

import { parseRockmartCulturalArtsHtml } from "./rockmart-cultural-arts";

const source = {
  name: "Rockmart Cultural Arts Center",
  url: "https://www.rockmart-ga.gov/",
};

const fixture = `
  <span class="mcms_RendererContentDetail">
    <p><strong>Upcoming RCAC Art Exhibits</strong></p>
    <p><strong>Happy Birthday America! Art Exhibit for our</strong><br>
      <strong>Semiquincentennial - 250th Celebration - 1776 - 2026</strong><br>
      <strong>July 9 - August 27, 2026</strong><br>
      Reception July 25, 2026 – 4-6 pm
    </p>
    <p><strong>Down on the Farm Art Exhibit</strong><br>
      September 3 - October 22, 2026<br>
      Reception - September 19 - 4-6 pm
    </p>
    <p><strong>Holiday Exhibit:</strong> <strong>November 5 - December 23, 2026</strong><br>
      Annual Indoor HOLIDAY FESTIVAL/Reception/Open House - November 14, 2026 - 12-5 pm
    </p>
  </span>`;

test("parses ongoing and future RCAC exhibit ranges as free all-day events", () => {
  const events = parseRockmartCulturalArtsHtml(
    fixture,
    source,
    new Date("2026-08-01T12:00:00Z"),
  );
  const america = events.find((event) => event.title.startsWith("Happy Birthday America!"));
  const farm = events.find((event) => event.title === "Down on the Farm Art Exhibit");
  const holiday = events.find((event) => event.title === "Holiday Exhibit");

  assert.ok(america);
  assert.equal(america.startDateTime.toISOString(), "2026-07-09T04:00:00.000Z");
  assert.equal(america.endDateTime?.toISOString(), "2026-08-28T03:59:00.000Z");
  assert.equal(america.isAllDay, true);
  assert.equal(america.isFree, true);
  assert.ok(farm);
  assert.equal(farm.startDateTime.toISOString(), "2026-09-03T04:00:00.000Z");
  assert.ok(holiday);
  assert.equal(holiday.endDateTime?.toISOString(), "2026-12-24T04:59:00.000Z");
});

test("creates separate timed reception and festival records in Eastern time", () => {
  const events = parseRockmartCulturalArtsHtml(
    fixture,
    source,
    new Date("2026-08-01T12:00:00Z"),
  );
  const reception = events.find((event) => event.title === "Down on the Farm Art Exhibit Reception");
  const festival = events.find((event) => event.title.startsWith("RCAC Indoor Holiday Festival"));

  assert.ok(reception);
  assert.equal(reception.startDateTime.toISOString(), "2026-09-19T20:00:00.000Z");
  assert.equal(reception.endDateTime?.toISOString(), "2026-09-19T22:00:00.000Z");
  assert.equal(reception.isAllDay, false);
  assert.equal(reception.timeZone, "America/New_York");
  assert.ok(festival);
  assert.equal(festival.startDateTime.toISOString(), "2026-11-14T17:00:00.000Z");
  assert.equal(festival.endDateTime?.toISOString(), "2026-11-14T22:00:00.000Z");
  assert.equal(festival.category, "FESTIVAL");
  assert.equal(festival.isKidFriendly, true);
});

test("rejects stale, distant, and malformed exhibits", () => {
  const html = `
    <div class="mcms_RendererContentDetail">
      <p>Old Art Exhibit<br>January 1 - January 31, 2024</p>
      <p>Impossible Art Exhibit<br>February 30 - March 2, 2027</p>
      <p>Distant Art Exhibit<br>January 1 - January 31, 2049</p>
    </div>`;

  assert.deepEqual(
    parseRockmartCulturalArtsHtml(html, source, new Date("2026-08-01T12:00:00Z")),
    [],
  );
});

test("ignores undated recurring class and theatre marketing copy", () => {
  const html = `
    <div class="mcms_RendererContentDetail">
      <p>Pottery classes meet Tuesdays. More workshops are posted online.</p>
      <p>Theatre performances include community and children's productions.</p>
    </div>`;

  assert.deepEqual(
    parseRockmartCulturalArtsHtml(html, source, new Date("2026-08-01T12:00:00Z")),
    [],
  );
});
