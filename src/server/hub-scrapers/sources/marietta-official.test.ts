import assert from "node:assert/strict";
import test from "node:test";

import {
  getConfiguredCalendarFeeds,
  isWithinMariettaImportWindow,
  parseCalendarFeeds,
} from "./marietta-official";

test("discovers only official CivicPlus calendar feeds", () => {
  const feeds = parseCalendarFeeds(`
    <a href="/common/modules/iCalendar/iCalendar.aspx?feed=calendar&amp;catID=14">City Council</a>
    <a href="https://evil.example/iCalendar.aspx?feed=calendar&amp;catID=99">Wrong host</a>
    <a href="/common/modules/iCalendar/iCalendar.aspx?feed=news&amp;catID=20">Wrong feed</a>`);

  assert.deepEqual(feeds, [{
    categoryId: "14",
    categoryName: "City Council",
    url: "https://www.mariettaga.gov/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=14",
  }]);
});

test("discovers official category IDs from the accessible calendar page", () => {
  const feeds = parseCalendarFeeds(`
    <ol id="jumpList">
      <li><a href="?CID=31">City Council (2)</a></li>
      <li><a href="/Calendar.aspx?view=list&amp;CID=22">Parks, Recreation &amp; Facilities (1)</a></li>
      <li><a href="/Calendar.aspx?CID=0">All calendars</a></li>
      <li><a href="/Calendar.aspx?CID=not-a-number">Invalid</a></li>
    </ol>`);

  assert.deepEqual(feeds, [
    {
      categoryId: "31",
      categoryName: "City Council",
      url: "https://www.mariettaga.gov/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=31",
    },
    {
      categoryId: "22",
      categoryName: "Parks, Recreation & Facilities",
      url: "https://www.mariettaga.gov/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=22",
    },
  ]);
});

test("builds a safe 403 fallback from explicitly configured category IDs", () => {
  assert.deepEqual(getConfiguredCalendarFeeds("14, 22,14, nope, https://evil.example"), [
    {
      categoryId: "14",
      categoryName: "Calendar 14",
      url: "https://www.mariettaga.gov/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=14",
    },
    {
      categoryId: "22",
      categoryName: "Calendar 22",
      url: "https://www.mariettaga.gov/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=22",
    },
  ]);
});

test("limits unusually long recurring calendars to the next 18 months", () => {
  const now = new Date("2026-08-14T12:00:00-04:00");

  assert.equal(
    isWithinMariettaImportWindow(new Date("2027-12-01T10:00:00-05:00"), null, now),
    true,
  );
  assert.equal(
    isWithinMariettaImportWindow(new Date("2030-01-01T10:00:00-05:00"), null, now),
    false,
  );
});
