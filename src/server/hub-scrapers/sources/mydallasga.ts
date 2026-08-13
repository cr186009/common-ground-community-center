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

function buildEventCalendarUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl.replace(/\/$/, ""));
  url.pathname = "/eventcalendar";
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

export function findJsonLdEvent(html: string): JsonLdEvent | null {
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
  const title =
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

  const address = locFromLd.street || null;

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
    dateEvidence: {
      listingDate: ld?.startDate ?? startDateTime.toISOString(),
      structuredDate: ld?.startDate ?? startDateTime.toISOString(),
      sourcePublishedText: [ld?.startDate, ld?.endDate]
        .filter(Boolean)
        .join(" – ") || null,
    },
  };
}

/** Return only canonical Wix event detail URLs, excluding social-share links. */
export function collectDetailUrls(html: string, sourceUrl: string): Set<string> {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  const sourceOrigin = new URL(sourceUrl).origin;

  $(`a[href*="${DETAIL_PATTERN}"]`).each((_, el) => {
    const href = $(el).attr("href");
    const absolute = href ? toAbsoluteUrl(sourceUrl, href) : null;
    if (!absolute) return;

    const url = new URL(absolute);
    if (url.origin !== sourceOrigin || !url.pathname.startsWith(DETAIL_PATTERN)) return;
    // Wix social-share hrefs append `&quote=...` directly to the event path.
    url.pathname = url.pathname.split("&")[0];
    url.search = "";
    url.hash = "";
    urls.add(url.toString().replace(/\/$/, ""));
  });

  return urls;
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
// /eventcalendar inspection
// ---------------------------------------------------------------------------

async function collectEventCalendarUrls(
  sourceUrl: string,
): Promise<{ urls: Set<string>; calendarMessage: string | null }> {
  const calendarUrl = buildEventCalendarUrl(sourceUrl);
  let html: string;

  try {
    html = await fetchSourceHtml(calendarUrl);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : String(error);
    console.warn(`[MYDALLASGA] Could not fetch /eventcalendar: ${msg}`);
    return {
      urls: new Set(),
      calendarMessage: `Could not fetch /eventcalendar (${calendarUrl}): ${msg}`,
    };
  }

  const $ = cheerio.load(html);
  const urls = collectDetailUrls(html, sourceUrl);

  // Strategy 1: direct /event-details-registration/ anchor tags
  if (urls.size > 0) {
    console.log(
      `[MYDALLASGA] /eventcalendar: found ${urls.size} event-details link(s) via anchor tags`,
    );
    return { urls, calendarMessage: null };
  }

  // Strategy 2: /event-details-registration/ paths embedded in script content
  // (Wix sometimes serialises route data into a <script> block)
  $("script").each((_, el) => {
    if (urls.size > 0) return;
    const content = $(el).html() ?? "";
    const matches =
      content.match(/\/event-details-registration\/[^"'\\<>\s]+/g) ?? [];
    for (const path of matches) {
      const abs = toAbsoluteUrl(sourceUrl, path);
      if (abs) urls.add(abs);
    }
  });

  if (urls.size > 0) {
    console.log(
      `[MYDALLASGA] /eventcalendar: found ${urls.size} event link(s) via script data`,
    );
    return { urls, calendarMessage: null };
  }

  // Strategy 3: JSON-LD (may contain a single featured event)
  const ld = findJsonLdEvent(html);
  if (ld?.name) {
    console.log(
      "[MYDALLASGA] /eventcalendar: JSON-LD Event object found but no navigable detail link — skipping",
    );
  }

  // Nothing found — report clearly, do not fail the overall scraper
  const calendarMessage =
    `/eventcalendar (${calendarUrl}) was fetched but contained zero detectable event records. ` +
    "The page likely loads its calendar grid dynamically via Wix client-side JavaScript, " +
    "which is not accessible without a browser runtime.";
  console.log(`[MYDALLASGA] ${calendarMessage}`);
  return { urls: new Set(), calendarMessage };
}

// ---------------------------------------------------------------------------
// Deduplication across both endpoints
// ---------------------------------------------------------------------------

function dedupeByNormalizedKey(
  events: NormalizedScrapedEvent[],
): NormalizedScrapedEvent[] {
  // Combine the project's normalised dedupe with URL-based dedupe
  const byUrl = new Map<string, NormalizedScrapedEvent>();
  for (const e of events) {
    if (e.originalUrl) {
      // Normalise the URL: strip query string and trailing slash
      const normUrl = e.originalUrl.split("?")[0].replace(/\/$/, "");
      if (!byUrl.has(normUrl)) byUrl.set(normUrl, e);
    }
  }
  // Any event without a URL gets kept; pass all through the title+date dedupe
  const withUrls = Array.from(byUrl.values());
  const withoutUrls = events.filter((e) => !e.originalUrl);
  return dedupeNormalizedEvents([...withUrls, ...withoutUrls]);
}

// ---------------------------------------------------------------------------
// Scraper export
// ---------------------------------------------------------------------------

export const myDallasGaScraper: SourceScraper = {
  sourceName: SOURCE_NAME,

  async scrape(source): Promise<ScrapeOutput> {
    // ---- /events (primary feed) ----
    const eventsUrl = buildEventsUrl(source.url);
    const listingHtml = await fetchSourceHtml(eventsUrl);
    const detailUrls = collectDetailUrls(listingHtml, source.url);

    console.log(
      `[MYDALLASGA] ${detailUrls.size} detail link(s) found on ${eventsUrl}`,
    );

    // ---- /eventcalendar (secondary feed) ----
    const { urls: calendarUrls, calendarMessage } =
      await collectEventCalendarUrls(source.url);

    for (const url of calendarUrls) detailUrls.add(url);

    console.log(
      `[MYDALLASGA] ${detailUrls.size} unique detail URL(s) after combining both endpoints`,
    );

    if (detailUrls.size === 0) {
      return {
        status: "PARTIAL",
        message:
          "MyDallasGA events page loaded but no /event-details-registration/ links were found. " +
          (calendarMessage
            ? `Community calendar: ${calendarMessage}`
            : ""),
        events: [],
      };
    }

    const tasks = Array.from(detailUrls).map(
      (url) => () => scrapeDetailPage(url, source),
    );

    const raw = await runWithConcurrency(tasks, CONCURRENCY);

    const events = dedupeByNormalizedKey(
      raw.filter((e): e is NormalizedScrapedEvent => e !== null),
    );

    const baseMessage =
      events.length > 0
        ? `Scraped ${events.length} event(s) from MyDallasGA (${detailUrls.size} detail page(s) checked).`
        : "MyDallasGA detail pages loaded but no valid events were extracted.";

    const fullMessage = calendarMessage
      ? `${baseMessage} Community calendar: ${calendarMessage}`
      : baseMessage;

    return {
      status: events.length > 0 ? "SUCCESS" : "PARTIAL",
      message: fullMessage,
      events,
    };
  },
};
