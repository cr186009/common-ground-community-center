import { type Category } from "@prisma/client";
import { addYears, format, isBefore, parse, startOfDay, subDays } from "date-fns";

import type { NormalizedScrapedEvent } from "@/server/hub-scrapers/types";

const DATE_PATTERNS = [
  "MMMM d, yyyy h:mm a",
  "MMMM d yyyy h:mm a",
  "MMM d, yyyy h:mm a",
  "MMM d yyyy h:mm a",
  "M/d/yyyy h:mm a",
  "M/d/yy h:mm a",
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "M/d/yyyy",
];

export async function fetchSourceHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function toAbsoluteUrl(baseUrl: string, input: string | null | undefined) {
  if (!input) {
    return undefined;
  }

  try {
    return new URL(input, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function inferCategory(text: string): Category {
  const value = text.toLowerCase();

  if (/(meeting|council|commission|board|hearing|zoning)/.test(value)) {
    return "GOVERNMENT_MEETING";
  }

  if (/(trivia)/.test(value)) {
    return "TRIVIA";
  }

  if (/(karaoke)/.test(value)) {
    return "KARAOKE";
  }

  if (/(music|concert|choir|band|jam|songwriter)/.test(value)) {
    return "MUSIC";
  }

  if (/(food|bbq|brew|brewery|restaurant|taco|truck|dinner)/.test(value)) {
    return "FOOD_DRINK";
  }

  if (/(festival|parade|celebration|holiday|fair)/.test(value)) {
    return "FESTIVAL";
  }

  if (/(park|trail|pool|camp|outdoor|nature|recreation)/.test(value)) {
    return "PARKS_RECREATION";
  }

  if (/(soccer|football|baseball|softball|basketball|sports|tournament)/.test(value)) {
    return "SPORTS";
  }

  if (/(library|book|storytime|reading)/.test(value)) {
    return "LIBRARY";
  }

  if (/(school|class|students|teacher|graduation|pta)/.test(value)) {
    return "SCHOOL";
  }

  if (/(volunteer|cleanup|service|pantry|donation)/.test(value)) {
    return "VOLUNTEER";
  }

  if (/(family|kids|children|movie night|community day)/.test(value)) {
    return "FAMILY";
  }

  return "OTHER";
}

export function parsePartialDateWithYear(dateText: string, timeText?: string | null, now = new Date()) {
  const safeTime = cleanText(timeText) || "12:00 AM";
  const base = `${cleanText(dateText)} ${now.getFullYear()} ${safeTime}`;
  const parsed = parse(base, "MMMM d yyyy h:mm a", now);
  const rolloverThreshold = subDays(startOfDay(now), 30);

  if (isBefore(parsed, rolloverThreshold)) {
    return addYears(parsed, 1);
  }

  return parsed;
}

export function parseLooseDate(input: string, fallback = new Date()) {
  const cleaned = cleanText(input);

  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(cleaned, pattern, fallback);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const native = new Date(cleaned);
  return Number.isNaN(native.getTime()) ? null : native;
}

export function dedupeNormalizedEvents(events: NormalizedScrapedEvent[]) {
  const seen = new Map<string, NormalizedScrapedEvent>();

  for (const event of events) {
    const key = [
      event.title.toLowerCase(),
      format(event.startDateTime, "yyyy-MM-dd'T'HH:mm"),
      event.city.toLowerCase(),
      event.sourceName.toLowerCase(),
      event.category,
    ].join("::");

    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }

  return Array.from(seen.values());
}
