import { load } from "cheerio";
import { fromZonedTime } from "date-fns-tz";

import { cleanText, dedupeNormalizedEvents, fetchSourceHtml } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, ScrapeOutput, SourceScraper } from "@/server/hub-scrapers/types";

const TIME_ZONE = "America/New_York";
const DISTRICT_CALENDAR_ID = "364";
const CANTON_DISTRICT_ADDRESS = "1205 Bluffs Parkway, Canton, GA 30114";

type CherokeeSchoolsSource = { name: string; url: string };

export function parseCherokeeSchoolsCantonCalendar(
  html: string,
  source: CherokeeSchoolsSource,
  now = new Date(),
): Pick<ScrapeOutput, "events"> {
  const $ = load(html);
  const calendar = $(`.fsCalendar[data-calendar-ids="${DISTRICT_CALENDAR_ID}"]`).first();
  if (!calendar.length) {
    throw new Error(`CCSD calendar ${DISTRICT_CALENDAR_ID} was not present in the official page.`);
  }

  const earliest = new Date(now.getTime() - 86_400_000);
  const events: NormalizedScrapedEvent[] = [];

  calendar.find(".fsCalendarDaybox").each((_index, daybox) => {
    const date = $(daybox).find(".fsCalendarDate").first();
    const year = Number(date.attr("data-year"));
    const zeroBasedMonth = Number(date.attr("data-month"));
    const day = Number(date.attr("data-day"));
    if (![year, zeroBasedMonth, day].every(Number.isInteger)) return;

    $(daybox).find(".fsCalendarInfo").each((_eventIndex, info) => {
      const link = $(info).find(".fsCalendarEventLink[data-occur-id]").first();
      const title = cleanText(link.attr("title") || link.text());
      const occurrenceId = cleanText(link.attr("data-occur-id"));
      if (!title || !occurrenceId) return;

      const startValue = $(info).find("time.fsStartTime").attr("datetime");
      const endValue = $(info).find("time.fsEndTime").attr("datetime");
      const isAllDay = $(info).find(".fsAllDayEvent").length > 0;
      const localDate = `${year}-${String(zeroBasedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const start = startValue
        ? new Date(startValue)
        : fromZonedTime(`${localDate}T00:00:00`, TIME_ZONE);
      if (Number.isNaN(start.getTime()) || start < earliest) return;
      const end = endValue ? new Date(endValue) : null;
      const isBoardMeeting = /school board meeting/i.test(title);

      events.push({
        title,
        description: isBoardMeeting
          ? "Official Cherokee County School Board meeting listed by CCSD."
          : "Official Cherokee County School District calendar item relevant to Canton-area schools and families.",
        startDateTime: start,
        endDateTime: end && !Number.isNaN(end.getTime()) && end >= start ? end : null,
        isAllDay,
        timeZone: TIME_ZONE,
        locationName: isBoardMeeting ? "Cherokee County School Board Auditorium" : "Cherokee County School District — Canton coverage",
        address: isBoardMeeting ? CANTON_DISTRICT_ADDRESS : null,
        city: "Canton",
        county: "Cherokee",
        category: isBoardMeeting ? "GOVERNMENT_MEETING" : "SCHOOL",
        tags: ["Cherokee County School District", "Canton schools", isBoardMeeting ? "School Board" : "District calendar"],
        isFree: true,
        isKidFriendly: !isBoardMeeting,
        isOutdoor: false,
        sourceName: source.name,
        sourceUrl: source.url,
        originalUrl: `${source.url}#ccsd-occurrence-${encodeURIComponent(occurrenceId)}`,
        confidenceScore: 0.98,
        dateEvidence: {
          listingDate: localDate,
          structuredDate: startValue || start.toISOString(),
          sourcePublishedText: `Official Finalsite calendar ${DISTRICT_CALENDAR_ID}; occurrence ${occurrenceId}; ${startValue || `${localDate} all day`}${endValue ? ` through ${endValue}` : ""}`,
        },
        meetingDetails: isBoardMeeting ? {
          governmentBody: "Cherokee County School Board",
          meetingType: "SCHOOL_BOARD",
        } : undefined,
      });
    });
  });

  return { events: dedupeNormalizedEvents(events) };
}

export const cherokeeSchoolsCantonScraper: SourceScraper = {
  sourceName: "Cherokee County School District — Canton coverage",
  async scrape(source) {
    const output = parseCherokeeSchoolsCantonCalendar(await fetchSourceHtml(source.url), source);
    const count = output.events?.length ?? 0;
    return {
      ...output,
      status: "SUCCESS",
      message: count
        ? `Parsed ${count} official CCSD district-calendar items for Canton coverage.`
        : "The official CCSD calendar loaded successfully and has no current Canton-relevant district items in its published month.",
    };
  },
};
