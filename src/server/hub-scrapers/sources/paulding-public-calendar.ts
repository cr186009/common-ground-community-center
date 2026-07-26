import * as cheerio from "cheerio";
import { addMonths } from "date-fns";
import type { MeetingType } from "@prisma/client";

import {
  cleanText,
  fetchSourceHtml,
  inferCategory,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";
import type {
  NormalizedScrapedEvent,
  NormalizedScrapedMeeting,
  ScrapeOutput,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const SOURCE_NAME = "Paulding County public calendar";
const BASE_URL = "https://www.paulding.gov";
const MONTHS_TO_CHECK = 6;
const CONCURRENCY = 3;

// Known valid Paulding County city names (lowercase for matching)
const PAULDING_CITIES = [
  "hiram",
  "acworth",
  "powder springs",
  "braswell",
  "new georgia",
  "villa rica",
  "rockmart",
];

// Image patterns that indicate non-content graphics (logos, nav, icons, seals, etc.)
const EXCLUDED_IMAGE_RE =
  /logo|nav|footer|header|sponsor|icon|favicon|banner|social|arrow|button|background|seal|badge|flag|government|civic|map|placeholder/i;

// Titles or calendar names that indicate government meetings
const MEETING_RE =
  /board\s+of\s+commissioners|work\s+session|planning\s+commission|planning\s*[&and]+\s*zoning|public\s+hearing|zoning\s+hearing|county\s+board|county\s+commission|authority\s+meeting|committee\s+meeting/i;

// ---------------------------------------------------------------------------
// Meeting classification helpers
// ---------------------------------------------------------------------------

function inferGovernmentBody(title: string, calendarName: string): string {
  const text = `${title} ${calendarName}`.toLowerCase();
  if (/planning\s*[&and]+\s*zoning|zoning\s+hearing/.test(text))
    return "Paulding County Planning & Zoning";
  if (/planning\s+commission/.test(text))
    return "Paulding County Planning Commission";
  if (/board\s+of\s+commissioners|county\s+commission/.test(text))
    return "Paulding County Board of Commissioners";
  if (/work\s+session/.test(text))
    return "Paulding County Board of Commissioners";
  if (/parks\s+board/.test(text)) return "Paulding County Parks Board";
  if (/authority/.test(text)) return "Paulding County Authority";
  if (/committee/.test(text)) return "Paulding County Committee";
  return "Paulding County";
}

function inferMeetingType(title: string, calendarName: string): MeetingType {
  const text = `${title} ${calendarName}`.toLowerCase();
  if (/planning\s*[&and]+\s*zoning|zoning\s+hearing|planning\s+commission/.test(text))
    return "PLANNING_ZONING";
  if (/public\s+hearing/.test(text)) return "PUBLIC_HEARING";
  if (/parks\s+board/.test(text)) return "PARKS_BOARD";
  if (/board\s+of\s+commissioners|work\s+session|county\s+commission/.test(text))
    return "COUNTY_COMMISSION";
  return "OTHER";
}

// ---------------------------------------------------------------------------
// Event classification helpers
// ---------------------------------------------------------------------------

function categoryFromCalendar(calendarName: string, combinedText: string) {
  const cal = calendarName.toLowerCase();
  if (/library/.test(cal)) return "LIBRARY" as const;
  if (/park|recreation/.test(cal)) return "PARKS_RECREATION" as const;
  if (/senior/.test(cal)) return "FAMILY" as const;
  if (/recycle|recycling|beautif|cleanup|keep\s+paulding/.test(cal))
    return "VOLUNTEER" as const;
  if (/sheriff|fire\s+department/.test(cal)) return "GOVERNMENT_MEETING" as const;
  // Fall through to text-based inference
  return inferCategory(combinedText);
}

function tagsFromCalendar(calendarName: string): string[] {
  const tags = ["paulding county", "county calendar"];
  const normalized = calendarName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (normalized && !["paulding county", "county calendar"].includes(normalized)) {
    tags.push(normalized);
  }
  return tags;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function buildMonthUrl(month: Date): string {
  const url = new URL(`${BASE_URL}/calendar.aspx`);
  url.searchParams.set("view", "list");
  url.searchParams.set("month", String(month.getMonth() + 1));
  url.searchParams.set("year", String(month.getFullYear()));
  return url.toString();
}

function collectEidUrls(html: string): Set<string> {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/calendar\.aspx\?.*eid=/i.test(href)) {
      const abs = toAbsoluteUrl(BASE_URL, href);
      if (abs) urls.add(abs);
    }
  });
  return urls;
}

// ---------------------------------------------------------------------------
// Date extraction
// ---------------------------------------------------------------------------

function firstIsoDate(text: string): Date | null {
  // Matches ISO-like strings that CivicPlus embeds in the page
  const matches =
    text.match(/\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)\b/g) ?? [];
  for (const m of matches) {
    const d = new Date(m);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function allIsoDates(text: string): Date[] {
  const matches =
    text.match(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\b/g) ?? [];
  return matches
    .map((m) => new Date(m))
    .filter((d) => !Number.isNaN(d.getTime()));
}

function findFriendlyDate(text: string): Date | null {
  // e.g. "July 15, 2026 6:00 PM" or "July 15 2026"
  const m = text.match(
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+20\d{2}(?:\s+\d{1,2}:\d{2}\s*(?:am|pm))?/i,
  );
  if (!m) return null;
  const d = new Date(m[0]);
  return Number.isNaN(d.getTime()) ? null : d;
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
// Detail page scraper
// ---------------------------------------------------------------------------

type DetailResult =
  | { kind: "event"; event: NormalizedScrapedEvent }
  | { kind: "meeting"; meeting: NormalizedScrapedMeeting }
  | null;

async function scrapeDetailPage(
  detailUrl: string,
  source: { name: string; url: string },
): Promise<DetailResult> {
  let html: string;
  try {
    html = await fetchSourceHtml(detailUrl);
  } catch {
    return null;
  }

  const $ = cheerio.load(html);

  // ---- title ----
  // CivicPlus uses various selectors across versions; try the most common
  const title =
    cleanText($(".pagetitle, .page-title").first().text()) ||
    cleanText(
      $("[id*='EventName'], [id*='lblEventName'], [class*='EventName']")
        .first()
        .text(),
    ) ||
    cleanText($("h1").first().text()) ||
    cleanText($(".event-title").first().text()) ||
    cleanText($("title").first().text().split(/[|\-–]/)[0]);

  if (!title || title.length < 3) return null;

  // ---- calendar/category name ----
  // CivicPlus exposes the calendar name in breadcrumbs or a dedicated label
  const calendarName =
    cleanText(
      $("[id*='CalendarName'], [id*='lblCalendarName'], [class*='CalendarName']")
        .first()
        .text(),
    ) ||
    cleanText(
      // Last breadcrumb before the current page
      $("a[href*='Calendar.aspx?CID='], a[href*='calendar.aspx?CID=']")
        .first()
        .text(),
    ) ||
    cleanText(
      $(".breadcrumb a, .breadcrumbs a, nav[aria-label='breadcrumb'] a")
        .last()
        .text(),
    ) ||
    "";

  // ---- dates ----
  let startDateTime: Date | null = null;
  let endDateTime: Date | null = null;

  // Try <meta> tags first (some CivicPlus versions include these)
  const metaStart =
    $(
      "meta[name*='start'], meta[property*='startDate'], meta[itemprop='startDate']",
    ).attr("content") ?? null;
  if (metaStart) {
    const d = new Date(metaStart);
    if (!Number.isNaN(d.getTime())) startDateTime = d;
  }

  // Try <time datetime="..."> elements
  if (!startDateTime) {
    $("time[datetime]").each((_, el) => {
      if (startDateTime) return;
      const d = new Date($(el).attr("datetime") ?? "");
      if (!Number.isNaN(d.getTime())) startDateTime = d;
    });
  }

  // Scan full page text for ISO datetime strings (CivicPlus embeds these)
  if (!startDateTime) {
    const fullText = $.root().text();
    const dates = allIsoDates(fullText);
    if (dates.length > 0) {
      startDateTime = dates[0];
      if (dates.length > 1 && dates[1] > dates[0]) {
        endDateTime = dates[1];
      }
    }
  }

  // Fall back to friendly date format
  if (!startDateTime) {
    startDateTime = findFriendlyDate($.root().text());
  }

  if (!startDateTime) return null;

  // If end date not yet found, try a second ISO date pass (in case page only
  // uses friendly format for start)
  if (!endDateTime) {
    const allText = $.root().text();
    const dates = allIsoDates(allText);
    if (dates.length >= 2) {
      const candidate = dates[1];
      if (candidate > startDateTime) endDateTime = candidate;
    }
  }

  // ---- description ----
  const description =
    cleanText(
      $(
        "[id*='Details'], [id*='Description'], [class*='EventDescription'], [class*='EventDetails'] p",
      )
        .first()
        .text(),
    ) ||
    cleanText(
      $(".event-description, .field-Description").first().text(),
    ) ||
    null;

  // ---- location ----
  const locationName =
    cleanText(
      $(
        "[id*='Location'], [id*='lblLocation'], [class*='LocationName']",
      )
        .first()
        .text(),
    ) ||
    cleanText($(".location, .eventlocation, [class*='location']").first().text()) ||
    null;

  const address =
    cleanText(
      $(
        "[id*='Address'], [class*='LocationAddress'], .address, .eventaddress",
      )
        .first()
        .text(),
    ) || null;

  // ---- city from page content ----
  const combinedForCity = [locationName, address, description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let city = "Dallas"; // spec default
  for (const pc of PAULDING_CITIES) {
    if (combinedForCity.includes(pc)) {
      city = pc
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  // ---- image ----
  let imageUrl: string | null = null;
  $("img[src], img[data-src]").each((_, el) => {
    if (imageUrl) return;
    const src = $(el).attr("src") ?? $(el).attr("data-src") ?? "";
    if (
      src &&
      !EXCLUDED_IMAGE_RE.test(src) &&
      /\.(jpe?g|png|webp|gif)/i.test(src)
    ) {
      const abs = toAbsoluteUrl(BASE_URL, src);
      if (abs) imageUrl = abs;
    }
  });

  // ---- agenda URL (for meetings) ----
  let agendaUrl: string | null = null;
  $("a[href]").each((_, el) => {
    if (agendaUrl) return;
    const href = $(el).attr("href") ?? "";
    const linkText = cleanText($(el).text()).toLowerCase();
    if (/agenda/i.test(linkText) || /agenda/i.test(href)) {
      agendaUrl = toAbsoluteUrl(BASE_URL, href) ?? null;
    }
  });

  const combinedText = [title, description ?? "", locationName ?? "", calendarName].join(
    " ",
  );

  // ---- route to meeting or event? ----
  const isMeeting =
    MEETING_RE.test(title) || (calendarName !== "" && MEETING_RE.test(calendarName));

  if (isMeeting) {
    return {
      kind: "meeting",
      meeting: {
        title,
        governmentBody: inferGovernmentBody(title, calendarName),
        meetingType: inferMeetingType(title, calendarName),
        startDateTime,
        endDateTime: endDateTime ?? null,
        locationName: locationName || "Paulding County Government",
        address: address || null,
        city,
        county: "Paulding",
        agendaUrl,
        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl: detailUrl,
        status: "UPCOMING",
        keyTopics: calendarName ? [calendarName] : [],
      },
    };
  }

  return {
    kind: "event",
    event: {
      title,
      description: description || null,
      startDateTime,
      endDateTime: endDateTime ?? null,
      locationName: locationName || null,
      address: address || null,
      city,
      county: "Paulding",
      category: categoryFromCalendar(calendarName, combinedText),
      tags: tagsFromCalendar(calendarName),
      cost: /free/i.test(combinedText) ? "Free" : null,
      isFree: /free/i.test(combinedText),
      isKidFriendly:
        /kids|children|child|family|youth|puppet|storytime/i.test(combinedText),
      isOutdoor:
        /park|trail|outdoor|field|pavilion|garden|nature|playground/i.test(
          combinedText,
        ),
      sourceName: source.name,
      sourceUrl: source.url,
      originalUrl: detailUrl,
      imageUrl,
      confidenceScore: 0.9,
    },
  };
}

// ---------------------------------------------------------------------------
// Scraper export
// ---------------------------------------------------------------------------

export const pauldingPublicCalendarScraper: SourceScraper = {
  sourceName: SOURCE_NAME,

  async scrape(source): Promise<ScrapeOutput> {
    const now = new Date();
    const allEidUrls = new Set<string>();
    const pageErrors: string[] = [];

    // Collect EID detail-page URLs across 6 months of list-view pages
    for (let monthOffset = 0; monthOffset < MONTHS_TO_CHECK; monthOffset++) {
      const month = addMonths(now, monthOffset);
      const pageUrl = buildMonthUrl(month);
      try {
        const html = await fetchSourceHtml(pageUrl);
        const eidUrls = collectEidUrls(html);
        for (const url of eidUrls) allEidUrls.add(url);
        console.log(
          `[PAULDING-PUBLIC] ${eidUrls.size} EID link(s) found on ${pageUrl}`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const label = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
        pageErrors.push(`${label}: ${msg}`);
        console.warn(`[PAULDING-PUBLIC] Failed to fetch ${pageUrl}: ${msg}`);
      }
    }

    if (allEidUrls.size === 0) {
      return {
        events: [],
        meetings: [],
        status: "PARTIAL",
        message:
          pageErrors.length > 0
            ? `No Paulding public calendar EIDs collected. Page errors: ${pageErrors.join("; ")}`
            : "Paulding public calendar was reached but no Calendar.aspx?EID= links were found.",
      };
    }

    console.log(
      `[PAULDING-PUBLIC] Scraping ${allEidUrls.size} unique detail page(s) with concurrency ${CONCURRENCY}`,
    );

    const tasks = Array.from(allEidUrls).map(
      (url) => () => scrapeDetailPage(url, source),
    );
    const raw = await runWithConcurrency(tasks, CONCURRENCY);

    const events: NormalizedScrapedEvent[] = [];
    const meetings: NormalizedScrapedMeeting[] = [];

    for (const result of raw) {
      if (!result) continue;
      if (result.kind === "event") events.push(result.event);
      else meetings.push(result.meeting);
    }

    // Deduplicate events
    const seenEvents = new Map<string, NormalizedScrapedEvent>();
    for (const e of events) {
      const key = `${e.title.toLowerCase()}::${e.startDateTime.toISOString()}::${e.city.toLowerCase()}`;
      if (!seenEvents.has(key)) seenEvents.set(key, e);
    }
    const dedupedEvents = Array.from(seenEvents.values());

    // Deduplicate meetings
    const seenMeetings = new Map<string, NormalizedScrapedMeeting>();
    for (const m of meetings) {
      const key = `${m.title.toLowerCase()}::${m.startDateTime.toISOString()}`;
      if (!seenMeetings.has(key)) seenMeetings.set(key, m);
    }
    const dedupedMeetings = Array.from(seenMeetings.values());

    const totalFound = dedupedEvents.length + dedupedMeetings.length;

    if (totalFound === 0 && pageErrors.length > 0) {
      return {
        events: [],
        meetings: [],
        status: "PARTIAL",
        message: `Detail pages fetched but no valid items parsed. Errors: ${pageErrors.join("; ")}`,
      };
    }

    if (totalFound === 0) {
      return {
        events: [],
        meetings: [],
        status: "PARTIAL",
        message:
          "Paulding public calendar detail pages were fetched but no events or meetings could be extracted.",
      };
    }

    return {
      events: dedupedEvents,
      meetings: dedupedMeetings,
      status: pageErrors.length > 0 ? "PARTIAL" : "SUCCESS",
      message: `Parsed ${dedupedEvents.length} event(s) and ${dedupedMeetings.length} meeting(s) from Paulding County public calendar (${MONTHS_TO_CHECK} months).`,
    };
  },
};
