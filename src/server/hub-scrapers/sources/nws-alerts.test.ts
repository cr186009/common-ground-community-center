import assert from "node:assert/strict";
import test from "node:test";

import type { Source } from "@prisma/client";
import { nwsAlertsScraper } from "@/server/hub-scrapers/sources/nws-alerts";

test("NWS fixture emits one cleaned alert with stable external identity", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      features: [
        {
          id: "https://api.weather.gov/alerts/urn:oid:fixture-1",
          properties: {
            status: "Actual",
            messageType: "Alert",
            severity: "Severe",
            headline: "Storm Warning &#038; Safety Notice",
            event: "Severe Thunderstorm Warning",
            description: "Move indoors.\n\nMove indoors.",
            instruction: "Stay away from windows. READ MORE",
            areaDesc: "Paulding County",
            geocode: { SAME: ["013223"], UGC: ["GAZ032"] },
            effective: "2026-07-31T12:00:00-04:00",
            expires: "2026-07-31T14:00:00-04:00",
          },
        },
      ],
    }), { status: 200, headers: { "content-type": "application/geo+json" } });

  const source = {
    id: "fixture-source",
    name: "National Weather Service alerts",
    url: "https://api.weather.gov/alerts/active",
  } as Source;
  const output = await nwsAlertsScraper.scrape(source);
  const alert = output.alerts?.[0];

  assert.equal(output.alerts?.length, 1);
  assert.equal(alert?.externalId, "https://api.weather.gov/alerts/urn:oid:fixture-1");
  assert.equal(alert?.affectedCounties?.join(","), "Paulding");
  assert.equal(alert?.description, "Move indoors.\n\nStay away from windows.");
});
