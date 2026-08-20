import { cleanPublicText, cleanText, dedupeNormalizedEvents } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

const API_ROOT = "https://cicmsapi.azurewebsites.net/cobb";
const SCHOOLS = [
  { path: "/kennesaw", siteId: 2631, name: "Kennesaw Elementary School", address: "3155 Jiles Road, Kennesaw, GA 30144" },
  { path: "/awtrey", siteId: 4110, name: "Awtrey Middle School", address: "3601 Nowlin Road, Kennesaw, GA 30144" },
  { path: "/kennesawmountain", siteId: 1059, name: "Kennesaw Mountain High School", address: "1898 Kennesaw Due West Road, Kennesaw, GA 30152" },
] as const;

type SchoolEvent = { Title?: string; StartTime?: string; EndTime?: string; StartUtc?: string; EndUtc?: string; Description?: string; Location?: string; Iid?: number; AllDayEvent?: boolean; CategoryGuids?: string; Sb365Json?: string };
type SearchResponse = { Events?: SchoolEvent[] };

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function categoryNames(event: SchoolEvent) {
  try { const parsed = JSON.parse(event.Sb365Json ?? "{}") as { Newsfeedcategories?: Array<{ CategoryName?: string }> }; return (parsed.Newsfeedcategories ?? []).map((item) => cleanText(item.CategoryName)).filter(Boolean); } catch { return []; }
}

async function fetchSchool(school: typeof SCHOOLS[number]) {
  const now = new Date(); const end = new Date(now); end.setUTCFullYear(end.getUTCFullYear() + 1);
  const search = { Keyword: "", Category: "", StartDate: isoDate(now), EndDate: isoDate(end), SelectedChildren: [], SelectedCalendars: [{ Id: "/", Type: "d" }], SchoolClasses: [], ForMonthView: false, NoRecurExpand: false, SiteId: school.siteId, CategoryGuids: [] };
  const body = new URLSearchParams({ ansp: JSON.stringify({ CategoryName: "EventsAdvancedSerach", MethodName: "Search", Parameters: { json: JSON.stringify(search) } }) });
  const response = await fetch(`${API_ROOT}/_ci/15/ci/vsb/webservice.ashx${school.path}`, { method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded;charset=UTF-8", "user-agent": "Common Ground Community Calendar (public-events scraper)" }, body, cache: "no-store" });
  if (!response.ok) throw new Error(`${school.name} calendar request failed: ${response.status} ${response.statusText}`);
  return response.json() as Promise<SearchResponse>;
}

export const cobbSchoolsKennesawScraper: SourceScraper = {
  sourceName: "Cobb Schools — Kennesaw campuses",
  async scrape(source) {
    const events: NormalizedScrapedEvent[] = [];
    for (const school of SCHOOLS) {
      const response = await fetchSchool(school);
      for (const item of response.Events ?? []) {
        const title = cleanText(item.Title); const start = new Date(item.StartUtc ?? item.StartTime ?? "");
        if (!title || Number.isNaN(start.getTime())) continue;
        const end = new Date(item.EndUtc ?? item.EndTime ?? ""); const categories = categoryNames(item);
        const originalUrl = typeof item.Iid === "number" ? `${API_ROOT}/_ci/calendar/ics/${item.Iid}` : `https://www.cobbk12.org${school.path}/calendars`;
        events.push({ title, description: cleanPublicText(item.Description) || null, startDateTime: start, endDateTime: !Number.isNaN(end.getTime()) && end >= start ? end : null,
          isAllDay: item.AllDayEvent === true, timeZone: "America/New_York",
          dateEvidence: { listingDate: (item.StartTime ?? start.toISOString()).slice(0, 10), structuredDate: start.toISOString(), sourcePublishedText: `Official Cobb Schools start: ${item.StartTime ?? item.StartUtc}; end: ${item.EndTime ?? item.EndUtc ?? "not supplied"}; event ID: ${item.Iid ?? "unknown"}` },
          locationName: cleanText(item.Location) || school.name, address: school.address, city: "Kennesaw", county: "Cobb", category: "SCHOOL",
          tags: ["Cobb County School District", school.name, ...categories], isFree: true,
          isKidFriendly: true, isOutdoor: /field|stadium|outdoor|track/i.test(`${item.Location} ${title}`), sourceName: source.name, sourceUrl: source.url, originalUrl, confidenceScore: 0.98 });
      }
    }
    const deduped = dedupeNormalizedEvents(events);
    return { events: deduped, status: "SUCCESS", message: deduped.length ? `Parsed ${deduped.length} official events for the three explicitly allowlisted Kennesaw Cobb Schools campuses.` : "All three official Cobb Schools calendars loaded successfully and currently contain no upcoming events." };
  },
};
