import * as cheerio from "cheerio";

import {
  cleanText,
  dedupeNormalizedEvents,
  inferCategory,
  toAbsoluteUrl,
} from "@/server/hub-scrapers/helpers";

import type {
  NormalizedScrapedEvent,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const KENNESAW_EVENTS_API =
  "https://www.kennesaw-ga.gov/wp-json/tribe/events/v1/events";

const PAGE_SIZE = 50;
const MAX_PAGES = 50;

type TribeCategory = {
  name?: string;
  slug?: string;
};

type TribeImage = {
  url?: string;
  full?: {
    url?: string;
  };
  sizes?: {
    medium_large?: {
      url?: string;
    };
    large?: {
      url?: string;
    };
  };
};

type TribeVenue = {
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  province?: string;
  zip?: string;
  country?: string;
};

type TribeEvent = {
  id?: number;
  title?: string;
  description?: string;
  excerpt?: string;
  url?: string;
  website?: string;
  start_date?: string;
  end_date?: string;
  utc_start_date?: string;
  utc_end_date?: string;
  all_day?: boolean;
  cost?: string;
  image?: TribeImage | false | null;
  categories?: TribeCategory[];
  venue?: TribeVenue | false | null;
  hide_from_listings?: boolean;
  status?: string;
};

type TribeEventsResponse = {
  events?: TribeEvent[];
  next_rest_url?: string | null;
  total?: number;
  total_pages?: number;
};

function htmlToPlainText(value?: string | null) {
  if (!value) {
    return "";
  }

  const $ = cheerio.load(`<div>${value}</div>`);

  return cleanText($("div").text());
}

function parseUtcDate(value?: string | null) {
  if (!value) {
    return null;
  }

  /*
   * Tribe returns UTC timestamps such as:
   * 2026-07-27 11:00:00
   *
   * Add the UTC suffix explicitly so the deployment server's local
   * timezone cannot shift the event.
   */
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");

  const withTimezone =
    /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
      ? normalized
      : `${normalized}Z`;

  const parsed = new Date(withTimezone);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function parseLocalDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value.replace(" ", "T"));

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function parseEventDate(
  utcValue?: string | null,
  localValue?: string | null,
) {
  return (
    parseUtcDate(utcValue) ??
    parseLocalDate(localValue)
  );
}

function isUpcoming(date: Date) {
  const now = new Date();

  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return date >= cutoff;
}

function buildAddress(venue?: TribeVenue | false | null) {
  if (!venue) {
    return null;
  }

  const street = cleanText(venue.address);

  const cityStateZip = [
    cleanText(venue.city),
    cleanText(venue.state ?? venue.province),
    cleanText(venue.zip),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    [street, cityStateZip]
      .filter(Boolean)
      .join(", ") || null
  );
}

function getImageUrl(
  sourceUrl: string,
  image?: TribeImage | false | null,
) {
  if (!image) {
    return null;
  }

  const candidate =
    image.url ??
    image.full?.url ??
    image.sizes?.large?.url ??
    image.sizes?.medium_large?.url;

  return (
    toAbsoluteUrl(sourceUrl, candidate) ??
    null
  );
}

function getCategoryTags(
  categories?: TribeCategory[],
) {
  return Array.from(
    new Set(
      (categories ?? [])
        .map((category) =>
          cleanText(category.name ?? category.slug),
        )
        .filter(Boolean),
    ),
  );
}

function parseCost(cost?: string | null) {
  const cleaned = cleanText(cost);

  if (!cleaned) {
    return {
      cost: null,
      isFree: false,
    };
  }

  const isFree =
    /\bfree\b/i.test(cleaned) ||
    /^\$?0(?:\.00)?$/i.test(cleaned);

  return {
    cost: isFree ? "Free" : cleaned,
    isFree,
  };
}

async function fetchApiPage(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      referer: "https://www.kennesaw-ga.gov/events/",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      [
        `Kennesaw API request failed: ${response.status} ${response.statusText}`,
        `URL: ${url}`,
        responseText
          ? `Response: ${responseText.slice(0, 300)}`
          : null,
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  return response.json() as Promise<TribeEventsResponse>;
}

async function fetchAllKennesawEvents() {
  const events: TribeEvent[] = [];

  let nextUrl: string | null =
    `${KENNESAW_EVENTS_API}?per_page=${PAGE_SIZE}`;

  let pageNumber = 0;
  let reportedTotal: number | null = null;

  while (nextUrl && pageNumber < MAX_PAGES) {
    pageNumber += 1;

    console.log(
      `[KENNESAW] Fetching API page ${pageNumber}`,
    );

    const response = await fetchApiPage(nextUrl);

    if (
      typeof response.total === "number" &&
      reportedTotal === null
    ) {
      reportedTotal = response.total;
    }

    events.push(...(response.events ?? []));

    nextUrl = response.next_rest_url ?? null;
  }

  if (nextUrl) {
    console.warn(
      `[KENNESAW] Stopped after ${MAX_PAGES} pages even though another page was available.`,
    );
  }

  console.log(
    `[KENNESAW] API returned ${events.length} events${
      reportedTotal !== null
        ? ` of ${reportedTotal} reported`
        : ""
    }.`,
  );

  return events;
}

export const kennesawOfficialScraper: SourceScraper = {
  sourceName: "City of Kennesaw events",

  async scrape(source) {
    const apiEvents = await fetchAllKennesawEvents();

    const events: NormalizedScrapedEvent[] = [];

    for (const apiEvent of apiEvents) {
      if (
        apiEvent.status &&
        apiEvent.status !== "publish"
      ) {
        continue;
      }

      if (apiEvent.hide_from_listings) {
        continue;
      }

      const title = cleanText(apiEvent.title);

      if (!title) {
        continue;
      }

      const startDateTime = parseEventDate(
        apiEvent.utc_start_date,
        apiEvent.start_date,
      );

      if (
        !startDateTime ||
        !isUpcoming(startDateTime)
      ) {
        continue;
      }

      const endDateTime = parseEventDate(
        apiEvent.utc_end_date,
        apiEvent.end_date,
      );

      const description =
        htmlToPlainText(
          apiEvent.description ?? apiEvent.excerpt,
        ) || null;

      const venue =
        apiEvent.venue && typeof apiEvent.venue === "object"
          ? apiEvent.venue
          : null;

      const locationName =
        cleanText(venue?.venue) ||
        "City of Kennesaw";

      const address = buildAddress(venue);

      const platformTags =
        getCategoryTags(apiEvent.categories);

      const combinedText = [
        title,
        description,
        locationName,
        address,
        ...platformTags,
      ]
        .filter(Boolean)
        .join(" ");

      const { cost, isFree } =
        parseCost(apiEvent.cost);

      const originalUrl =
        toAbsoluteUrl(source.url, apiEvent.url) ??
        toAbsoluteUrl(source.url, apiEvent.website) ??
        source.url;

      events.push({
        title,
        description,
        startDateTime,
        isAllDay: apiEvent.all_day === true,
        timeZone: "America/New_York",
        endDateTime:
          endDateTime &&
          endDateTime >= startDateTime
            ? endDateTime
            : null,

        locationName,
        address,

        city:
          cleanText(venue?.city) ||
          source.city ||
          "Kennesaw",

        county:
          source.county ||
          "Cobb",

        category:
          inferCategory(combinedText),

        tags: Array.from(
          new Set([
            "city event",
            "official calendar",
            "City of Kennesaw",
            "Tribe Events",
            ...platformTags,
          ]),
        ),

        cost,
        isFree,

        isKidFriendly:
          /kids|children|family|youth|teen|school|storytime/i.test(
            combinedText,
          ),

        isOutdoor:
          /park|outdoor|festival|concert|market|trail|garden|plaza/i.test(
            combinedText,
          ),

        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl,

        imageUrl:
          getImageUrl(
            source.url,
            apiEvent.image,
          ),

        confidenceScore: 0.97,
      });
    }

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
          ? `Parsed ${dedupedEvents.length} upcoming City of Kennesaw events from the official Tribe Events API.`
          : "The Kennesaw API loaded, but no upcoming events were detected.",
    };
  },
};
