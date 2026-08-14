import * as cheerio from "cheerio";

import { cleanText, dedupeNormalizedEvents, fetchSourceHtml } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

export function parsePauldingSchoolsHomepage(
  html: string,
  source: { name: string; url: string },
  now = new Date(),
) {
  const $ = cheerio.load(html);
  const events: NormalizedScrapedEvent[] = [];

  $(".fsCalendar .fsListItems article").each((_, element) => {
    const root = $(element);
    const link = root.find(".fsTitle .fsCalendarEventLink").first();
    const title = cleanText(link.text());
    const occurrenceId = cleanText(link.attr("data-occur-id"));
    const startText = root.find("time.fsStartTime").attr("datetime")
      ?? root.find("time.fsDate").attr("datetime");
    if (!title || !occurrenceId || !startText) return;

    const startDateTime = new Date(startText);
    const endText = root.find("time.fsEndTime").attr("datetime");
    const endDateTime = endText ? new Date(endText) : null;
    if (Number.isNaN(startDateTime.getTime()) || startDateTime < now) return;
    if (endDateTime && Number.isNaN(endDateTime.getTime())) return;

    const locationName = cleanText(root.find(".fsLocation").text()) || null;
    const isAllDay = root.find(".fsAllDay").length > 0;
    events.push({
      title,
      description: locationName ? `${title} is listed on the official Paulding County School District calendar at ${locationName}.` : `${title} is listed on the official Paulding County School District calendar.`,
      startDateTime,
      endDateTime,
      locationName,
      address: locationName === "Central Office" ? "3236 Atlanta Highway" : null,
      city: "Dallas",
      county: "Paulding",
      category: /board meeting/i.test(title) ? "GOVERNMENT_MEETING" : "SCHOOL",
      tags: ["school district", "official calendar"],
      cost: null,
      isFree: true,
      isKidFriendly: !/board meeting/i.test(title),
      isOutdoor: false,
      sourceName: source.name,
      sourceUrl: source.url,
      originalUrl: `${source.url.replace(/\/$/u, "")}#calendar-${encodeURIComponent(occurrenceId)}`,
      confidenceScore: 0.96,
      isAllDay,
      timeZone: "America/New_York",
      dateEvidence: {
        structuredDate: startText,
        sourcePublishedText: cleanText(root.text()),
      },
      meetingDetails: /board meeting/i.test(title) ? {
        governmentBody: "Paulding County Board of Education",
        meetingType: "SCHOOL_BOARD",
      } : undefined,
    });
  });

  return dedupeNormalizedEvents(events);
}

export const pauldingSchoolsScraper: SourceScraper = {
  sourceName: "Paulding County School District events",
  async scrape(source) {
    const events = parsePauldingSchoolsHomepage(await fetchSourceHtml(source.url), source);
    return {
      events,
      status: events.length ? "SUCCESS" : "PARTIAL",
      message: events.length
        ? `Parsed ${events.length} upcoming district calendar item(s).`
        : "The official district homepage loaded but did not expose upcoming calendar records.",
    };
  },
};
