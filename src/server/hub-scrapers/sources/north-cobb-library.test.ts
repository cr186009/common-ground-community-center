import assert from "node:assert/strict";
import test from "node:test";
import { verifyEventDateTime } from "@/server/hub-scrapers/date-verification";
import { northCobbLibraryScraper } from "@/server/hub-scrapers/sources/north-cobb-library";

const source = { name: "North Cobb Regional Library events", url: "https://www.cobbcounty.gov/events", city: "Kennesaw", county: "Cobb" };

test("North Cobb library uses official department and location filters and retains evidence", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ graphqlEventsSearchWww: { results: [{
      id: "19591", title: "Family Storytime", path: "/events/2099-09-04family-storytime", summary: "Stories for families.",
      location: { title: "North Cobb Regional Library" }, department: [{ name: "Cobb County Public Library" }],
      eventCategories: [{ name: "Storytime" }], eventAge: [{ name: "Preschool (ages 3-5)" }],
      startDate: { time: "2099-09-04T14:00:00+00:00" }, endDate: { time: "2099-09-04T15:00:00+00:00" }, hideEndDate: false,
    }], pageInfo: { page: 0, pageSize: 10, total: 1 } } }));
  };
  try {
    const output = await northCobbLibraryScraper.scrape(source as never);
    assert.equal(output.events?.length, 1);
    assert.match(urls[0], /department=85/);
    assert.match(urls[0], /location=1645/);
    assert.equal(output.events![0].originalUrl, "https://www.cobbcounty.gov/events/2099-09-04family-storytime");
    assert.equal(output.events![0].address, "3535 Old 41 Highway, Kennesaw, GA 30144");
    assert.equal(output.events![0].isKidFriendly, true);
    assert.equal(verifyEventDateTime(output.events![0]).time.status, "VERIFIED");
  } finally { globalThis.fetch = original; }
});

test("North Cobb library refuses similarly named results outside the exact official filters", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ graphqlEventsSearchWww: { results: [{
    title: "Storytime", path: "/events/wrong", location: { title: "North Cobb Senior Center" },
    department: [{ name: "Senior Services" }], startDate: { time: "2099-09-04T14:00:00Z" },
  }], pageInfo: { page: 0, pageSize: 10, total: 1 } } }));
  try {
    const output = await northCobbLibraryScraper.scrape(source as never);
    assert.equal(output.status, "SUCCESS");
    assert.deepEqual(output.events, []);
  } finally { globalThis.fetch = original; }
});
