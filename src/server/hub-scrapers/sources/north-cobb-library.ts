import {
  cleanPublicText,
  cleanText,
  dedupeNormalizedEvents,
  inferCategory,
} from "@/server/hub-scrapers/helpers";
import type {
  NormalizedScrapedEvent,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const API_URL = "https://www.cobbcounty.gov/api/search/events";
const DETAIL_ROOT = "https://www.cobbcounty.gov";
const LIBRARY_DEPARTMENT_ID = "85";
const NORTH_COBB_LOCATION_ID = "1645";
const NORTH_COBB_ADDRESS = "3535 Old 41 Highway, Kennesaw, GA 30144";
const MAX_PAGES = 50;

type TaxonomyValue = { name?: string };
type CobbDate = { time?: string; timestamp?: number };
type CobbEvent = {
  id?: string;
  title?: string;
  path?: string;
  summary?: string;
  virtualEvent?: boolean;
  location?: { title?: string };
  eventCategories?: TaxonomyValue[];
  eventAge?: TaxonomyValue[];
  department?: TaxonomyValue[];
  startDate?: CobbDate;
  endDate?: CobbDate;
  hideEndDate?: boolean;
};
type CobbResponse = {
  graphqlEventsSearchWww?: {
    results?: CobbEvent[];
    pageInfo?: { page?: number; pageSize?: number; total?: number };
  };
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchPage(page: number) {
  const now = new Date();
  const through = new Date(now);
  through.setUTCFullYear(through.getUTCFullYear() + 1);
  const query = new URLSearchParams({
    page: String(page),
    search: "",
    fromDate: dateKey(now),
    toDate: dateKey(through),
    department: LIBRARY_DEPARTMENT_ID,
    category: "",
    age: "",
    location: NORTH_COBB_LOCATION_ID,
  });
  const response = await fetch(`${API_URL}?${query}`, {
    headers: {
      accept: "application/json",
      "user-agent": "Common Ground Community Calendar (public-events scraper)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`North Cobb library request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<CobbResponse>;
}

function names(values: TaxonomyValue[] | undefined) {
  return (values ?? []).map((value) => cleanText(value.name)).filter(Boolean);
}

export const northCobbLibraryScraper: SourceScraper = {
  sourceName: "North Cobb Regional Library events",
  async scrape(source) {
    const raw: CobbEvent[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await fetchPage(page);
      const collection = response.graphqlEventsSearchWww;
      if (!collection) throw new Error("North Cobb library response omitted graphqlEventsSearchWww.");
      raw.push(...(collection.results ?? []));
      const pageSize = collection.pageInfo?.pageSize ?? 0;
      const total = collection.pageInfo?.total ?? 0;
      if (!pageSize || (page + 1) * pageSize >= total) break;
      if (page === MAX_PAGES - 1) {
        throw new Error(`North Cobb library exceeded ${MAX_PAGES} pages; refusing a partial import.`);
      }
    }

    const events: NormalizedScrapedEvent[] = [];
    for (const item of raw) {
      const title = cleanText(item.title);
      const start = new Date(item.startDate?.time ?? "");
      const location = cleanText(item.location?.title);
      const departments = names(item.department);
      if (
        !title ||
        Number.isNaN(start.getTime()) ||
        location !== "North Cobb Regional Library" ||
        !departments.includes("Cobb County Public Library")
      ) continue;
      const end = new Date(item.endDate?.time ?? "");
      const categories = names(item.eventCategories);
      const ages = names(item.eventAge);
      const originalUrl = item.path?.startsWith("/")
        ? `${DETAIL_ROOT}${item.path}`
        : source.url;
      events.push({
        title,
        description: cleanPublicText(item.summary) || null,
        startDateTime: start,
        endDateTime: !item.hideEndDate && !Number.isNaN(end.getTime()) && end >= start ? end : null,
        isAllDay: false,
        timeZone: "America/New_York",
        dateEvidence: {
          listingDate: start.toISOString().slice(0, 10),
          structuredDate: start.toISOString(),
          sourcePublishedText: `Official Cobb County event ${item.id ?? "unknown"}: ${item.startDate?.time}${item.endDate?.time ? ` to ${item.endDate.time}` : ""}`,
        },
        locationName: "North Cobb Regional Library",
        address: NORTH_COBB_ADDRESS,
        city: "Kennesaw",
        county: "Cobb",
        category: inferCategory([title, item.summary, ...categories].filter(Boolean).join(" ")),
        tags: ["Cobb County Public Library", "North Cobb Regional Library", ...categories, ...ages],
        isFree: true,
        isKidFriendly: ages.some((age) => /babies|toddler|preschool|elementary|tween|teen/i.test(age)),
        isOutdoor: false,
        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl,
        confidenceScore: 0.99,
      });
    }

    const deduped = dedupeNormalizedEvents(events);
    return {
      events: deduped,
      status: "SUCCESS",
      message: deduped.length
        ? `Parsed ${deduped.length} official North Cobb Regional Library events.`
        : "The official Cobb County endpoint loaded successfully and currently has no upcoming North Cobb Regional Library events.",
    };
  },
};
