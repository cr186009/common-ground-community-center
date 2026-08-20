import assert from "node:assert/strict";
import test from "node:test";

import { verifyEventDateTime } from "../date-verification";
import { parseCalendarPage } from "./paulding-calendar";

const pageUrl = "https://www.paulding.gov/calendar.aspx?view=list&month=8&year=2026";

function fixture(title: string, id: number, date: string) {
  return `<article class="calendarEvent">
    <h3><a href="/calendar.aspx?EID=${id}">${title}</a></h3>
    <div>${date}</div>
  </article>`;
}

test("retains visible Paulding listing date and time as verification evidence", () => {
  const html = `
    <article class="calendarEvent">
      <h3><a href="/calendar.aspx?EID=812">Family Movie Night</a></h3>
      <div>August 22, 2026, 7:30 PM - 9:30 PM</div>
      <div class="location">Sara Babb Park</div>
      <p>A free family movie.</p>
    </article>`;

  const [event] = parseCalendarPage(
    html,
    pageUrl,
    "Paulding County Public Calendar",
    new Date("2026-08-13T12:00:00Z"),
  );

  assert.equal(event.dateEvidence?.listingDate, event.startDateTime);
  assert.match(event.dateEvidence?.sourcePublishedText ?? "", /August 22, 2026, 7:30 PM/);

  const verification = verifyEventDateTime(event);
  assert.equal(verification.date.status, "VERIFIED");
  assert.equal(verification.time.status, "VERIFIED");
});

test("parses reported Paulding civil times as Eastern instants", () => {
  const html = [
    fixture("WSAB meeting", 1, "August 19, 2026, 8:30 AM - 10:00 AM"),
    fixture("Board of Commissioners Work Session", 2, "August 25, 2026, 10:00 AM - 11:00 AM"),
    fixture("Fire/Rescue Heroes and Horsepower Car Show", 3, "September 5, 2026, 9:00 AM - 2:00 PM"),
  ].join("");
  const events = parseCalendarPage(html, pageUrl, "Paulding County", new Date("2026-08-01T12:00:00Z"));

  assert.deepEqual(events.map((event) => [event.startDateTime.toISOString(), event.endDateTime?.toISOString()]), [
    ["2026-08-19T12:30:00.000Z", "2026-08-19T14:00:00.000Z"],
    ["2026-08-25T14:00:00.000Z", "2026-08-25T15:00:00.000Z"],
    ["2026-09-05T13:00:00.000Z", "2026-09-05T18:00:00.000Z"],
  ]);
});

test("preserves a date-only Paulding entry as an Eastern all-day event", () => {
  const [event] = parseCalendarPage(
    fixture("Labor Day closure", 4, "September 7, 2026"),
    pageUrl,
    "Paulding County",
    new Date("2026-08-01T12:00:00Z"),
  );
  assert.equal(event.startDateTime.toISOString(), "2026-09-07T04:00:00.000Z");
  assert.equal(event.isAllDay, true);
});

test("uses the DST-aware Eastern offset on both sides of the fall transition", () => {
  const events = parseCalendarPage([
    fixture("Before DST", 5, "October 31, 2026, 9:00 AM - 10:00 AM"),
    fixture("After DST", 6, "November 2, 2026, 9:00 AM - 10:00 AM"),
  ].join(""), pageUrl, "Paulding County", new Date("2026-08-01T12:00:00Z"));
  assert.deepEqual(events.map((event) => event.startDateTime.toISOString()), [
    "2026-10-31T13:00:00.000Z",
    "2026-11-02T14:00:00.000Z",
  ]);
});
