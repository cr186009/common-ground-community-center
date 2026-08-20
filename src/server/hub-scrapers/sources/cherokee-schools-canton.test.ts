import assert from "node:assert/strict";
import test from "node:test";

import { parseCherokeeSchoolsCantonCalendar } from "./cherokee-schools-canton";

const source = {
  name: "Cherokee County School District — Canton coverage",
  url: "https://www.cherokeek12.net/fs/pages/5787",
};

test("parses official CCSD timed and all-day occurrences with stable evidence", () => {
  const output = parseCherokeeSchoolsCantonCalendar(`
    <div class="fsCalendar" data-calendar-ids="364">
      <div class="fsCalendarDaybox"><div class="fsCalendarDate" data-day="20" data-year="2026" data-month="7"></div>
        <div class="fsCalendarInfo"><a class="fsCalendarEventLink" title="School Board Meeting - Work Session" data-occur-id="1156739"></a>
          <time class="fsStartTime" datetime="2026-08-20T17:30:00-04:00"></time><time class="fsEndTime" datetime="2026-08-20T20:30:00-04:00"></time></div>
      </div>
      <div class="fsCalendarDaybox"><div class="fsCalendarDate" data-day="21" data-year="2026" data-month="7"></div>
        <div class="fsCalendarInfo"><a class="fsCalendarEventLink" title="District Holiday" data-occur-id="1156740"></a><span class="fsAllDayEvent">All Day</span></div>
      </div>
    </div>`, source, new Date("2026-08-14T12:00:00Z"));

  assert.equal(output.events?.length, 2);
  assert.equal(output.events?.[0].startDateTime.toISOString(), "2026-08-20T21:30:00.000Z");
  assert.equal(output.events?.[0].address, "1205 Bluffs Parkway, Canton, GA 30114");
  assert.equal(output.events?.[0].category, "GOVERNMENT_MEETING");
  assert.equal(output.events?.[0].meetingDetails?.meetingType, "SCHOOL_BOARD");
  assert.match(output.events?.[0].originalUrl ?? "", /1156739$/);
  assert.equal(output.events?.[1].isAllDay, true);
  assert.equal(output.events?.[1].startDateTime.toISOString(), "2026-08-21T04:00:00.000Z");
  assert.equal(output.events?.[1].address, null);
});

test("rejects an unrelated or changed Finalsite calendar", () => {
  assert.throws(
    () => parseCherokeeSchoolsCantonCalendar('<div class="fsCalendar" data-calendar-ids="999"></div>', source),
    /calendar 364 was not present/,
  );
});

test("ignores occurrences older than the one-day reconciliation window", () => {
  const output = parseCherokeeSchoolsCantonCalendar(`
    <div class="fsCalendar" data-calendar-ids="364"><div class="fsCalendarDaybox">
      <div class="fsCalendarDate" data-day="1" data-year="2026" data-month="6"></div>
      <div class="fsCalendarInfo"><a class="fsCalendarEventLink" title="Old item" data-occur-id="1"></a><span class="fsAllDayEvent">All Day</span></div>
    </div></div>`, source, new Date("2026-08-14T12:00:00Z"));
  assert.deepEqual(output.events, []);
});
