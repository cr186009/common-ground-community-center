import type {
  AlertStatus,
  EventStatus,
  MeetingStatus,
  Source,
  VolunteerStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { cedartownDowntownScraper } from "@/server/hub-scrapers/sources/cedartown-downtown";
import { dallasOfficialScraper } from "@/server/hub-scrapers/sources/dallas-official";
import { createFacebookManualScraper } from "@/server/hub-scrapers/sources/facebook-manual";
import { hiramOfficialScraper } from "@/server/hub-scrapers/sources/hiram-official";
import { pauldingCalendarScraper } from "@/server/hub-scrapers/sources/paulding-calendar";
import { rockmartOfficialScraper } from "@/server/hub-scrapers/sources/rockmart-official";
import { acworthOfficialScraper } from "@/server/hub-scrapers/sources/acworth-official";
import { nwsAlertsScraper } from "@/server/hub-scrapers/sources/nws-alerts";
import type {
  NormalizedScrapedAlert,
  NormalizedScrapedEvent,
  NormalizedScrapedMeeting,
  NormalizedVolunteerOpportunity,
  ScrapeOutput,
  SourceScraper,
} from "@/server/hub-scrapers/types";

/*
 * Scraper configuration
 */
const SCRAPER_TIMEOUT_MS = 30_000;
const SCRAPER_MAX_ATTEMPTS = 2;
const SCRAPER_RETRY_DELAY_MS = 1_500;
const SCRAPER_CONCURRENCY = 3;
const EVENT_APPROVAL_CONFIDENCE = 0.75;
const MAX_LOGGED_ITEMS = 100;

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

type ScrapedItemType = "event" | "alert" | "meeting" | "volunteer";
type ScrapedItemAction = "created" | "updated" | "failed";

type ScrapedItemSummary = {
  type: ScrapedItemType;
  title: string;
  date: string | null;
  city: string | null;
  county: string | null;
  sourceUrl: string | null;
  action: ScrapedItemAction;
  error?: string;
};

type ProcessingCounts = {
  found: number;
  created: number;
  updated: number;
  failed: number;
};

type ScrapeLogStatus = "SUCCESS" | "PARTIAL" | "FAILED";

const registeredScrapers: SourceScraper[] = [
  pauldingCalendarScraper,
  acworthOfficialScraper,
  dallasOfficialScraper,
  hiramOfficialScraper,
  rockmartOfficialScraper,
  cedartownDowntownScraper,
  nwsAlertsScraper,
  ...manualFacebookSources.map((name) =>
    createFacebookManualScraper(name),
  ),
];

function buildScraperRegistry(scrapers: SourceScraper[]) {
  const registry: Record<string, SourceScraper> = {};

  for (const scraper of scrapers) {
    if (registry[scraper.sourceName]) {
      console.warn(
        `[SCRAPER] Duplicate registration detected: ${scraper.sourceName}`,
      );
    }

    registry[scraper.sourceName] = scraper;
  }

  return registry;
}

const SCRAPER_REGISTRY = buildScraperRegistry(registeredScrapers);

function logScraper(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
) {
  const prefix = `[SCRAPER] ${message}`;

  if (level === "error") {
    console.error(prefix, metadata ?? {});
    return;
  }

  if (level === "warn") {
    console.warn(prefix, metadata ?? {});
    return;
  }

  console.info(prefix, metadata ?? {});
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error);
}

function getShortError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function normalizeTitle(title: string) {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidDate(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function toIsoString(value: Date | null | undefined) {
  return isValidDate(value) ? value!.toISOString() : null;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  sourceName: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Scraper timed out after ${milliseconds}ms: ${sourceName}`,
        ),
      );
    }, milliseconds);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function runScraperWithRetry(
  scraper: SourceScraper,
  source: Source,
): Promise<ScrapeOutput> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= SCRAPER_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      logScraper("info", "Scraper attempt started", {
        source: source.name,
        attempt,
        maxAttempts: SCRAPER_MAX_ATTEMPTS,
      });

      return await withTimeout(
        scraper.scrape(source),
        SCRAPER_TIMEOUT_MS,
        source.name,
      );
    } catch (error) {
      lastError = error;

      logScraper("warn", "Scraper attempt failed", {
        source: source.name,
        attempt,
        error: getShortError(error),
      });

      if (attempt < SCRAPER_MAX_ATTEMPTS) {
        await delay(SCRAPER_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

function eventStatusForConfidence(
  confidence: number | null | undefined,
  explicit?: EventStatus,
) {
  if (explicit) {
    return explicit;
  }

  return typeof confidence === "number" &&
    confidence < EVENT_APPROVAL_CONFIDENCE
    ? "PENDING"
    : "APPROVED";
}

function validateEvent(event: NormalizedScrapedEvent) {
  if (!event.title?.trim()) {
    throw new Error("Event is missing a title.");
  }

  if (!isValidDate(event.startDateTime)) {
    throw new Error(`Event "${event.title}" has an invalid start date.`);
  }

  if (
    event.endDateTime &&
    (!isValidDate(event.endDateTime) ||
      event.endDateTime < event.startDateTime)
  ) {
    throw new Error(
      `Event "${event.title}" has an invalid end date.`,
    );
  }

  if (!event.city?.trim()) {
    throw new Error(`Event "${event.title}" is missing a city.`);
  }

  if (!event.county?.trim()) {
    throw new Error(`Event "${event.title}" is missing a county.`);
  }

  if (!event.sourceUrl?.trim()) {
    throw new Error(`Event "${event.title}" is missing a source URL.`);
  }
}

function validateAlert(alert: NormalizedScrapedAlert) {
  if (!alert.title?.trim()) {
    throw new Error("Alert is missing a title.");
  }

  if (!alert.county?.trim()) {
    throw new Error(`Alert "${alert.title}" is missing a county.`);
  }

  if (!alert.sourceUrl?.trim()) {
    throw new Error(`Alert "${alert.title}" is missing a source URL.`);
  }

  if (alert.startsAt && !isValidDate(alert.startsAt)) {
    throw new Error(`Alert "${alert.title}" has an invalid start date.`);
  }

  if (alert.expiresAt && !isValidDate(alert.expiresAt)) {
    throw new Error(
      `Alert "${alert.title}" has an invalid expiration date.`,
    );
  }
}

function validateMeeting(meeting: NormalizedScrapedMeeting) {
  if (!meeting.title?.trim()) {
    throw new Error("Meeting is missing a title.");
  }

  if (!meeting.governmentBody?.trim()) {
    throw new Error(
      `Meeting "${meeting.title}" is missing a government body.`,
    );
  }

  if (!isValidDate(meeting.startDateTime)) {
    throw new Error(
      `Meeting "${meeting.title}" has an invalid start date.`,
    );
  }

  if (
    meeting.endDateTime &&
    (!isValidDate(meeting.endDateTime) ||
      meeting.endDateTime < meeting.startDateTime)
  ) {
    throw new Error(
      `Meeting "${meeting.title}" has an invalid end date.`,
    );
  }

  if (!meeting.county?.trim()) {
    throw new Error(`Meeting "${meeting.title}" is missing a county.`);
  }

  if (!meeting.sourceUrl?.trim()) {
    throw new Error(
      `Meeting "${meeting.title}" is missing a source URL.`,
    );
  }
}

function validateVolunteer(
  volunteer: NormalizedVolunteerOpportunity,
) {
  if (!volunteer.title?.trim()) {
    throw new Error("Volunteer opportunity is missing a title.");
  }

  if (!volunteer.organization?.trim()) {
    throw new Error(
      `Volunteer opportunity "${volunteer.title}" is missing an organization.`,
    );
  }

  if (!volunteer.county?.trim()) {
    throw new Error(
      `Volunteer opportunity "${volunteer.title}" is missing a county.`,
    );
  }

  if (!volunteer.sourceUrl?.trim()) {
    throw new Error(
      `Volunteer opportunity "${volunteer.title}" is missing a source URL.`,
    );
  }

  if (volunteer.dateTime && !isValidDate(volunteer.dateTime)) {
    throw new Error(
      `Volunteer opportunity "${volunteer.title}" has an invalid date.`,
    );
  }
}

async function upsertScrapedEvent(
  source: Source,
  event: NormalizedScrapedEvent,
) {
  validateEvent(event);

  const candidates = await prisma.event.findMany({
    where: {
      startDateTime: event.startDateTime,
      city: event.city,
      sourceName: event.sourceName,
      category: event.category,
    },
    take: 25,
  });

  const normalizedIncomingTitle = normalizeTitle(event.title);
  const existing = candidates.find(
    (candidate) =>
      normalizeTitle(candidate.title) === normalizedIncomingTitle,
  );

  /*
   * Preserve a reviewed status when an existing event has already
   * been approved, rejected, or archived.
   */
  const status =
    existing && existing.status !== "PENDING"
      ? existing.status
      : eventStatusForConfidence(
          event.confidenceScore,
          event.status,
        );

  const data = {
    title: event.title.trim(),
    description:
      event.description ?? existing?.description ?? null,
    startDateTime: event.startDateTime,
    endDateTime:
      event.endDateTime ?? existing?.endDateTime ?? null,
    locationName:
      event.locationName ?? existing?.locationName ?? null,
    address: event.address ?? existing?.address ?? null,
    city: event.city,
    county: event.county,
    category: event.category,
    tags:
      event.tags !== undefined
        ? JSON.stringify(event.tags)
        : existing?.tags ?? "[]",
    cost: event.cost ?? existing?.cost ?? null,
    isFree: event.isFree ?? existing?.isFree ?? false,
    isKidFriendly:
      event.isKidFriendly ?? existing?.isKidFriendly ?? false,
    isOutdoor:
      event.isOutdoor ?? existing?.isOutdoor ?? false,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    originalUrl:
      event.originalUrl ??
      existing?.originalUrl ??
      event.sourceUrl,
    imageUrl: event.imageUrl ?? existing?.imageUrl ?? null,
    status,
    confidenceScore:
      event.confidenceScore ??
      existing?.confidenceScore ??
      null,
    lastSeenAt: new Date(),
    sourceId: source.id,
  } satisfies Parameters<typeof prisma.event.create>[0]["data"];

  if (existing) {
    await prisma.event.update({
      where: { id: existing.id },
      data,
    });

    return "updated" as const;
  }

  await prisma.event.create({ data });
  return "created" as const;
}

async function upsertScrapedAlert(
  source: Source,
  alert: NormalizedScrapedAlert,
) {
  validateAlert(alert);

  const candidates = await prisma.alert.findMany({
    where: {
      startsAt: alert.startsAt ?? null,
      city: alert.city ?? null,
      county: alert.county,
      sourceName: alert.sourceName,
      alertType: alert.alertType,
    },
    take: 25,
  });

  const normalizedIncomingTitle = normalizeTitle(alert.title);
  const existing = candidates.find(
    (candidate) =>
      normalizeTitle(candidate.title) === normalizedIncomingTitle,
  );

  const data = {
    title: alert.title.trim(),
    description:
      alert.description ?? existing?.description ?? null,
    alertType: alert.alertType,
    severity: alert.severity,
    city: alert.city ?? existing?.city ?? null,
    county: alert.county,
    locationName:
      alert.locationName ?? existing?.locationName ?? null,
    address: alert.address ?? existing?.address ?? null,
    sourceName: alert.sourceName,
    sourceUrl: alert.sourceUrl,
    originalUrl:
      alert.originalUrl ??
      existing?.originalUrl ??
      alert.sourceUrl,
    startsAt: alert.startsAt ?? existing?.startsAt ?? null,
    expiresAt: alert.expiresAt ?? existing?.expiresAt ?? null,
    status: (alert.status ??
      existing?.status ??
      "ACTIVE") as AlertStatus,
    lastSeenAt: new Date(),
    sourceId: source.id,
  } satisfies Parameters<typeof prisma.alert.create>[0]["data"];

  if (existing) {
    await prisma.alert.update({
      where: { id: existing.id },
      data,
    });

    return "updated" as const;
  }

  await prisma.alert.create({ data });
  return "created" as const;
}

async function upsertScrapedMeeting(
  source: Source,
  meeting: NormalizedScrapedMeeting,
) {
  validateMeeting(meeting);

  const candidates = await prisma.meeting.findMany({
    where: {
      startDateTime: meeting.startDateTime,
      city: meeting.city ?? null,
      sourceName: meeting.sourceName,
      meetingType: meeting.meetingType,
    },
    take: 25,
  });

  const normalizedIncomingTitle = normalizeTitle(meeting.title);
  const existing = candidates.find(
    (candidate) =>
      normalizeTitle(candidate.title) === normalizedIncomingTitle,
  );

  const data = {
    title: meeting.title.trim(),
    governmentBody: meeting.governmentBody,
    meetingType: meeting.meetingType,
    startDateTime: meeting.startDateTime,
    endDateTime:
      meeting.endDateTime ?? existing?.endDateTime ?? null,
    locationName:
      meeting.locationName ?? existing?.locationName ?? null,
    address: meeting.address ?? existing?.address ?? null,
    city: meeting.city ?? existing?.city ?? null,
    county: meeting.county,
    agendaUrl:
      meeting.agendaUrl ?? existing?.agendaUrl ?? null,
    minutesUrl:
      meeting.minutesUrl ?? existing?.minutesUrl ?? null,
    videoUrl: meeting.videoUrl ?? existing?.videoUrl ?? null,
    sourceName: meeting.sourceName,
    sourceUrl: meeting.sourceUrl,
    originalUrl:
      meeting.originalUrl ??
      existing?.originalUrl ??
      meeting.sourceUrl,
    status: (meeting.status ??
      existing?.status ??
      "UPCOMING") as MeetingStatus,
    summary: meeting.summary ?? existing?.summary ?? null,
    plainEnglishSummary:
      meeting.plainEnglishSummary ??
      existing?.plainEnglishSummary ??
      null,
    keyTopics:
      meeting.keyTopics !== undefined
        ? JSON.stringify(meeting.keyTopics)
        : existing?.keyTopics ?? "[]",
    whyResidentsCare:
      meeting.whyResidentsCare ??
      existing?.whyResidentsCare ??
      null,
    lastSeenAt: new Date(),
    sourceId: source.id,
  } satisfies Parameters<typeof prisma.meeting.create>[0]["data"];

  if (existing) {
    await prisma.meeting.update({
      where: { id: existing.id },
      data,
    });

    return "updated" as const;
  }

  await prisma.meeting.create({ data });
  return "created" as const;
}

async function upsertVolunteerOpportunity(
  source: Source,
  volunteer: NormalizedVolunteerOpportunity,
) {
  validateVolunteer(volunteer);

  const candidates =
    await prisma.volunteerOpportunity.findMany({
      where: {
        dateTime: volunteer.dateTime ?? null,
        city: volunteer.city ?? null,
        sourceName: volunteer.sourceName,
        category: volunteer.category,
      },
      take: 25,
    });

  const normalizedIncomingTitle = normalizeTitle(volunteer.title);
  const existing = candidates.find(
    (candidate) =>
      normalizeTitle(candidate.title) === normalizedIncomingTitle,
  );

  const data = {
    title: volunteer.title.trim(),
    organization: volunteer.organization,
    description:
      volunteer.description ?? existing?.description ?? null,
    dateTime:
      volunteer.dateTime ?? existing?.dateTime ?? null,
    locationName:
      volunteer.locationName ?? existing?.locationName ?? null,
    address: volunteer.address ?? existing?.address ?? null,
    city: volunteer.city ?? existing?.city ?? null,
    county: volunteer.county,
    category: volunteer.category,
    contactName:
      volunteer.contactName ?? existing?.contactName ?? null,
    contactEmail:
      volunteer.contactEmail ?? existing?.contactEmail ?? null,
    sourceName: volunteer.sourceName,
    sourceUrl: volunteer.sourceUrl,
    status: (volunteer.status ??
      existing?.status ??
      "OPEN") as VolunteerStatus,
    sourceId: source.id,
  } satisfies Parameters<
    typeof prisma.volunteerOpportunity.create
  >[0]["data"];

  if (existing) {
    await prisma.volunteerOpportunity.update({
      where: { id: existing.id },
      data,
    });

    return "updated" as const;
  }

  await prisma.volunteerOpportunity.create({ data });
  return "created" as const;
}

async function recordScrapeLog(
  source: Source,
  status: ScrapeLogStatus,
  message: string,
  counts: ProcessingCounts,
  details: Record<string, unknown>,
) {
  await prisma.scrapeLog.create({
    data: {
      sourceId: source.id,
      sourceName: source.name,
      status,
      message,
      details: JSON.stringify(details),
      itemsFound: counts.found,
      itemsCreated: counts.created,
      itemsUpdated: counts.updated,
    },
  });
}

async function safelyRecordScrapeLog(
  source: Source,
  status: ScrapeLogStatus,
  message: string,
  counts: ProcessingCounts,
  details: Record<string, unknown>,
) {
  try {
    await recordScrapeLog(
      source,
      status,
      message,
      counts,
      details,
    );
  } catch (error) {
    logScraper("error", "Unable to save scrape log", {
      source: source.name,
      error: getShortError(error),
    });
  }
}

async function processItem<T>({
  type,
  item,
  title,
  date,
  city,
  county,
  sourceUrl,
  save,
}: {
  type: ScrapedItemType;
  item: T;
  title: string;
  date: Date | null | undefined;
  city: string | null | undefined;
  county: string | null | undefined;
  sourceUrl: string | null | undefined;
  save: (item: T) => Promise<"created" | "updated">;
}): Promise<ScrapedItemSummary> {
  try {
    const action = await save(item);

    logScraper("info", "Item processed", {
      type,
      title,
      action,
    });

    return {
      type,
      title,
      date: toIsoString(date),
      city: city ?? null,
      county: county ?? null,
      sourceUrl: sourceUrl ?? null,
      action,
    };
  } catch (error) {
    const errorMessage = getShortError(error);

    logScraper("error", "Item failed", {
      type,
      title,
      error: errorMessage,
    });

    return {
      type,
      title: title || "Untitled item",
      date: toIsoString(date),
      city: city ?? null,
      county: county ?? null,
      sourceUrl: sourceUrl ?? null,
      action: "failed",
      error: errorMessage,
    };
  }
}

export function getSupportedScraperNames() {
  return Object.keys(SCRAPER_REGISTRY).sort();
}

export async function scrapeSource(source: Source) {
  const scraper = SCRAPER_REGISTRY[source.name];

  if (!scraper) {
    logScraper("warn", "No registered scraper found", {
      source: source.name,
    });

    return null;
  }

  const startedAt = new Date();
  const startedAtMs = Date.now();

  logScraper("info", "Scrape started", {
    source: source.name,
    sourceUrl: source.url,
    startedAt: startedAt.toISOString(),
  });

  try {
    const output = await runScraperWithRetry(scraper, source);

    const events = output.events ?? [];
    const alerts = output.alerts ?? [];
    const meetings = output.meetings ?? [];
    const volunteer = output.volunteer ?? [];

    const totalFound =
      events.length +
      alerts.length +
      meetings.length +
      volunteer.length;

    const itemResults: ScrapedItemSummary[] = [];

    for (const event of events) {
      itemResults.push(
        await processItem({
          type: "event",
          item: event,
          title: event.title,
          date: event.startDateTime,
          city: event.city,
          county: event.county,
          sourceUrl: event.originalUrl ?? event.sourceUrl,
          save: (value) => upsertScrapedEvent(source, value),
        }),
      );
    }

    for (const alert of alerts) {
      itemResults.push(
        await processItem({
          type: "alert",
          item: alert,
          title: alert.title,
          date: alert.startsAt,
          city: alert.city,
          county: alert.county,
          sourceUrl: alert.originalUrl ?? alert.sourceUrl,
          save: (value) => upsertScrapedAlert(source, value),
        }),
      );
    }

    for (const meeting of meetings) {
      itemResults.push(
        await processItem({
          type: "meeting",
          item: meeting,
          title: meeting.title,
          date: meeting.startDateTime,
          city: meeting.city,
          county: meeting.county,
          sourceUrl:
            meeting.originalUrl ?? meeting.sourceUrl,
          save: (value) => upsertScrapedMeeting(source, value),
        }),
      );
    }

    for (const opportunity of volunteer) {
      itemResults.push(
        await processItem({
          type: "volunteer",
          item: opportunity,
          title: opportunity.title,
          date: opportunity.dateTime,
          city: opportunity.city,
          county: opportunity.county,
          sourceUrl: opportunity.sourceUrl,
          save: (value) =>
            upsertVolunteerOpportunity(source, value),
        }),
      );
    }

    const created = itemResults.filter(
      (item) => item.action === "created",
    ).length;

    const updated = itemResults.filter(
      (item) => item.action === "updated",
    ).length;

    const failed = itemResults.filter(
      (item) => item.action === "failed",
    ).length;

    const durationMs = Date.now() - startedAtMs;
    const completedAt = new Date();

    let status: ScrapeLogStatus =
      output.status === "PARTIAL" ? "PARTIAL" : "SUCCESS";

    if (failed > 0) {
      status = created + updated > 0 ? "PARTIAL" : "FAILED";
    }

    const zeroItemsWarning =
      totalFound === 0
        ? " Scraper completed but found no items."
        : "";

    const message =
      output.message ??
      `Scrape completed.${zeroItemsWarning}`;

    const counts: ProcessingCounts = {
      found: totalFound,
      created,
      updated,
      failed,
    };

    const details = {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      outputStatus: output.status ?? "SUCCESS",
      counts: {
        events: events.length,
        alerts: alerts.length,
        meetings: meetings.length,
        volunteer: volunteer.length,
        totalFound,
        created,
        updated,
        failed,
      },
      items: itemResults.slice(0, MAX_LOGGED_ITEMS),
      itemsTruncated:
        itemResults.length > MAX_LOGGED_ITEMS,
    };

    await prisma.source.update({
      where: { id: source.id },
      data: { lastScrapedAt: completedAt },
    });

    await safelyRecordScrapeLog(
      source,
      status,
      message,
      counts,
      details,
    );

    logScraper(
      status === "SUCCESS" ? "info" : "warn",
      "Scrape completed",
      {
        source: source.name,
        status,
        found: totalFound,
        created,
        updated,
        failed,
        durationMs,
      },
    );

    return {
      source: source.name,
      sourceUrl: source.url,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      created,
      updated,
      failed,
      parsed: totalFound,
      status,
      message,
      items: itemResults,
    };
  } catch (error) {
    const completedAt = new Date();
    const durationMs = Date.now() - startedAtMs;
    const details = getErrorDetails(error);

    const counts: ProcessingCounts = {
      found: 0,
      created: 0,
      updated: 0,
      failed: 0,
    };

    await safelyRecordScrapeLog(
      source,
      "FAILED",
      "Scrape failed.",
      counts,
      {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        error: details,
      },
    );

    logScraper("error", "Scrape failed", {
      source: source.name,
      durationMs,
      error: getShortError(error),
    });

    return {
      source: source.name,
      sourceUrl: source.url,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      created: 0,
      updated: 0,
      failed: 0,
      parsed: 0,
      status: "FAILED" as const,
      message: "Scrape failed.",
      error: details,
      items: [] as ScrapedItemSummary[],
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

  logScraper("info", "Starting all supported scrapers", {
    sourceCount: sources.length,
    concurrency: SCRAPER_CONCURRENCY,
  });

  const results: Array<
    NonNullable<Awaited<ReturnType<typeof scrapeSource>>>
  > = [];

  /*
   * Process sources in small concurrent batches so scraping is faster
   * without sending every request simultaneously.
   */
  for (
    let index = 0;
    index < sources.length;
    index += SCRAPER_CONCURRENCY
  ) {
    const batch = sources.slice(
      index,
      index + SCRAPER_CONCURRENCY,
    );

    const batchResults = await Promise.all(
      batch.map((source) => scrapeSource(source)),
    );

    for (const result of batchResults) {
      if (result) {
        results.push(result);
      }
    }
  }

  const summary = {
    sourcesAttempted: sources.length,
    successful: results.filter(
      (result) => result.status === "SUCCESS",
    ).length,
    partial: results.filter(
      (result) => result.status === "PARTIAL",
    ).length,
    failed: results.filter(
      (result) => result.status === "FAILED",
    ).length,
    itemsParsed: results.reduce(
      (total, result) => total + result.parsed,
      0,
    ),
    itemsCreated: results.reduce(
      (total, result) => total + result.created,
      0,
    ),
    itemsUpdated: results.reduce(
      (total, result) => total + result.updated,
      0,
    ),
  };

  logScraper("info", "All supported scrapers completed", summary);

  return results;
}

export async function scrapeSingleSourceById(sourceId: string) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error("Source not found.");
  }

  const result = await scrapeSource(source);

  if (!result) {
    throw new Error(
      `No scraper is registered for source "${source.name}".`,
    );
  }

  return result;
}