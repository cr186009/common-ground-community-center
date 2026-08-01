import assert from "node:assert/strict";
import test from "node:test";

import { parseRockmartCalendarHtml } from "./rockmart-official";

const source = {
  name: "City of Rockmart official site",
  url: "https://www.rockmart-ga.gov/",
};

function eventTable({
  id,
  title,
  start,
  end,
  location = "316 N. Piedmont Avenue",
  detail = "Regular Council Meeting",
}: {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  detail?: string;
}) {
  return `
    <a id="${id}" name="${id}"></a>
    <table id="tblContentCalendarLayout">
      <tr><td><h3 class="mcms_RendererContentCaption">${title}</h3></td></tr>
      <tr><td><div class="mcms_RendererContentCalendarEventLocation">${location}</div></td></tr>
      <tr><td><div class="mcms_RendererContentCalendarStartDateTime">${start}</div></td></tr>
      <tr><td><div class="mcms_RendererContentCalendarEndDateTime">${end}</div></td></tr>
      <tr><td><div class="mcms_RendererContentDetail">${detail}</div></td></tr>
    </table>`;
}

test("parses Rockmart's embedded event record with Eastern time and stable URL", () => {
  const html = eventTable({
    id: "5253",
    title: "City Council Meeting",
    start: "8/11/2026 07:00 PM",
    end: "8/11/2026 08:00 PM",
  });

  const [event] = parseRockmartCalendarHtml(
    html,
    source,
    new Date("2026-07-31T12:00:00Z"),
  );

  assert.equal(event.title, "City Council Meeting");
  assert.equal(event.description, "Regular Council Meeting");
  assert.equal(event.startDateTime.toISOString(), "2026-08-11T23:00:00.000Z");
  assert.equal(event.endDateTime?.toISOString(), "2026-08-12T00:00:00.000Z");
  assert.equal(
    event.originalUrl,
    "https://www.rockmart-ga.gov/CityCalendar.aspx?CNID=5253",
  );
  assert.equal(event.timeZone, "America/New_York");
  assert.equal(event.isAllDay, false);
  assert.equal(event.sourceUrl, "https://www.rockmart-ga.gov/CityCalendar.aspx");
});

test("ignores stale, implausibly distant, and malformed Rockmart records", () => {
  const html = [
    eventTable({
      id: "old",
      title: "Old Event",
      start: "1/1/2024 10:00 AM",
      end: "1/1/2024 11:00 AM",
    }),
    eventTable({
      id: "future",
      title: "Recurring Record Far in the Future",
      start: "6/8/2049 07:00 PM",
      end: "6/8/2049 08:00 PM",
    }),
    eventTable({
      id: "bad",
      title: "Bad Date",
      start: "not a date",
      end: "not a date",
    }),
    eventTable({
      id: "rollover",
      title: "Impossible Date",
      start: "2/30/2027 10:00 AM",
      end: "2/30/2027 11:00 AM",
    }),
  ].join("");

  assert.deepEqual(
    parseRockmartCalendarHtml(
      html,
      source,
      new Date("2026-07-31T12:00:00Z"),
    ),
    [],
  );
});

test("drops an invalid end time without losing an otherwise valid event", () => {
  const html = eventTable({
    id: "6387",
    title: "HOLIDAY- OFFICES CLOSED",
    start: "9/7/2026 02:59 PM",
    end: "9/7/2026 01:00 PM",
    detail: "City offices are closed.",
  });

  const [event] = parseRockmartCalendarHtml(
    html,
    source,
    new Date("2026-07-31T12:00:00Z"),
  );

  assert.equal(event.title, "HOLIDAY- OFFICES CLOSED");
  assert.equal(event.endDateTime, null);
});

test("parses the current browser-facing Rockmart month grid", () => {
  const html = `
    <table class="mcms_Calendar_Month">
      <tr><td id="calendar_2026_8_11_0" class="mcms_Calendar_Day">
        <a class="mcms_Calendar_Day_Number">11</a>
        <a class="mcms_Calendar_Day_Item"
          title="7:00 PM - 8:00 PM&#10;Event Location: 316 N. Piedmont Avenue"
          href="https://rockmartga.sophicity.com/CityCalendar.aspx?CNID=5253">City Council Meeting</a>
      </td></tr>
    </table>`;

  const [event] = parseRockmartCalendarHtml(
    html,
    source,
    new Date("2026-08-01T12:00:00Z"),
  );

  assert.equal(event.title, "City Council Meeting");
  assert.equal(event.startDateTime.toISOString(), "2026-08-11T23:00:00.000Z");
  assert.equal(event.endDateTime?.toISOString(), "2026-08-12T00:00:00.000Z");
  assert.equal(event.locationName, "316 N. Piedmont Avenue");
  assert.equal(event.sourceUrl, "https://www.rockmart-ga.gov/CityCalendar.aspx");
  assert.equal(event.originalUrl, "https://www.rockmart-ga.gov/CityCalendar.aspx?CNID=5253");
  assert.equal(event.timeZone, "America/New_York");
  assert.equal(event.isAllDay, false);
});

test("rejects malformed Rockmart month-grid entries", () => {
  const html = `
    <td id="calendar_2026_2_30_0"><a class="mcms_Calendar_Day_Item" title="7:00 PM">Impossible date</a></td>
    <td id="calendar_2026_8_12_0"><a class="mcms_Calendar_Day_Item" title="no time">No time</a></td>
    <td id="calendar_bad"><a class="mcms_Calendar_Day_Item" title="7:00 PM">No date</a></td>`;

  assert.deepEqual(
    parseRockmartCalendarHtml(html, source, new Date("2026-08-01T12:00:00Z")),
    [],
  );
});
