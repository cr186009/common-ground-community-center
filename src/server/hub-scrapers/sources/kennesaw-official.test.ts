import assert from "node:assert/strict";
import test from "node:test";

import { verifyEventDateTime } from "@/server/hub-scrapers/date-verification";
import { kennesawOfficialScraper } from "@/server/hub-scrapers/sources/kennesaw-official";

const source = {
  name: "City of Kennesaw events",
  url: "https://www.kennesaw-ga.gov/events/",
  city: "Kennesaw",
  county: "Cobb",
};

async function scrapeOne(event: Record<string, unknown>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    events: [event],
    next_rest_url: null,
    total: 1,
  }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const output = await kennesawOfficialScraper.scrape(source as never);
    assert.equal(output.events?.length, 1);
    return output.events![0];
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("retains official Kennesaw occurrence evidence for date and time", async () => {
  const event = await scrapeOne({
    id: 123,
    status: "publish",
    title: "Outdoor concert",
    description: "Registration closes August 30 at 5:00 p.m.",
    url: "https://www.kennesaw-ga.gov/event/outdoor-concert/",
    start_date: "2099-09-04 19:30:00",
    end_date: "2099-09-04 21:00:00",
    utc_start_date: "2099-09-04 23:30:00",
    utc_end_date: "2099-09-05 01:00:00",
    all_day: false,
  });

  assert.deepEqual(event.dateEvidence, {
    listingDate: "2099-09-04",
    structuredDate: "2099-09-04T23:30:00.000Z",
    sourcePublishedText:
      "Official start: 2099-09-04 19:30:00; Official end: 2099-09-04 21:00:00",
  });
  assert.equal(event.originalUrl, "https://www.kennesaw-ga.gov/event/outdoor-concert/");

  const verification = verifyEventDateTime(event);
  assert.equal(verification.date.status, "VERIFIED");
  assert.equal(verification.time.status, "VERIFIED");
});

test("interprets API local timestamps in Kennesaw time when UTC is absent", async () => {
  const event = await scrapeOne({
    id: 124,
    status: "publish",
    title: "Recurring community class",
    description: "Every Tuesday, September 1 through September 29.",
    url: "https://www.kennesaw-ga.gov/event/community-class/2099-09-08/",
    start_date: "2099-09-08 18:00:00",
    end_date: "2099-09-08 19:00:00",
    all_day: false,
  });

  assert.equal(event.startDateTime.toISOString(), "2099-09-08T22:00:00.000Z");
  assert.equal(event.dateEvidence?.listingDate, "2099-09-08");
  assert.equal(event.dateEvidence?.structuredDate, "2099-09-08T22:00:00.000Z");

  const verification = verifyEventDateTime(event);
  assert.equal(verification.date.status, "VERIFIED");
  assert.equal(verification.time.status, "VERIFIED");
  assert.ok(verification.date.evidence.some((item) => item.kind === "url"));
  assert.ok(verification.date.evidence.some((item) => item.kind === "recurrence"));
});
