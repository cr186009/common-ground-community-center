import { cleanPublicText, cleanText, dedupeNormalizedEvents, inferCategory } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

const API_URL = "https://calendar.kennesaw.edu/api/2/events";
const PAGE_SIZE = 100;
const MAX_PAGES = 25;

type FilterValue = { name?: string };
type LocalistInstance = { event_instance?: { id?: number; start?: string; end?: string; all_day?: boolean } };
type LocalistEvent = {
  id?: number; title?: string; status?: string; private?: boolean; verified?: boolean;
  description?: string; description_text?: string; address?: string; location_name?: string;
  room_number?: string; localist_url?: string; photo_url?: string; free?: boolean;
  ticket_cost?: string; experience?: string; geo?: { city?: string; state?: string; zip?: string; street?: string };
  filters?: Record<string, FilterValue[]>; event_instances?: LocalistInstance[];
};
type LocalistResponse = { events?: Array<{ event?: LocalistEvent }>; page?: { current?: number; total?: number } };

function filterNames(event: LocalistEvent, key: string) {
  return (event.filters?.[key] ?? []).map((value) => cleanText(value.name)).filter(Boolean);
}

function isPublicKennesawEvent(event: LocalistEvent) {
  const audiences = filterNames(event, "event_target_audience");
  return event.private !== true && event.status !== "canceled" &&
    audiences.some((audience) => audience.toLowerCase() === "general public") &&
    cleanText(event.geo?.city).toLowerCase() === "kennesaw" &&
    cleanText(event.geo?.state).toUpperCase() === "GA";
}

async function fetchPage(page: number) {
  const response = await fetch(`${API_URL}?pp=${PAGE_SIZE}&page=${page}&days=365`, {
    headers: { accept: "application/json", "user-agent": "Common Ground Community Calendar (public-events scraper)" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`KSU Localist request failed: ${response.status} ${response.statusText}`);
  return response.json() as Promise<LocalistResponse>;
}

export const ksuLocalistScraper: SourceScraper = {
  sourceName: "Kennesaw State University public events",
  async scrape(source) {
    const raw: LocalistEvent[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await fetchPage(page);
      raw.push(...(response.events ?? []).map((entry) => entry.event).filter((event): event is LocalistEvent => Boolean(event)));
      const total = response.page?.total ?? page;
      if (page >= total) break;
      if (page === MAX_PAGES) throw new Error(`KSU Localist exceeded ${MAX_PAGES} pages; refusing a partial import.`);
    }

    const events: NormalizedScrapedEvent[] = [];
    for (const event of raw.filter(isPublicKennesawEvent)) {
      const title = cleanText(event.title);
      if (!title || !event.localist_url) continue;
      for (const wrapper of event.event_instances ?? []) {
        const instance = wrapper.event_instance;
        const start = instance?.start ? new Date(instance.start) : null;
        if (!start || Number.isNaN(start.getTime())) continue;
        const end = instance?.end ? new Date(instance.end) : null;
        const types = filterNames(event, "event_types");
        const description = cleanPublicText(event.description_text ?? event.description) || null;
        const address = cleanText(event.address) || [cleanText(event.geo?.street), "Kennesaw GA", cleanText(event.geo?.zip)].filter(Boolean).join(", ") || null;
        const location = [cleanText(event.location_name), cleanText(event.room_number)].filter(Boolean).join(" — ") || "Kennesaw State University";
        events.push({
          title, description, startDateTime: start,
          endDateTime: end && !Number.isNaN(end.getTime()) && end >= start ? end : null,
          isAllDay: instance?.all_day === true, timeZone: "America/New_York",
          dateEvidence: { listingDate: start.toISOString().slice(0, 10), structuredDate: start.toISOString(), sourcePublishedText: `Localist occurrence ${instance?.id ?? "unknown"}: ${instance?.start}${instance?.end ? ` to ${instance.end}` : ""}` },
          locationName: location, address, city: "Kennesaw", county: "Cobb",
          category: inferCategory([title, description, ...types].filter(Boolean).join(" ")),
          tags: ["KSU", "Kennesaw Campus", "General Public", ...types],
          cost: cleanText(event.ticket_cost) || null, isFree: event.free === true,
          isKidFriendly: /family|children|kids|youth/i.test([title, description, ...types].join(" ")),
          isOutdoor: /outdoor|field|green|plaza|garden/i.test([title, description, location].join(" ")),
          sourceName: source.name, sourceUrl: source.url, originalUrl: event.localist_url,
          imageUrl: event.photo_url ?? null, confidenceScore: 0.98,
        });
      }
    }
    const deduped = dedupeNormalizedEvents(events);
    return { events: deduped, status: "SUCCESS", message: deduped.length ? `Parsed ${deduped.length} General Public events physically located on KSU's Kennesaw campus.` : "KSU Localist loaded successfully; no current General Public Kennesaw-campus events matched the strict geography and audience filters." };
  },
};
