import { parseCommunityDateTime } from "@/lib/hub-date";
import {
  cleanPublicText,
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
} from "@/server/hub-scrapers/helpers";
import { getMeetingStatus, inferMeetingType } from "@/server/hub-scrapers/content-classifier";
import type {
  NormalizedScrapedEvent,
  NormalizedScrapedMeeting,
  ScrapeOutput,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const CALENDAR_PATH = "/calendar.php";
const FEED_PATH = "/_assets_/plugins/revizeCalendar/calendar_data_handler.php";
const MAX_DAYS_AHEAD = 400;
const MEETING_PATTERN = /\b(?:meeting|work session|public hearing)\b/i;
const CLOSURE_PATTERN = /\b(?:offices? closed|admin(?:istrative)? offices? closed|closed\s*-|happy (?:easter|thanksgiving|christmas))\b/i;

type RevizeEvent = {
  title?: unknown;
  start?: unknown;
  end?: unknown;
  location?: unknown;
  desc?: unknown;
  url?: unknown;
  rid?: unknown;
  id?: unknown;
  allDay?: unknown;
  rrule?: unknown;
};

function parseEasternIso(value: string) {
  const normalized = value.slice(0, 16);
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return null;
  try {
    return parseCommunityDateTime(normalized);
  } catch {
    return null;
  }
}

function decodeDescription(value: string) {
  try {
    return cleanPublicText(decodeURIComponent(value.replace(/\+/g, " ")));
  } catch {
    return cleanPublicText(value);
  }
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function occurrenceDates(item: RevizeEvent, start: Date, now: Date) {
  const rrule = typeof item.rrule === "string" ? item.rrule : "";
  if (!/RRULE:FREQ=MONTHLY/i.test(rrule)) return [start];

  const byDay = rrule.match(/BYDAY=(MO|TU|WE|TH|FR|SA|SU)/i)?.[1].toUpperCase();
  const position = Number(rrule.match(/BYSETPOS=(-?\d+)/i)?.[1] ?? "1");
  const interval = Math.max(1, Number(rrule.match(/INTERVAL=(\d+)/i)?.[1] ?? "1"));
  if (!byDay || position !== 1) return [start];

  const weekDay = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"].indexOf(byDay);
  const startParts = start.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).match(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+)/);
  if (!startParts) return [start];

  const exceptions = new Set(
    Array.from(rrule.matchAll(/EXDATE:(\d{4})(\d{2})(\d{2})T/g), (match) =>
      `${match[1]}-${match[2]}-${match[3]}`),
  );
  const latest = new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000);
  const occurrences: Date[] = [];
  let monthIndex = Number(startParts[1]) - 1;
  let year = Number(startParts[3]);
  let sequence = 0;

  while (year < latest.getUTCFullYear() + 2) {
    if (sequence % interval === 0) {
      const firstWeekDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
      const day = 1 + (weekDay - firstWeekDay + 7) % 7;
      const local = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${startParts[4]}:${startParts[5]}`;
      const occurrence = parseEasternIso(local);
      if (occurrence && occurrence >= start && occurrence <= latest && !exceptions.has(local.slice(0, 10))) {
        occurrences.push(occurrence);
      }
    }
    monthIndex += 1;
    if (monthIndex === 12) { monthIndex = 0; year += 1; }
    sequence += 1;
  }
  return occurrences;
}

export function parsePolkCountyCalendarJson(
  input: string,
  source: { name: string; url: string },
  now = new Date(),
): Pick<ScrapeOutput, "events" | "meetings"> {
  const parsed: unknown = JSON.parse(input);
  if (!Array.isArray(parsed)) throw new Error("Polk County calendar feed was not an array.");

  const earliest = new Date(now.getTime() - 86_400_000);
  const latest = new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000);
  const events: NormalizedScrapedEvent[] = [];
  const meetings: NormalizedScrapedMeeting[] = [];

  for (const raw of parsed as RevizeEvent[]) {
    const title = cleanText(typeof raw.title === "string" ? raw.title : "");
    const start = parseEasternIso(typeof raw.start === "string" ? raw.start : "");
    if (!title || !start || CLOSURE_PATTERN.test(title)) continue;

    const originalEnd = parseEasternIso(typeof raw.end === "string" ? raw.end : "");
    const duration = originalEnd && originalEnd >= start ? originalEnd.getTime() - start.getTime() : 0;
    const location = cleanText(typeof raw.location === "string" ? raw.location : "");
    const description = decodeDescription(typeof raw.desc === "string" ? raw.desc : "") || null;
    const id = cleanText(String(raw.rid ?? raw.id ?? ""));
    const originalUrl = typeof raw.url === "string" && /^https?:\/\//i.test(raw.url)
      ? raw.url
      : `${source.url}${id ? `#event-${encodeURIComponent(id)}` : ""}`;

    for (const startDateTime of occurrenceDates(raw, start, now)) {
      if (startDateTime < earliest || startDateTime > latest) continue;
      const endDateTime = duration ? new Date(startDateTime.getTime() + duration) : null;
      const allDay = raw.allDay === true;
      const searchableText = `${title} ${description ?? ""}`;

      if (MEETING_PATTERN.test(searchableText)) {
        meetings.push({
          title,
          governmentBody: /board of commissioners/i.test(searchableText)
            ? "Polk County Board of Commissioners"
            : "Polk County Government",
          meetingType: inferMeetingType(searchableText),
          startDateTime,
          endDateTime,
          locationName: location || "Polk County Administrative Office",
          address: location || null,
          city: /rockmart/i.test(location) ? "Rockmart" : "Cedartown",
          county: "Polk",
          sourceName: source.name,
          sourceUrl: source.url,
          originalUrl,
          status: getMeetingStatus(startDateTime, endDateTime, now),
          summary: description,
        });
        continue;
      }

      events.push({
        title,
        description,
        startDateTime,
        endDateTime,
        locationName: location || "Polk County",
        address: location || null,
        city: /rockmart/i.test(location) ? "Rockmart" : /cedartown/i.test(location) ? "Cedartown" : "Polk County",
        county: "Polk",
        category: inferCategory(searchableText),
        tags: ["polk county", "official calendar"],
        cost: null,
        isFree: /\bfree\b/i.test(searchableText),
        isKidFriendly: /\bfamil(?:y|ies)|kids?|children|youth|homeschool\b/i.test(searchableText),
        isOutdoor: /\bpark|trail|outdoor|truck\b/i.test(searchableText),
        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl,
        confidenceScore: location ? 0.96 : 0.9,
        isAllDay: allDay,
        timeZone: "America/New_York",
      });
    }
  }

  const seenMeetings = new Set<string>();
  return {
    events: dedupeNormalizedEvents(events),
    meetings: meetings.filter((meeting) => {
      const key = `${meeting.title.toLowerCase()}::${dateKey(meeting.startDateTime)}::${meeting.startDateTime.getTime()}`;
      if (seenMeetings.has(key)) return false;
      seenMeetings.add(key);
      return true;
    }),
  };
}

export const polkCountyOfficialScraper: SourceScraper = {
  sourceName: "Polk County official calendar",

  async scrape(source) {
    const calendarUrl = new URL(CALENDAR_PATH, source.url).toString();
    const endpoint = new URL(FEED_PATH, source.url);
    endpoint.searchParams.set("webspace", "polkcountyga");
    endpoint.searchParams.set("relative_revize_url", "//cms2.revize.com");
    endpoint.searchParams.set("protocol", "https:");
    const output = parsePolkCountyCalendarJson(
      await fetchSourceHtml(endpoint.toString()),
      { name: source.name, url: calendarUrl },
    );
    const count = (output.events?.length ?? 0) + (output.meetings?.length ?? 0);

    return {
      ...output,
      status: count ? "SUCCESS" : "PARTIAL",
      message: `Parsed ${output.events?.length ?? 0} Polk County events and ${output.meetings?.length ?? 0} government meetings.`,
    };
  },
};
