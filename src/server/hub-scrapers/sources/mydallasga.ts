import * as cheerio from "cheerio";

import {
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";
import type {
  NormalizedScrapedEvent,
  ScrapeOutput,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const SOURCE_NAME = "Downtown Dallas / MyDallasGA";
const DETAIL_PATTERN = "/event-details-registration/";
const CONCURRENCY = 3;

// Image src patterns that indicate non-content images (logos, nav, footer, sponsors)
const EXCLUDED_IMAGE_RE =
  /logo|nav|footer|header|sponsor|icon|favicon|banner|social|wix-ads|static\.wixstatic\.com\/media\/[a-f0-9]{32}\./i;

function buildEventsUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl.replace(/\/$/, ""));
  url.pathname = "/events";
  return url.toString();
}

// ---------------------------------------------------------------------------
// JSON-LD helpers
// ---------------------------------------------------------------------------

type JsonLdLocation = {
  "@type"?: string;
  name?: string;
  address?:
    | string
    | { streetAddress?: string; addressLocality?: string };
};

type JsonLdEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: JsonLdLocation;
  image?: string | string[] | { url?: string };
};

function findJsonLdEvent(html: string): JsonLdEvent | null {
  const $ = cheerio.load(html);
  let found: JsonLdEvent | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const raw = JSON.parse($(el).html() ?? "") as unknown;
      const items: JsonLdEvent[] = Array.isArray(raw) ? (raw as JsonLdEvent[]) : [raw as JsonLdEvent];
      for (const item of items) {
        if (item["@type"] === "Event") {
          found = item;
          break;
        }
      }
    } catch {
      // malformed block — skip
    }
  });

  return found;
}

function imageFromJsonLd(ld: JsonLdEvent): string | null {
  if (!ld.image) return null;
  if (typeof ld.image === "string") return ld.image;
  if (Array.isArray(ld.image)) {
    const first = ld.image[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) {
      return (first as { url?: string }).url ?? null;
    }
  }
  if (typeof ld.image === "object" && "url" in ld.image) {
    return (ld.image as { url?: string }).url ?? null;
  }
  return null;
}

function locationFromJsonLd(ld: JsonLdEvent): {
  name: string | null;
  street: string | null;
} {
  const loc = ld.location;
  if (!loc) return { name: null, street: null };
  const name = loc.name ?? null;
  if (typeof loc.address === "string") {
    return { name, street: loc.address };
  }
  if (loc.address && typeof loc.address === "object") {
    return { name, street: loc.address.streetAddress ?? null };
  }
  return { name, street: null };
}

// ---------------------------------------------------------------------------
// Per-detail-page extraction
// ---------------------------------------------------------------------------

async function scrapeDetailPage(
  detailUrl: string,
  source: { name: string; url: string },
): Promise<NormalizedScrapedEvent | null> {
  let html: string;
  try {
    html = await fetchSourceHtml(detailUrl);
  } catch {
    return null;
  }

  const $ = cheerio.load(html);
  const ld = findJsonLdEvent(html);

  // ---- title ----
  let title =
    (ld?.name ? cleanText(ld.name) : "") ||
    cleanText($("[data-hook='event-title']").first().text()) ||
    cleanText($("h1").first().text()) ||
    cleanText($(".event-title").first().text());

  if (!title) return null;

  // ---- dates ----
  let startDateTime: Date | null = null;
  let endDateTime: Date | null = null;

  if (ld?.startDate) {
    const d = new Date(ld.startDate);
    if (!Number.isNaN(d.getTime())) startDateTime = d;
  }
  if (!startDateTime) {
    const timeAttr = $("time[datetime]").first().attr("datetime");
    if (timeAttr) {
      const d = new Date(timeAttr);
      if (!Number.isNaN(d.getTime())) startDateTime = d;
    }
  }

  if (!startDateTime) return null; // must have a start date

  if (ld?.endDate) {
    const d = new Date(ld.endDate);
    if (!Number.isNaN(d.getTime())) endDateTime = d;
  }

  // ---- description ----
  const description =
    (ld?.description ? cleanText(ld.description) : "") ||
    cleanText($("[data-hook='event-description']").first().text()) ||
    cleanText($(".event-description").first().text()) ||
    null;

  // ---- location ----
  const locFromLd = ld ? locationFromJsonLd(ld) : { name: null, street: null };

  const locationName =
    locFromLd.name ||
    cleanText($("[data-hook='event-location']").first().text()) ||
    cleanText($("[class*='location']").first().text()) ||
    "Downtown Dallas";

  const address =
    locFromLd.street ||
    null;

  // ---- image ----
  let imageUrl: string | null = null;

  const ldImg = ld ? imageFromJsonLd(ld) : null;
  if (ldImg && !EXCLUDED_IMAGE_RE.test(ldImg)) {
    imageUrl = toAbsoluteUrl(source.url, ldImg) ?? null;
  }

  if (!imageUrl) {
    $("img[src], img[data-src]").each((_, el) => {
      if (imageUrl) return;
      const src = $(el).attr("src") ?? $(el).attr("data-src") ?? "";
      if (src && !EXCLUDED_IMAGE_RE.test(src)) {
        imageUrl = toAbsoluteUrl(source.url, src) ?? null;
      }
    });
  }

  // ---- derived boolean flags ----
  const combined = [title, description, locationName, address]
    .filter(Boolean)
    .join(" ");

  const isFree =
    /free\s*(admission|entry|event|to\s+attend)|no\s*(charge|cost|fee)|admission\s+is\s+free/i.test(
      combined,
    );

  const isKidFriendly = /family|children|kids|school|youth/i.test(combined);

  const isOutdoor =
    /downtown|festival|parade|car\s+show|street|square|outdoor/i.test(
      combined,
    );

  return {
    title,
    description: description || null,
    startDateTime,
    endDateTime: endDateTime ?? null,
    locationName,
    address: address || null,
    city: "Dallas",
    county: "Paulding",
    category: inferCategory(combined),
    tags: ["downtown", "dallas"],
    isFree,
    isKidFriendly,
    isOutdoor,
    sourceName: source.name,
    sourceUrl: source.url,
    originalUrl: detailUrl,
    imageUrl,
    confidenceScore: 0.9,
  };
}

// ---------------------------------------------------------------------------
// Concurrency runner
// ---------------------------------------------------------------------------

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const idx = next++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
  );

  return results;
}

// ---------------------------------------------------------------------------
// Scraper export
// ---------------------------------------------------------------------------

export const myDallasGaScraper: SourceScraper = {
  sourceName: SOURCE_NAME,

  async scrape(source): Promise<ScrapeOutput> {
    // Always fetch /events regardless of what the stored source URL is
    const eventsUrl = buildEventsUrl(source.url);
    const listingHtml = await fetchSourceHtml(eventsUrl);
    const $ = cheerio.load(listingHtml);

    // Collect unique event detail-page URLs
    const detailUrls = new Set<string>();
    $(`a[href*="${DETAIL_PATTERN}"]`).each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const absolute = toAbsoluteUrl(source.url, href);
      if (absolute) detailUrls.add(absolute);
    });

    console.log(
      `[MYDALLASGA] ${detailUrls.size} detail link(s) found on ${eventsUrl}`,
    );

    if (detailUrls.size === 0) {
      return {
        status: "PARTIAL",
        message:
          "MyDallasGA events page loaded but no /event-details-registration/ links were found.",
        events: [],
      };
    }

    const tasks = Array.from(detailUrls).map(
      (url) => () => scrapeDetailPage(url, source),
    );

    const raw = await runWithConcurrency(tasks, CONCURRENCY);

    const events = dedupeNormalizedEvents(
      raw.filter((e): e is NormalizedScrapedEvent => e !== null),
    );

    return {
      status: events.length > 0 ? "SUCCESS" : "PARTIAL",
      message:
        events.length > 0
          ? `Scraped ${events.length} event(s) from MyDallasGA.`
          : "MyDallasGA detail pages loaded but no valid events were extracted.",
      events,
    };
  },
};
