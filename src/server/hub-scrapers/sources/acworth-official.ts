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
  SourceScraper,
} from "@/server/hub-scrapers/types";

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function isUpcoming(date: Date) {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return date >= today;
}

function extractDate(
  $: cheerio.CheerioAPI,
  element: Parameters<cheerio.CheerioAPI>[0],
) {
 const dateCandidates = [
    $(element).attr("datetime"),
    $(element).find("[datetime]").first().attr("datetime"),
    $(element).find("time").first().text(),
    $(element).find(".date").first().text(),
    $(element).find(".event-date").first().text(),
  ];

  for (const candidate of dateCandidates) {
    const parsed = parseDate(candidate);

    if (parsed) {
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

      const startDateTime = extractDate($, element);

      if (!startDateTime || !isUpcoming(startDateTime)) {
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
        startDateTime,
        endDateTime: null,

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