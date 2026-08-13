import assert from "node:assert/strict";
import test from "node:test";

import { verifyEventDateTime } from "../date-verification";
import { parseCedartownEvents } from "./cedartown-downtown";

const source = {
  name: "Downtown Cedartown events page",
  url: "https://www.downtowncedartown.com/calendar-of-events-c1qeb",
  city: "Cedartown",
  county: "Polk",
};

test("parses a dated official event card and retains visible date/time evidence", () => {
  const [event] = parseCedartownEvents(`
    <article class="eventlist-event">
      <h2><a href="/events/summer-concert">Free Summer Concert</a></h2>
      <div class="event-date">August 22, 2026</div>
      <div class="event-time">7:00 PM</div>
      <div class="eventlist-meta-address">Peek Park</div>
      <p>Family music downtown.</p>
    </article>`, source);

  assert.ok(event);
  assert.equal(event.originalUrl, "https://www.downtowncedartown.com/events/summer-concert");
  assert.equal(event.startDateTime.getHours(), 19);
  assert.deepEqual(event.dateEvidence?.sourcePublishedText, "August 22, 2026 7:00 PM");
  const verification = verifyEventDateTime(event);
  assert.equal(verification.date.status, "VERIFIED");
  assert.equal(verification.time.status, "VERIFIED");
});

test("ignores navigation lists and image-only annual calendar content", () => {
  assert.deepEqual(parseCedartownEvents(`
    <nav><ul><li><a href="/about">About Downtown</a></li></ul></nav>
    <main><h1>Calendar of Events</h1><img alt="2025 Calendar of Events"></main>`, source), []);
});
