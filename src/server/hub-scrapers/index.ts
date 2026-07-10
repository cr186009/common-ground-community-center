import type {
  AlertStatus,
  EventStatus,
  MeetingStatus,
  Source,
  VolunteerStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dallasOfficialScraper } from "@/server/hub-scrapers/sources/dallas-official";
import { createFacebookManualScraper } from "@/server/hub-scrapers/sources/facebook-manual";
import { cedartownDowntownScraper } from "@/server/hub-scrapers/sources/cedartown-downtown";
import { hiramOfficialScraper } from "@/server/hub-scrapers/sources/hiram-official";
import { pauldingCalendarScraper } from "@/server/hub-scrapers/sources/paulding-calendar";
import { rockmartOfficialScraper } from "@/server/hub-scrapers/sources/rockmart-official";
import type {
  NormalizedScrapedAlert,
  NormalizedScrapedEvent,
  NormalizedScrapedMeeting,
  NormalizedVolunteerOpportunity,
  ScrapeOutput,
  SourceScraper,
} from "@/server/hub-scrapers/types";

const manualFacebookSources = [
  "City of Hiram Facebook",
  "City of Dallas Facebook",
  "MyDallasGA Facebook",
  "City of Rockmart Facebook",
  "City of Cedartown Facebook",
  "Paulding County Parks Facebook",
  "Paulding County Sheriff Facebook",
  "Hiram Police Facebook",
  "Dallas Police Facebook",
  "Rockmart Police Facebook",
  "Cedartown Police Facebook",
  "What’s Happening in Dallas, Georgia Facebook",
  "The Hopp Frogg Music Facebook",
  "Pizza Shack Facebook",
  "Cobb County Government Facebook",
  "Cobb PARKS Instagram/manual source",
  "Bartow County Parks and Recreation Facebook",
  "Cherokee Recreation and Parks Facebook",
  "Downtown Woodstock Facebook",
  "Georgia’s Rome Facebook",
  "Explore Canton Facebook",
  "City of Adairsville Facebook",
  "City of Smyrna Instagram/manual source",
  "City of Powder Springs Facebook",
];

const SCRAPER_REGISTRY: Record<string, SourceScraper> = Object.fromEntries(
  [
    pauldingCalendarScraper,
    dallasOfficialScraper,
    hiramOfficialScraper,
    rockmartOfficialScraper,
    cedartownDowntownScraper,
    ...manualFacebookSources.map((name) => createFacebookManualScraper(name)),
  ].map((scraper) => [scraper.sourceName, scraper]),
);

function eventStatusForConfidence(confidence: number | null | undefined, explicit?: EventStatus) {
  if (explicit) {
    return explicit;
  }

  return typeof confidence === "number" && confidence < 0.75 ? "PENDING" : "APPROVED";
}

async function upsertScrapedEvent(source: Source, event: NormalizedScrapedEvent) {
  const existing = await prisma.event.findFirst({
    where: {
      title: event.title,
      startDateTime: event.startDateTime,
      city: event.city,
      sourceName: event.sourceName,
      category: event.category,
    },
  });

  const data = {
    title: event.title,
    description: event.description ?? null,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime ?? null,
    locationName: event.locationName ?? null,
    address: event.address ?? null,
    city: event.city,
    county: event.county,
    category: event.category,
    tags: JSON.stringify(event.tags ?? []),
    cost: event.cost ?? null,
    isFree: event.isFree ?? false,
    isKidFriendly: event.isKidFriendly ?? false,
    isOutdoor: event.isOutdoor ?? false,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    originalUrl: event.originalUrl ?? event.sourceUrl,
    imageUrl: event.imageUrl ?? null,
    status: eventStatusForConfidence(event.confidenceScore, event.status),
    confidenceScore: event.confidenceScore ?? null,
    lastSeenAt: new Date(),
    sourceId: source.id,
  } satisfies Parameters<typeof prisma.event.create>[0]["data"];

  if (existing) {
    await prisma.event.update({ where: { id: existing.id }, data });
    return "updated" as const;
  }

  await prisma.event.create({ data });
  return "created" as const;
}

async function upsertScrapedAlert(source: Source, alert: NormalizedScrapedAlert) {
  const existing = await prisma.alert.findFirst({
    where: {
      title: alert.title,
      startsAt: alert.startsAt ?? null,
      city: alert.city ?? null,
      sourceName: alert.sourceName,
      alertType: alert.alertType,
    },
  });

  const data = {
    title: alert.title,
    description: alert.description ?? null,
    alertType: alert.alertType,
    severity: alert.severity,
    city: alert.city ?? null,
    county: alert.county,
    locationName: alert.locationName ?? null,
    address: alert.address ?? null,
    sourceName: alert.sourceName,
    sourceUrl: alert.sourceUrl,
    originalUrl: alert.originalUrl ?? alert.sourceUrl,
    startsAt: alert.startsAt ?? null,
    expiresAt: alert.expiresAt ?? null,
    status: (alert.status ?? "ACTIVE") as AlertStatus,
    lastSeenAt: new Date(),
    sourceId: source.id,
  } satisfies Parameters<typeof prisma.alert.create>[0]["data"];

  if (existing) {
    await prisma.alert.update({ where: { id: existing.id }, data });
    return "updated" as const;
  }

  await prisma.alert.create({ data });
  return "created" as const;
}

async function upsertScrapedMeeting(source: Source, meeting: NormalizedScrapedMeeting) {
  const existing = await prisma.meeting.findFirst({
    where: {
      title: meeting.title,
      startDateTime: meeting.startDateTime,
      city: meeting.city ?? null,
      sourceName: meeting.sourceName,
      meetingType: meeting.meetingType,
    },
  });

  const data = {
    title: meeting.title,
    governmentBody: meeting.governmentBody,
    meetingType: meeting.meetingType,
    startDateTime: meeting.startDateTime,
    endDateTime: meeting.endDateTime ?? null,
    locationName: meeting.locationName ?? null,
    address: meeting.address ?? null,
    city: meeting.city ?? null,
    county: meeting.county,
    agendaUrl: meeting.agendaUrl ?? null,
    minutesUrl: meeting.minutesUrl ?? null,
    videoUrl: meeting.videoUrl ?? null,
    sourceName: meeting.sourceName,
    sourceUrl: meeting.sourceUrl,
    originalUrl: meeting.originalUrl ?? meeting.sourceUrl,
    status: (meeting.status ?? "UPCOMING") as MeetingStatus,
    summary: meeting.summary ?? null,
    plainEnglishSummary: meeting.plainEnglishSummary ?? null,
    keyTopics: JSON.stringify(meeting.keyTopics ?? []),
    whyResidentsCare: meeting.whyResidentsCare ?? null,
    lastSeenAt: new Date(),
    sourceId: source.id,
  } satisfies Parameters<typeof prisma.meeting.create>[0]["data"];

  if (existing) {
    await prisma.meeting.update({ where: { id: existing.id }, data });
    return "updated" as const;
  }

  await prisma.meeting.create({ data });
  return "created" as const;
}

async function upsertVolunteerOpportunity(source: Source, volunteer: NormalizedVolunteerOpportunity) {
  const existing = await prisma.volunteerOpportunity.findFirst({
    where: {
      title: volunteer.title,
      dateTime: volunteer.dateTime ?? null,
      city: volunteer.city ?? null,
      sourceName: volunteer.sourceName,
      category: volunteer.category,
    },
  });

  const data = {
    title: volunteer.title,
    organization: volunteer.organization,
    description: volunteer.description ?? null,
    dateTime: volunteer.dateTime ?? null,
    locationName: volunteer.locationName ?? null,
    address: volunteer.address ?? null,
    city: volunteer.city ?? null,
    county: volunteer.county,
    category: volunteer.category,
    contactName: volunteer.contactName ?? null,
    contactEmail: volunteer.contactEmail ?? null,
    sourceName: volunteer.sourceName,
    sourceUrl: volunteer.sourceUrl,
    status: (volunteer.status ?? "OPEN") as VolunteerStatus,
    sourceId: source.id,
  } satisfies Parameters<typeof prisma.volunteerOpportunity.create>[0]["data"];

  if (existing) {
    await prisma.volunteerOpportunity.update({ where: { id: existing.id }, data });
    return "updated" as const;
  }

  await prisma.volunteerOpportunity.create({ data });
  return "created" as const;
}

async function recordScrapeLog(source: Source, output: ScrapeOutput, counts: { found: number; created: number; updated: number }) {
  await prisma.scrapeLog.create({
    data: {
      sourceId: source.id,
      sourceName: source.name,
      status: output.status === "PARTIAL" ? "PARTIAL" : "SUCCESS",
      message: output.message ?? "Scrape completed.",
      itemsFound: counts.found,
      itemsCreated: counts.created,
      itemsUpdated: counts.updated,
    },
  });
}

export function getSupportedScraperNames() {
  return Object.keys(SCRAPER_REGISTRY);
}

export async function scrapeSource(source: Source) {
  const scraper = SCRAPER_REGISTRY[source.name];
  if (!scraper) {
    return null;
  }

  try {
    const output = await scraper.scrape(source);
    let created = 0;
    let updated = 0;
    const totalFound =
      (output.events?.length ?? 0) +
      (output.alerts?.length ?? 0) +
      (output.meetings?.length ?? 0) +
      (output.volunteer?.length ?? 0);

    for (const event of output.events ?? []) {
      const result = await upsertScrapedEvent(source, event);
      created += result === "created" ? 1 : 0;
      updated += result === "updated" ? 1 : 0;
    }

    for (const alert of output.alerts ?? []) {
      const result = await upsertScrapedAlert(source, alert);
      created += result === "created" ? 1 : 0;
      updated += result === "updated" ? 1 : 0;
    }

    for (const meeting of output.meetings ?? []) {
      const result = await upsertScrapedMeeting(source, meeting);
      created += result === "created" ? 1 : 0;
      updated += result === "updated" ? 1 : 0;
    }

    for (const volunteer of output.volunteer ?? []) {
      const result = await upsertVolunteerOpportunity(source, volunteer);
      created += result === "created" ? 1 : 0;
      updated += result === "updated" ? 1 : 0;
    }

    await prisma.source.update({
      where: { id: source.id },
      data: { lastScrapedAt: new Date() },
    });

    await recordScrapeLog(source, output, {
      found: totalFound,
      created,
      updated,
    });

    return {
      source: source.name,
      created,
      updated,
      parsed: totalFound,
      status: output.status ?? "SUCCESS",
      message: output.message ?? "Scrape completed.",
    };
  } catch (error) {
    const details = error instanceof Error ? error.stack || error.message : String(error);
    await prisma.scrapeLog.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        status: "FAILED",
        message: "Scrape failed",
        details,
      },
    });

    return {
      source: source.name,
      created: 0,
      updated: 0,
      parsed: 0,
      status: "FAILED" as const,
      error: details,
    };
  }
}

export async function scrapeAllSupportedSources() {
  const sources = await prisma.source.findMany({
    where: {
      active: true,
      name: { in: getSupportedScraperNames() },
    },
    orderBy: { name: "asc" },
  });

  const results = [];
  for (const source of sources) {
    const result = await scrapeSource(source);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

export async function scrapeSingleSourceById(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    throw new Error("Source not found.");
  }

  const result = await scrapeSource(source);
  if (!result) {
    throw new Error("No scraper is registered for that source.");
  }

  return result;
}
