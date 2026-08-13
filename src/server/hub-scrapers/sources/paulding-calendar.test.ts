import assert from "node:assert/strict";
import test from "node:test";

import { verifyEventDateTime } from "../date-verification";
import { parseCalendarPage } from "./paulding-calendar";

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
    "https://www.paulding.gov/calendar.aspx?view=list&month=8&year=2026",
    "Paulding County Public Calendar",
    new Date("2026-08-13T12:00:00Z"),
  );

  assert.equal(event.dateEvidence?.listingDate, event.startDateTime);
  assert.match(event.dateEvidence?.sourcePublishedText ?? "", /August 22, 2026, 7:30 PM/);

  const verification = verifyEventDateTime(event);
  assert.equal(verification.date.status, "VERIFIED");
  assert.equal(verification.time.status, "VERIFIED");
});
