import assert from "node:assert/strict";
import test from "node:test";
import { verifyEventDateTime } from "@/server/hub-scrapers/date-verification";
import { ksuLocalistScraper } from "@/server/hub-scrapers/sources/ksu-localist";

const source = { name: "Kennesaw State University public events", url: "https://calendar.kennesaw.edu/calendar", city: "Kennesaw", county: "Cobb" };
test("KSU keeps only General Public events physically in Kennesaw and retains occurrence evidence", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ page: { current: 1, total: 1 }, events: [
    { event: { id: 1, title: "Public Lecture", status: "live", geo: { city: "Kennesaw", state: "GA", street: "1000 Chastain Road", zip: "30144" }, filters: { event_target_audience: [{ name: "General Public" }], event_types: [{ name: "Lectures & Guest Speakers" }] }, localist_url: "https://calendar.kennesaw.edu/event/public-lecture", event_instances: [{ event_instance: { id: 11, start: "2099-09-04T19:30:00-04:00", end: "2099-09-04T21:00:00-04:00", all_day: false } }] } },
    { event: { id: 2, title: "Marietta Event", status: "live", geo: { city: "Marietta", state: "GA" }, filters: { event_target_audience: [{ name: "General Public" }] }, localist_url: "https://calendar.kennesaw.edu/event/no", event_instances: [] } },
  ] }), { status: 200 });
  try {
    const output = await ksuLocalistScraper.scrape(source as never);
    assert.equal(output.events?.length, 1); assert.equal(output.status, "SUCCESS");
    assert.equal(output.events![0].originalUrl, "https://calendar.kennesaw.edu/event/public-lecture");
    assert.equal(verifyEventDateTime(output.events![0]).time.status, "VERIFIED");
  } finally { globalThis.fetch = original; }
});

test("KSU treats a healthy strict-filter zero result as success", async () => {
  const original = globalThis.fetch; globalThis.fetch = async () => new Response(JSON.stringify({ page: { current: 1, total: 1 }, events: [] }));
  try { const output = await ksuLocalistScraper.scrape(source as never); assert.equal(output.status, "SUCCESS"); assert.deepEqual(output.events, []); } finally { globalThis.fetch = original; }
});
