import assert from "node:assert/strict";
import test from "node:test";

import { parseWgrlsIcal } from "@/server/hub-scrapers/sources/wgrls-events";

const source = { name: "West Georgia Regional Library events", url: "https://wgrls.org/events/" };

test("WGRLS keeps only allowlisted branches, drops cancellations, and retains UID/date evidence", () => {
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:dallas-123@wgrls.org\nDTSTART;TZID=America/New_York:20260910T103000\nDTEND;TZID=America/New_York:20260910T110000\nSUMMARY:Toddler Time\nDESCRIPTION:Stories and songs.\nLOCATION:Dallas Public Library\\, 1010 East Memorial Drive\\, Dallas\\, GA 30132\nURL:https://wgrls.org/event/toddler-time/\nSTATUS:CANCELLED\nEND:VEVENT\nBEGIN:VEVENT\nUID:villa-rica-1@wgrls.org\nDTSTART;TZID=America/New_York:20260910T120000\nSUMMARY:Outside geography\nLOCATION:Villa Rica Public Library\\, Villa Rica\\, GA\nEND:VEVENT\nEND:VCALENDAR`;
  const confirmed = ics.replace("STATUS:CANCELLED", "STATUS:CONFIRMED");
  const events = parseWgrlsIcal(confirmed, source, new Date("2026-08-13T12:00:00Z")).events ?? [];
  assert.equal(events.length, 1);
  assert.equal(events[0].city, "Dallas");
  assert.match(events[0].originalUrl ?? "", /wgrls-dallas-123/);
  assert.match(events[0].dateEvidence?.sourcePublishedText ?? "", /UID dallas-123@wgrls.org/);
  assert.equal(parseWgrlsIcal(ics, source, new Date("2026-08-13T12:00:00Z")).events?.length, 0);
});

test("WGRLS recognizes the Hiram and Crossroads official branch names", () => {
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:h1\nDTSTART:20260910T140000Z\nSUMMARY:Book Club\nLOCATION:Hiram – Maude P. Ragsdale Public Library\\, 1815 Hiram Douglasville Hwy\\, Hiram\\, GA\nEND:VEVENT\nBEGIN:VEVENT\nUID:c1\nDTSTART:20260911T140000Z\nSUMMARY:Craft Hour\nLOCATION:Crossroads Public Library\\, 909 Harmony Grove Church Rd\\, Acworth\\, GA\nEND:VEVENT\nEND:VCALENDAR`;
  const events = parseWgrlsIcal(ics, source, new Date("2026-08-13T12:00:00Z")).events ?? [];
  assert.deepEqual(events.map((event) => event.city).sort(), ["Acworth", "Hiram"]);
});
