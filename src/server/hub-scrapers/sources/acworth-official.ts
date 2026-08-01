import * as cheerio from "cheerio";

import {
  COMMUNITY_TIME_ZONE,
  parseCommunityDateTime,
  startOfCommunityDay,
} from "@/lib/hub-date";

import {
  cleanText,
  dedupeNormalizedEvents,
  fetchSourceHtml,
  inferCategory,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";

import type {
  NormalizedScrapedEvent,
  SourceScraper,
} from "@/server/hub-scrapers/types";

export type ParsedAcworthDate = {
  date: Date;
  endDate?: Date | null;
  isAllDay: boolean;
};

const DATE_ONLY_PATTERN = /^(\d{4}-\d{2}-\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/;
const EXPLICIT_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parse Acworth's machine-readable calendar values without allowing a civil
 * date to masquerade as midnight UTC. Values with an offset represent an
 * instant; values without one are civil times in metro Atlanta.
 */
export function parseAcworthDate(value?: string): ParsedAcworthDate | null {
  const normalized = cleanText(value);

  if (!normalized) {
    return null;
  }

  const dateOnly = DATE_ONLY_PATTERN.exec(normalized);
  if (dateOnly) {
    try {
      return {
        date: parseCommunityDateTime(`${dateOnly[1]}T00:00`),
        isAllDay: true,
      };
    } catch {
      return null;
    }
  }

  const localDateTime = LOCAL_DATE_TIME_PATTERN.exec(normalized);
  if (localDateTime) {
    try {
      return {
        date: parseCommunityDateTime(`${localDateTime[1]}T${localDateTime[2]}`),
        isAllDay: false,
      };
    } catch {
      return null;
    }
  }

  if (!EXPLICIT_OFFSET_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime())
    ? null
    : { date: parsed, isAllDay: false };
}

function isUpcoming(date: Date, now = new Date()) {
  return date >= startOfCommunityDay(now);
}

function normalizeClockMatch(match: RegExpMatchArray) {
  const hour12 = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const hour = (hour12 % 12) + (match[3].toLowerCase() === "p" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseClockTimes(value: string) {
  return Array.from(
    value.matchAll(/\b(1[0-2]|0?\d)(?::([0-5]\d))?\s*([ap])\.?m\.?\b/gi),
    normalizeClockMatch,
  );
}

function extractDate(
  $: cheerio.CheerioAPI,
  element: Parameters<cheerio.CheerioAPI>[0],
): ParsedAcworthDate | null {
  const container = $(element);
  const dateCandidates = [
    $(element).attr("datetime"),
    ...container
      .find("[datetime]")
      .map((_, node) => $(node).attr("datetime"))
      .get(),
    $(element).find("time").first().text(),
    $(element).find(".date").first().text(),
    $(element).find(".event-date").first().text(),
  ];

  for (const candidate of dateCandidates) {
    const parsed = parseAcworthDate(candidate);

    if (parsed) {
      if (parsed.isAllDay) {
        const timeText = cleanText(
          container
            .find(
              ".tribe-event-date-start,.tribe-event-time,.tribe-events-calendar-list__event-datetime,.event-time",
            )
            .text(),
        );
        const clockTimes = parseClockTimes(timeText);

        if (clockTimes[0]) {
          const dateKey = cleanText(candidate);
          try {
            return {
              date: parseCommunityDateTime(`${dateKey}T${clockTimes[0]}`),
              endDate: clockTimes[1]
                ? parseCommunityDateTime(`${dateKey}T${clockTimes[1]}`)
                : null,
              isAllDay: false,
            };
          } catch {
            // Fall back to the valid date-only value below.
          }
        }
      }
      return parsed;
    }
  }

  return null;
}

export const acworthOfficialScraper: SourceScraper = {
  sourceName: "City of Acworth events",

  async scrape(source) {
    const html = await fetchSourceHtml(source.url);

    const $ = cheerio.load(html);

    const events: NormalizedScrapedEvent[] = [];

    /*
      Try multiple common WordPress/event layouts.
      We can tighten selectors after seeing the first scrape.
    */
    const candidates = $(
      [
        "article",
        ".event",
        ".event-item",
        ".tribe-events-calendar-list__event-row",
        ".tribe-events-calendar-list__event",
        ".mec-event-article",
      ].join(","),
    );

    console.log(
      `[ACWORTH] Found ${candidates.length} candidate event elements`,
    );

    candidates.each((_, element) => {
      const container = $(element);

      const title =
        cleanText(
          container
            .find(
              "h1,h2,h3,h4,.event-title,.tribe-events-calendar-list__event-title",
            )
            .first()
            .text(),
        ) ||
        cleanText(container.attr("title"));

      if (!title) {
        return;
      }

      const parsedStart = extractDate($, element);

      if (!parsedStart || !isUpcoming(parsedStart.date)) {
        return;
      }

      const description =
        cleanText(
          container
            .find(
              ".description,.event-description,.tribe-events-calendar-list__event-description",
            )
            .text(),
        ) || null;

      const link =
        container
          .find("a")
          .first()
          .attr("href") ?? source.url;

      const image =
        container
          .find("img")
          .first()
          .attr("src") ?? null;

      const combinedText = [
        title,
        description,
      ]
        .filter(Boolean)
        .join(" ");

      events.push({
        title,
        description,
        startDateTime: parsedStart.date,
        endDateTime: parsedStart.endDate ?? null,
        isAllDay: parsedStart.isAllDay,
        timeZone: COMMUNITY_TIME_ZONE,

        locationName: "City of Acworth",
        address: null,

        city: "Acworth",
        county: "Cobb",

        category: inferCategory(combinedText),

        tags: [
          "city event",
          "official calendar",
        ],

        cost: /free/i.test(combinedText)
          ? "Free"
          : null,

        isFree: /free/i.test(combinedText),

        isKidFriendly:
          /kids|children|family|youth|school/i.test(
            combinedText,
          ),

        isOutdoor:
          /park|outdoor|festival|concert|market/i.test(
            combinedText,
          ),

        sourceName: source.name,
        sourceUrl: source.url,

        originalUrl:
          toAbsoluteUrl(source.url, link) ??
          source.url,

        imageUrl:
          toAbsoluteUrl(source.url, image) ??
          null,

        confidenceScore: 0.85,
      });
    });

    const dedupedEvents =
      dedupeNormalizedEvents(events);

    return {
      events: dedupedEvents,

      status:
        dedupedEvents.length > 0
          ? "SUCCESS"
          : "PARTIAL",

      message:
        dedupedEvents.length > 0
          ? `Parsed ${dedupedEvents.length} upcoming Acworth events.`
          : "Acworth page loaded but no events were detected.",
    };
  },
};
