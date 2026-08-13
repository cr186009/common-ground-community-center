import assert from "node:assert/strict";
import test from "node:test";

import {
  getConfiguredCalendarFeeds,
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
