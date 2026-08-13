import * as ical from "node-ical";

import { cleanPublicText, cleanText, dedupeNormalizedEvents, inferCategory } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, ScrapeOutput, SourceScraper } from "@/server/hub-scrapers/types";

const ICAL_PATH = "/events/?ical=1";
const MAX_DAYS_AHEAD = 400;
const ALLOWED_BRANCHES = [
  { pattern: /^Dallas Public Library$/i, city: "Dallas" },
  { pattern: /^New Georgia Public Library$/i, city: "Dallas" },
  { pattern: /^(?:Hiram\s*[-–—]\s*)?(?:Maude P\. Ragsdale|Ragsdale) Public Library$/i, city: "Hiram" },
  { pattern: /^Crossroads Public Library$/i, city: "Acworth" },
] as const;

type IcalEvent = {
  type?: string;
  uid?: string;
  summary?: unknown;
  description?: unknown;
  location?: unknown;
  url?: unknown;
  start?: Date;
  end?: Date;
  status?: unknown;
  datetype?: unknown;
  categories?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function categoryText(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => cleanText(stringValue(item))).filter(Boolean).join(" ");
  if (value && typeof value === "object" && "val" in value) {
    return cleanText(stringValue((value as { val?: unknown }).val));
  }
  return cleanText(stringValue(value));
}

function splitLocation(value: string) {
  const parts = value.split(",").map(cleanText).filter(Boolean);
  const branch = ALLOWED_BRANCHES.find(({ pattern }) => pattern.test(parts[0] ?? ""));
  if (!branch) return null;
  return { branch: parts[0], address: parts.slice(1).join(", ") || null, city: branch.city };
}

export function parseWgrlsIcal(
  text: string,
  source: { name: string; url: string },
  now = new Date(),
): Pick<ScrapeOutput, "events"> {
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("WGRLS did not return an iCalendar document.");
  const parsed = ical.sync.parseICS(text);
  const earliest = new Date(now.getTime() - 86_400_000);
  const latest = new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000);
  const events: NormalizedScrapedEvent[] = [];

  for (const raw of Object.values(parsed) as IcalEvent[]) {
    if (raw.type !== "VEVENT" || !(raw.start instanceof Date) || Number.isNaN(raw.start.getTime())) continue;
    const title = cleanText(stringValue(raw.summary));
    const location = splitLocation(cleanText(stringValue(raw.location)));
    if (!title || !location || raw.start < earliest || raw.start > latest) continue;
    if (cleanText(stringValue(raw.status)).toUpperCase() === "CANCELLED") continue;
    const description = cleanPublicText(stringValue(raw.description)) || null;
    const categories = categoryText(raw.categories);
    const searchable = `${title} ${description ?? ""} ${categories}`;
    const uid = cleanText(raw.uid);
    const eventUrl = typeof raw.url === "string" && /^https:\/\//i.test(raw.url) ? raw.url : source.url;
    const endDateTime = raw.end instanceof Date && !Number.isNaN(raw.end.getTime()) && raw.end >= raw.start ? raw.end : null;

    events.push({
      title,
      description,
      startDateTime: raw.start,
      endDateTime,
      locationName: location.branch,
      address: location.address,
      city: location.city,
      county: "Paulding",
      category: inferCategory(searchable),
      tags: ["library", "WGRLS", location.branch, ...(categories ? [categories] : [])],
      isFree: true,
      isKidFriendly: /baby|child|famil|kid|preschool|storytime|teen|toddler|youth/i.test(searchable),
      isOutdoor: /outdoor|garden|trail/i.test(searchable),
      sourceName: source.name,
      sourceUrl: source.url,
      originalUrl: uid ? `${eventUrl}#wgrls-${encodeURIComponent(uid)}` : eventUrl,
      confidenceScore: 0.99,
      isAllDay: raw.datetype === "date",
      timeZone: "America/New_York",
      dateEvidence: {
        listingDate: raw.start,
        structuredDate: raw.start,
        sourcePublishedText: `Official WGRLS iCalendar DTSTART ${raw.start.toISOString()}; UID ${uid || "not supplied"}; status ${cleanText(stringValue(raw.status)) || "confirmed"}`,
      },
    });
  }
  return { events: dedupeNormalizedEvents(events) };
}

export const wgrlsEventsScraper: SourceScraper = {
  sourceName: "West Georgia Regional Library events",
  async scrape(source) {
    const feedUrl = new URL(ICAL_PATH, source.url).toString();
    const response = await fetch(feedUrl, { headers: { accept: "text/calendar,text/plain,*/*", "user-agent": "Common Ground Community Calendar (public-events scraper)" }, cache: "no-store" });
    if (!response.ok) throw new Error(`WGRLS iCalendar request failed: ${response.status} ${response.statusText}`);
    const output = parseWgrlsIcal(await response.text(), { name: source.name, url: source.url });
    const count = output.events?.length ?? 0;
    return {
      ...output,
      status: count ? "SUCCESS" : "PARTIAL",
      message: count
        ? `Parsed ${count} WGRLS events at the four explicitly allowlisted Paulding-area branches.`
        : "The official WGRLS feed loaded, but no current events matched the Dallas, New Georgia, Hiram–Ragsdale, or Crossroads branch allowlist.",
    };
  },
};
