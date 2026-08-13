import assert from "node:assert/strict";
import test from "node:test";
import { verifyEventDateTime } from "@/server/hub-scrapers/date-verification";
import { cobbSchoolsKennesawScraper } from "@/server/hub-scrapers/sources/cobb-schools-kennesaw";

const source = { name: "Cobb Schools — Kennesaw campuses", url: "https://www.cobbk12.org", city: "Kennesaw", county: "Cobb" };
test("Cobb Schools queries the three allowlisted sites and keeps stable iCalendar URLs", async () => {
  const original = globalThis.fetch; const urls: string[] = [];
  globalThis.fetch = async (input) => { const url = String(input); urls.push(url); const suffix = url.endsWith("/awtrey") ? "Awtrey" : url.endsWith("/kennesawmountain") ? "KMHS" : "Kennesaw Elementary"; return new Response(JSON.stringify({ Events: [{ Title: `${suffix} Family Curriculum Night`, StartTime: "2099-09-04T18:00:00", EndTime: "2099-09-04T19:30:00", StartUtc: "2099-09-04T22:00:00Z", EndUtc: "2099-09-04T23:30:00Z", Iid: 123, AllDayEvent: false, Description: "<p>Families welcome.</p>", Sb365Json: JSON.stringify({ Newsfeedcategories: [{ CategoryName: "Community Event" }] }) }] })); };
  try {
    const output = await cobbSchoolsKennesawScraper.scrape(source as never);
    assert.equal(urls.length, 3); assert.ok(urls.some((url) => url.endsWith("/kennesaw"))); assert.ok(urls.some((url) => url.endsWith("/awtrey"))); assert.ok(urls.some((url) => url.endsWith("/kennesawmountain")));
    assert.equal(output.events?.length, 3); assert.equal(output.events![0].originalUrl, "https://cicmsapi.azurewebsites.net/cobb/_ci/calendar/ics/123");
    assert.equal(verifyEventDateTime(output.events![0]).time.status, "VERIFIED");
  } finally { globalThis.fetch = original; }
});

test("Cobb Schools reports a healthy zero result as success", async () => {
  const original = globalThis.fetch; globalThis.fetch = async () => new Response(JSON.stringify({ Events: [] }));
  try { const output = await cobbSchoolsKennesawScraper.scrape(source as never); assert.equal(output.status, "SUCCESS"); assert.deepEqual(output.events, []); } finally { globalThis.fetch = original; }
});
