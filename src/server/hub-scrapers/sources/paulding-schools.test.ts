import assert from "node:assert/strict";
import test from "node:test";

import { verifyEventDateTime } from "@/server/hub-scrapers/date-verification";
import { parsePauldingSchoolsHomepage } from "./paulding-schools";

const source = { name: "Paulding County School District events", url: "https://www.paulding.k12.ga.us/" };

test("Paulding Schools retains official occurrence timestamps and routes board meetings", () => {
  const events = parsePauldingSchoolsHomepage(`
    <div class="fsCalendar"><div class="fsListItems"><article>
      <time class="fsDate" datetime="2026-09-08T08:30:00-04:00">Tuesday September 8</time>
      <div class="fsTitle"><a class="fsCalendarEventLink" data-occur-id="359_2026-09-08T12:30:00Z">Board Meeting</a></div>
      <div class="fsEventDetails"><div class="fsTimeRange"><time class="fsStartTime" datetime="2026-09-08T08:30:00-04:00">8:30 AM</time><time class="fsEndTime" datetime="2026-09-08T10:30:00-04:00">10:30 AM</time></div><div class="fsLocation">Central Office</div></div>
    </article></div></div>`, source, new Date("2026-08-14T00:00:00Z"));
  assert.equal(events.length, 1);
  assert.equal(events[0].category, "GOVERNMENT_MEETING");
  assert.equal(events[0].meetingDetails?.meetingType, "SCHOOL_BOARD");
  const verification = verifyEventDateTime(events[0]);
  assert.equal(verification.date.status, "VERIFIED");
  assert.equal(verification.time.status, "VERIFIED");
});

test("Paulding Schools preserves all-day district calendar items", () => {
  const [event] = parsePauldingSchoolsHomepage(`
    <div class="fsCalendar"><div class="fsListItems"><article>
      <time class="fsDate" datetime="2026-09-04T00:00:00-04:00">Friday September 4</time>
      <div class="fsTitle"><a class="fsCalendarEventLink" data-occur-id="367_2026-09-04T00:00:00Z">Remote Learning Day</a></div>
      <div class="fsEventDetails"><div class="fsAllDay">all day</div></div>
    </article></div></div>`, source, new Date("2026-08-14T00:00:00Z"));
  assert.equal(event.isAllDay, true);
  assert.equal(event.category, "SCHOOL");
});

test("Paulding Schools treats offset-free timestamps as Eastern civil time", () => {
  const [event] = parsePauldingSchoolsHomepage(`<div class="fsCalendar"><div class="fsListItems"><article>
    <div class="fsTitle"><a class="fsCalendarEventLink" data-occur-id="3">Open House</a></div>
    <time class="fsStartTime" datetime="2026-08-20T08:30:00"></time>
    <time class="fsEndTime" datetime="2026-08-20T10:00:00"></time>
  </article></div></div>`, source, new Date("2026-08-14T00:00:00Z"));
  assert.equal(event.startDateTime.toISOString(), "2026-08-20T12:30:00.000Z");
  assert.equal(event.endDateTime?.toISOString(), "2026-08-20T14:00:00.000Z");
});
