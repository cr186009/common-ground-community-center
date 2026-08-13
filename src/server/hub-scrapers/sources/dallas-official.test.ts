import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDallasCalendarUrl,
  parseDallasCalendarHtml,
} from "@/server/hub-scrapers/sources/dallas-official";

test("Dallas scraper replaces retired source paths with the official calendar", () => {
  assert.equal(
    buildDallasCalendarUrl("https://www.dallasga.gov/community/page/upcoming-events"),
    "https://www.dallasga.gov/calendar.aspx?view=list&CID=0",
  );
});

test("Dallas parser reads scoped CivicEngage events and retains date evidence", () => {
  const html = `
    <nav><li><a href="/calendar">Calendar</a></li></nav>
    <div class="calendarEvent">
      <h2><a href="/Calendar.aspx?EID=42">Downtown Family Festival</a></h2>
      <div class="eventDate">August 21, 2026 6:00 PM</div>
      <div class="eventLocation">Dallas Courthouse Square</div>
      <p class="eventDescription">Free outdoor activities for kids.</p>
    </div>`;

  const events = parseDallasCalendarHtml(html, {
    name: "City of Dallas official events page",
    url: "https://www.dallasga.gov/calendar.aspx?view=list&CID=0",
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Downtown Family Festival");
  assert.equal(events[0].originalUrl, "https://www.dallasga.gov/Calendar.aspx?EID=42");
  assert.equal(events[0].dateEvidence?.listingDate, "August 21, 2026 6:00 PM");
  assert.equal(events[0].isKidFriendly, true);
});
