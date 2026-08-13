import {
  type AlertStatus,
  type Category,
  type EventStatus,
  type SourceSection,
  type SourceType,
  Prisma,
} from "@prisma/client";
import {
  addMonths,
  endOfDay,
  startOfDay,
  subDays,
} from "date-fns";

import { ACTIVITY_CATEGORIES } from "@/lib/hub-constants";
import { classifyCommunityCoverage } from "@/lib/geographic-coverage";
import {
  endOfCommunityDay,
  getCommunityDateKey,
  getCommunityWeekendRange,
  parseCommunityDateTime,
  startOfCommunityDay,
} from "@/lib/hub-date";
import type {
  AlertFilters,
  GlobalSearchFilters,
  MeetingFilters,
  PublicEventFilters,
} from "@/lib/hub-search";
import { prisma } from "@/lib/prisma";
import { completeElapsedMeetings } from "@/server/meetings/lifecycle";
import { buildWeeklyDigestPreview } from "@/services/weekly-digest";
import { expiredAlertArchiveCutoff } from "@/server/alert-lifecycle";
import {
  assessSourceHealth,
  isRetiredSource,
  summarizeSourceRuns,
  type SourceHealthStatus,
} from "@/server/scrape-health";
import {
  auditScraperInventory,
  getInventoryMismatch,
  normalizeInventoryName,
  type ScraperInventoryMismatch,
} from "@/server/scraper-inventory";

export type { SourceHealthStatus } from "@/server/scrape-health";

function buildEventWhere(
  filters: PublicEventFilters,
  activityOnly = false,
): Prisma.EventWhereInput {
  const query = filters.query?.trim();
  const dateFrom = filters.dateFrom ?? startOfCommunityDay();

  return {
    status: "APPROVED",
    dateVerificationStatus: { not: "CONFLICT" },
    timeVerificationStatus: { not: "CONFLICT" },
    startDateTime: {
      gte: dateFrom,
      ...(filters.dateTo ? { lte: endOfCommunityDay(filters.dateTo) } : {}),
    },
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.county ? { county: filters.county } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.isFree ? { isFree: true } : {}),
    ...(filters.isKidFriendly ? { isKidFriendly: true } : {}),
    ...(filters.isOutdoor ? { isOutdoor: true } : {}),
    ...(activityOnly ? { category: { in: ACTIVITY_CATEGORIES } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { locationName: { contains: query } },
            { tags: { contains: query } },
          ],
        }
      : {}),
  };
}

function buildAlertWhere(
  filters: AlertFilters,
  status?: AlertStatus | AlertStatus[],
) {
  const where: Prisma.AlertWhereInput = {
    ...(Array.isArray(status)
      ? { status: { in: status } }
      : status
        ? { status }
        : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.alertType ? { alertType: filters.alertType } : {}),
  };

  if (filters.county) {
    where.OR = [
      { county: filters.county },
      { affectedCounties: { contains: `"${filters.county}"` } },
    ];
  }

  return where;
}

function buildMeetingWhere(filters: MeetingFilters): Prisma.MeetingWhereInput {
  return {
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.county ? { county: filters.county } : {}),
    ...(filters.governmentBody
      ? { governmentBody: filters.governmentBody }
      : {}),
    ...(filters.meetingType ? { meetingType: filters.meetingType } : {}),
  };
}

export async function expireElapsedAlerts() {
  const now = new Date();
  const archiveBefore = expiredAlertArchiveCutoff(now);

  await prisma.alert.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  await prisma.alert.updateMany({
    where: {
      status: "EXPIRED",
      expiresAt: { lt: archiveBefore },
    },
    data: { status: "ARCHIVED" },
  });
}

export async function getHomepageData() {
  await expireElapsedAlerts();

  const now = new Date();
  const { start: weekendStart, end: weekendEnd } = getCommunityWeekendRange(now);

  const [
    topAlert,
    upcomingEvents,
    upcomingEventCount,
    coveredCommunities,
    lastSuccessfulScrape,
    weekendEvents,
    freeEvents,
    kidFriendlyEvents,
    upcomingMeetings,
    volunteerOpportunities,
  ] = await Promise.all([
    prisma.alert.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ severity: "desc" }, { startsAt: "desc" }],
      take: 10,
    }),

    prisma.event.findMany({
      where: buildEventWhere({ sort: "asc" }),
      orderBy: { startDateTime: "asc" },
      take: 6,
    }),

    prisma.event.count({
      where: buildEventWhere({ sort: "asc" }),
    }),

    prisma.event.findMany({
      where: buildEventWhere({ sort: "asc" }),
      select: {
        city: true,
      },
      distinct: ["city"],
    }),

    prisma.scrapeLog.findFirst({
      where: {
        status: "SUCCESS",
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.event.findMany({
      where: {
        ...buildEventWhere({ sort: "asc" }),
        startDateTime: {
          gte: now > weekendStart ? now : weekendStart,
          lte: weekendEnd,
        },
      },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),

    prisma.event.findMany({
      where: {
        ...buildEventWhere({ sort: "asc" }),
        OR: [
          { isFree: true },
          { cost: { contains: "cheap" } },
          { cost: { contains: "$5" } },
        ],
      },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),

    prisma.event.findMany({
      where: {
        ...buildEventWhere({ sort: "asc" }),
        isKidFriendly: true,
      },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),

    prisma.meeting.findMany({
      where: {
        status: "UPCOMING",
        startDateTime: { gte: now },
      },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),

    prisma.volunteerOpportunity.findMany({
      where: {
        status: "OPEN",
        OR: [{ dateTime: null }, { dateTime: { gte: startOfCommunityDay(now) } }],
      },
      orderBy: [{ dateTime: "asc" }, { createdAt: "desc" }],
      take: 4,
    }),
  ]);

  return {
    activeAlerts: topAlert,
    upcomingEvents,
    upcomingEventCount,
    communitiesCovered: coveredCommunities.filter(
      (community) => community.city.trim().length > 0,
    ).length,
    lastUpdatedAt: lastSuccessfulScrape?.createdAt ?? null,
    weekendEvents,
    freeEvents,
    kidFriendlyEvents,
    upcomingMeetings,
    volunteerOpportunities,
  };
}

export async function getEvents(filters: PublicEventFilters) {
  return prisma.event.findMany({
    where: buildEventWhere(filters),
    orderBy: { startDateTime: filters.sort === "desc" ? "desc" : "asc" },
  });
}

export async function getActivities(filters: PublicEventFilters) {
  return prisma.event.findMany({
    where: buildEventWhere(filters, true),
    orderBy: { startDateTime: filters.sort === "desc" ? "desc" : "asc" },
  });
}

export async function getEventsForCalendar(
  filters: PublicEventFilters,
  monthValue?: string,
  activityOnly = false,
) {
  const baseDate = monthValue ? new Date(`${monthValue}-01T12:00:00Z`) : new Date();
  const monthStartKey = monthValue ?? getCommunityDateKey(baseDate).slice(0, 7);
  const [year, month] = monthStartKey.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1, 12));
  const nextMonthKey = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthStart = parseCommunityDateTime(`${monthStartKey}-01T00:00`);
  const monthEnd = new Date(parseCommunityDateTime(`${nextMonthKey}-01T00:00`).getTime() - 1);

  return prisma.event.findMany({
    where: {
      ...buildEventWhere(filters, activityOnly),
      startDateTime: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: { startDateTime: "asc" },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export async function getAlerts(filters: AlertFilters) {
  await expireElapsedAlerts();

  const [activeAlerts, expiredAlerts] = await Promise.all([
    prisma.alert.findMany({
      where: buildAlertWhere(filters, "ACTIVE"),
      orderBy: [{ severity: "desc" }, { startsAt: "desc" }],
    }),
    prisma.alert.findMany({
      where: buildAlertWhere(filters, "EXPIRED"),
      orderBy: { expiresAt: "desc" },
    }),
  ]);

  return { activeAlerts, expiredAlerts };
}

export async function getMeetings(filters: MeetingFilters) {
  await completeElapsedMeetings();
  const now = new Date();
  const [upcomingMeetings, completedMeetings] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        ...buildMeetingWhere(filters),
        status: "UPCOMING",
        startDateTime: { gte: now },
      },
      orderBy: { startDateTime: "asc" },
    }),
    prisma.meeting.findMany({
      where: {
        ...buildMeetingWhere(filters),
        status: "COMPLETED",
      },
      orderBy: { startDateTime: "desc" },
      take: 8,
    }),
  ]);

  const governmentBodies = await prisma.meeting.findMany({
    select: { governmentBody: true },
    distinct: ["governmentBody"],
    orderBy: { governmentBody: "asc" },
  });

  return {
    upcomingMeetings,
    completedMeetings,
    governmentBodies: governmentBodies.map((item) => item.governmentBody),
  };
}

export async function getMeetingById(id: string) {
  return prisma.meeting.findUnique({ where: { id } });
}

export async function getVolunteerOpportunities(filters?: { city?: string; county?: string }) {
  const today = startOfCommunityDay();
  const locationFilters = {
    ...(filters?.city ? { city: filters.city } : {}),
    ...(filters?.county ? { county: filters.county } : {}),
  };
  const [current, past] = await Promise.all([
    prisma.volunteerOpportunity.findMany({
      where: {
        status: "OPEN",
        ...locationFilters,
        OR: [{ dateTime: null }, { dateTime: { gte: today } }],
      },
      orderBy: [{ dateTime: "asc" }, { createdAt: "desc" }],
    }),
    prisma.volunteerOpportunity.findMany({
      where: {
        status: { in: ["OPEN", "ARCHIVED"] },
        ...locationFilters,
        dateTime: { lt: today },
      },
      orderBy: { dateTime: "desc" },
      take: 24,
    }),
  ]);

  return { current, past };
}

export async function getPublicSources() {
  return prisma.source.findMany({
    orderBy: [
      { section: "asc" },
      { county: "asc" },
      { city: "asc" },
      { name: "asc" },
    ],
    include: {
      _count: {
        select: {
          events: true,
          alerts: true,
          meetings: true,
          volunteer: true,
          logs: true,
        },
      },
    },
  });
}

export async function getSearchResults(filters: GlobalSearchFilters) {
  const query = filters.query?.trim();
  const dateClause =
    filters.dateFrom || filters.dateTo
      ? {
          gte: filters.dateFrom ?? startOfDay(new Date()),
          ...(filters.dateTo ? { lte: endOfDay(filters.dateTo) } : {}),
        }
      : undefined;

  const sourceFilter = filters.sourceType
    ? { source: { is: { type: filters.sourceType } } }
    : {};

  const [events, alerts, meetings, volunteer] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: "APPROVED",
        dateVerificationStatus: { not: "CONFLICT" },
        timeVerificationStatus: { not: "CONFLICT" },
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.county ? { county: filters.county } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.isFree ? { isFree: true } : {}),
        ...(filters.isKidFriendly ? { isKidFriendly: true } : {}),
        ...(dateClause
          ? { startDateTime: dateClause }
          : { startDateTime: { gte: startOfDay(new Date()) } }),
        ...sourceFilter,
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
                { tags: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { startDateTime: "asc" },
      take: 12,
    }),
    prisma.alert.findMany({
      where: {
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.county ? { county: filters.county } : {}),
        ...sourceFilter,
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      take: 12,
    }),
    prisma.meeting.findMany({
      where: {
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.county ? { county: filters.county } : {}),
        ...(dateClause ? { startDateTime: dateClause } : {}),
        ...sourceFilter,
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { governmentBody: { contains: query } },
                { plainEnglishSummary: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { startDateTime: "asc" },
      take: 12,
    }),
    prisma.volunteerOpportunity.findMany({
      where: {
        status: "OPEN",
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.county ? { county: filters.county } : {}),
        ...(dateClause ? { dateTime: dateClause } : {}),
        ...sourceFilter,
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { organization: { contains: query } },
                { description: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return { events, alerts, meetings, volunteer };
}

export async function getAdminDashboardData(editEventId?: string | null) {
  const [
    pendingSubmissions,
    recentEvents,
    alerts,
    meetings,
    volunteer,
    logs,
    sources,
    subscribers,
    editEvent,
  ] = await Promise.all([
    prisma.submittedEvent.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),

    prisma.event.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),

    prisma.alert.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),

    prisma.meeting.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),

    prisma.volunteerOpportunity.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),

    prisma.scrapeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
    }),

    // ✅ Only show active sources on the admin dashboard
    prisma.source.findMany({
      orderBy: [{ section: "asc" }, { name: "asc" }],
    }),

    prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    }),

    editEventId
      ? prisma.event.findUnique({
          where: { id: editEventId },
        })
      : Promise.resolve(null),
  ]);

  return {
    pendingSubmissions,
    recentEvents,
    alerts,
    meetings,
    volunteer,
    logs,
    sources,
    subscribers,
    editEvent,
  };
}

export async function getAdminOverviewCounts() {
  const [
    approvedEvents,
    activeAlerts,
    upcomingMeetings,
    openVolunteer,
    pendingSubmissions,
    activeSources,
  ] = await Promise.all([
    prisma.event.count({
      where: {
        status: "APPROVED",
      },
    }),

    prisma.alert.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.meeting.count({
      where: {
        status: "UPCOMING",
      },
    }),

    prisma.volunteerOpportunity.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.submittedEvent.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.source.count({
      where: {
        active: true,
      },
    }),
  ]);

  return {
    approvedEvents,
    activeAlerts,
    upcomingMeetings,
    openVolunteer,
    pendingSubmissions,
    activeSources,
  };
}

export async function getLastUpdatedTimestamp() {
  const latest = await prisma.source.findFirst({
    orderBy: { lastScrapedAt: "desc" },
  });

  return latest?.lastScrapedAt ?? null;
}

export function getUpcomingMonthOptions() {
  return Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(new Date(), index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, date };
  });
}

export async function getEventStatusCounts() {
  const rows = await prisma.event.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return rows.reduce<Record<EventStatus, number>>(
    (accumulator, row) => {
      accumulator[row.status] = row._count._all;
      return accumulator;
    },
    {
      APPROVED: 0,
      ARCHIVED: 0,
      PENDING: 0,
      REJECTED: 0,
    },
  );
}

export async function getDigestPreview(subscriberId?: string | null) {
  const [subscriber, events, alerts, meetings, volunteer] = await Promise.all([
    subscriberId
      ? prisma.subscriber.findUnique({ where: { id: subscriberId } })
      : prisma.subscriber.findFirst({
          where: { active: true },
          orderBy: { createdAt: "asc" },
        }),
    prisma.event.findMany({
      where: {
        status: "APPROVED",
        dateVerificationStatus: { not: "CONFLICT" },
        timeVerificationStatus: { not: "CONFLICT" },
        startDateTime: { gte: startOfDay(new Date()) },
      },
      orderBy: { startDateTime: "asc" },
      take: 8,
    }),
    prisma.alert.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ severity: "desc" }, { startsAt: "desc" }],
      take: 5,
    }),
    prisma.meeting.findMany({
      where: {
        status: "UPCOMING",
        startDateTime: { gte: startOfDay(new Date()) },
      },
      orderBy: { startDateTime: "asc" },
      take: 6,
    }),
    prisma.volunteerOpportunity.findMany({
      where: { status: "OPEN" },
      orderBy: [{ dateTime: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  return buildWeeklyDigestPreview({
    subscriber,
    events,
    alerts,
    meetings,
    volunteer,
  });
}

export async function getSourceHealthData() {
  const sources = await prisma.source.findMany({
    include: {
      logs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      _count: {
        select: {
          events: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return sources.map((source) => {
    const logs = source.logs;

    const lastLog = logs[0];

    const failures = logs.filter((log) => log.status === "FAILED").length;

    const successes = logs.filter((log) => log.status === "SUCCESS").length;

    return {
      id: source.id,
      name: source.name,
      active: source.active,
      lastScrapedAt: source.lastScrapedAt,
      lastStatus: lastLog?.status ?? "NEVER_RUN",
      failures,
      successes,
      eventCount: source._count.events,
    };
  });
}

// -------------------------------------------------------------------------
// Admin extended overview counts
// -------------------------------------------------------------------------

export async function getAdminExtendedCounts() {
  const sevenDaysAgo = subDays(new Date(), 7);

  const [scraperFailures7d, inactiveSources] = await Promise.all([
    prisma.scrapeLog.count({
      where: { status: "FAILED", createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.source.count({ where: { active: false } }),
  ]);

  // These fields require db push to be available at runtime
  let missingUpcomingImages = 0;
  let fallbackImages = 0;
  let sourceImages = 0;

  try {
    [missingUpcomingImages, fallbackImages, sourceImages] = await Promise.all([
      prisma.event.count({
        where: {
          status: "APPROVED",
          startDateTime: { gte: startOfDay(new Date()) },
          imageUrl: null,
        },
      }),
      prisma.event.count({ where: { imageIsFallback: true } }),
      prisma.event.count({
        where: { imageUrl: { not: null }, imageIsFallback: false },
      }),
    ]);
  } catch {
    // New columns not yet in DB — run prisma db push
    missingUpcomingImages = await prisma.event
      .count({
        where: {
          status: "APPROVED",
          startDateTime: { gte: startOfDay(new Date()) },
          imageUrl: null,
        },
      })
      .catch(() => 0);
  }

  return {
    missingUpcomingImages,
    fallbackImages,
    sourceImages,
    scraperFailures7d,
    inactiveSources,
  };
}

// -------------------------------------------------------------------------
// Enhanced source health for admin
// -------------------------------------------------------------------------

export type AdminSourceHealth = {
  id: string;
  name: string;
  active: boolean;
  url: string;
  section: SourceSection;
  type: SourceType;
  city: string | null;
  county: string;
  scrapeFrequency: string | null;
  notes: string | null;
  lastScrapedAt: Date | null;
  /** Timestamp of the latest run regardless of outcome. */
  lastAttemptAt: Date | null;
  /** Timestamp of the latest fully successful run. */
  lastSuccessfulAt: Date | null;
  health: SourceHealthStatus;
  consecutiveFailures: number;
  eventCount: number;
  verifiedEventCount: number;
  verificationRate: number | null;
  ownedRecordCounts: {
    events: number;
    meetings: number;
    alerts: number;
    volunteer: number;
    total: number;
  };
  publishedContentCount: number;
  healthWarning: string | null;
  hasAutomatedScraper: boolean;
  inventoryMismatch: ScraperInventoryMismatch;
  coverage: ReturnType<typeof classifyCommunityCoverage>;
  runMetrics: ReturnType<typeof summarizeSourceRuns>;
  lastLog: {
    status: string;
    message: string;
    itemsFound: number;
    itemsCreated: number;
    itemsUpdated: number;
    createdAt: Date;
  } | null;
};

export async function getAdminSourceHealth(
  scraperNames: string[] = [],
): Promise<AdminSourceHealth[]> {
  const [sources, approvedEvents, eventVerification, scheduledMeetings, activeAlerts, openVolunteer] =
    await Promise.all([
      prisma.source.findMany({
        include: {
          logs: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              status: true,
              message: true,
              itemsFound: true,
              itemsCreated: true,
              itemsUpdated: true,
              createdAt: true,
            },
          },
          _count: { select: { events: true, meetings: true, alerts: true, volunteer: true } },
        },
        orderBy: [{ section: "asc" }, { name: "asc" }],
      }),
      prisma.event.groupBy({
        by: ["sourceId"],
        where: { sourceId: { not: null }, status: "APPROVED" },
        _count: { _all: true },
      }),
      prisma.event.findMany({
        where: { sourceId: { not: null }, status: "APPROVED" },
        select: { sourceId: true, dateVerificationStatus: true, timeVerificationStatus: true },
      }),
      prisma.meeting.groupBy({
        by: ["sourceId"],
        where: { sourceId: { not: null }, status: "UPCOMING" },
        _count: { _all: true },
      }),
      prisma.alert.groupBy({
        by: ["sourceId"],
        where: { sourceId: { not: null }, status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.volunteerOpportunity.groupBy({
        by: ["sourceId"],
        where: { sourceId: { not: null }, status: "OPEN" },
        _count: { _all: true },
      }),
    ]);

  const publishedBySource = new Map<string, number>();
  const addPublishedCounts = (rows: Array<{ sourceId: string | null; count: number }>) => {
    for (const row of rows) {
      if (row.sourceId) {
        publishedBySource.set(
          row.sourceId,
          (publishedBySource.get(row.sourceId) ?? 0) + row.count,
        );
      }
    }
  };
  addPublishedCounts(approvedEvents.map((row) => ({ sourceId: row.sourceId, count: row._count._all })));
  addPublishedCounts(scheduledMeetings.map((row) => ({ sourceId: row.sourceId, count: row._count._all })));
  addPublishedCounts(activeAlerts.map((row) => ({ sourceId: row.sourceId, count: row._count._all })));
  addPublishedCounts(openVolunteer.map((row) => ({ sourceId: row.sourceId, count: row._count._all })));

  const normalizedScraperNames = new Set(scraperNames.map(normalizeInventoryName));
  const verifiedBySource = new Map<string, number>();
  for (const event of eventVerification) {
    if (event.sourceId && event.dateVerificationStatus === "VERIFIED" && event.timeVerificationStatus === "VERIFIED") {
      verifiedBySource.set(event.sourceId, (verifiedBySource.get(event.sourceId) ?? 0) + 1);
    }
  }

  return sources.map((source) => {
    const lastLog = source.logs[0] ?? null;
    const hasAutomatedScraper = normalizedScraperNames.has(normalizeInventoryName(source.name));
    const runMetrics = summarizeSourceRuns(source.logs);

    const publishedContentCount = publishedBySource.get(source.id) ?? 0;
    const approvedEventCount = approvedEvents.find((row) => row.sourceId === source.id)?._count._all ?? 0;
    const verifiedEventCount = verifiedBySource.get(source.id) ?? 0;
    const ownedRecordCounts = {
      events: source._count.events,
      meetings: source._count.meetings,
      alerts: source._count.alerts,
      volunteer: source._count.volunteer,
      total:
        source._count.events +
        source._count.meetings +
        source._count.alerts +
        source._count.volunteer,
    };
    const healthAssessment = assessSourceHealth({
      ...source,
      retired: isRetiredSource(source.notes),
      hasAutomatedScraper,
      sourceSection: source.section,
      recentLogs: source.logs,
      publishedContentCount,
    });

    return {
      id: source.id,
      name: source.name,
      active: source.active,
      url: source.url,
      section: source.section,
      type: source.type,
      city: source.city,
      county: source.county,
      scrapeFrequency: source.scrapeFrequency,
      notes: source.notes,
      lastScrapedAt: source.lastScrapedAt,
      lastAttemptAt: lastLog?.createdAt ?? null,
      lastSuccessfulAt: runMetrics.lastSuccessfulAt,
      health: healthAssessment.status,
      healthWarning: healthAssessment.warning,
      consecutiveFailures: runMetrics.consecutiveFailures,
      eventCount: source._count.events,
      verifiedEventCount,
      verificationRate: approvedEventCount === 0 ? null : verifiedEventCount / approvedEventCount,
      ownedRecordCounts,
      publishedContentCount,
      hasAutomatedScraper,
      inventoryMismatch: getInventoryMismatch(source.name, scraperNames),
      coverage: classifyCommunityCoverage({ city: source.city, county: source.county }),
      runMetrics,
      lastLog: lastLog
        ? {
            status: lastLog.status,
            message: lastLog.message,
            itemsFound: lastLog.itemsFound,
            itemsCreated: lastLog.itemsCreated,
            itemsUpdated: lastLog.itemsUpdated,
            createdAt: lastLog.createdAt,
          }
        : null,
    };
  });
}

/** Includes code-only registrations, which cannot appear in a source-row list. */
export async function getScraperInventoryAudit(scraperNames: string[]) {
  const sources = await prisma.source.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return auditScraperInventory(sources.map((source) => source.name), scraperNames);
}

// -------------------------------------------------------------------------
// Admin event management
// -------------------------------------------------------------------------

export type AdminEventFilters = {
  query?: string;
  sourceName?: string;
  city?: string;
  county?: string;
  category?: string;
  status?: string;
  imgStatus?: string;
  upcoming?: boolean;
  page?: number;
};

export type AdminEventRow = {
  id: string;
  title: string;
  startDateTime: Date;
  isAllDay: boolean;
  city: string;
  county: string;
  category: string;
  status: string;
  sourceName: string;
  originalUrl: string | null;
  imageUrl: string | null;
  imageIsFallback: boolean;
  imageCredit: string | null;
  imageSource: string | null;
  updatedAt: Date;
};

export async function getAdminEventManagement(
  filters: AdminEventFilters = {},
): Promise<{
  events: AdminEventRow[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const PAGE_SIZE = 25;
  const page = Math.max(1, filters.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  // Build image status filter (new columns require try/catch at runtime)
  let imgFilter: Prisma.EventWhereInput = {};
  if (filters.imgStatus === "missing") {
    imgFilter = { imageUrl: null };
  }
  // fallback/real filters are applied post-query when new columns may not exist in DB

  const where: Prisma.EventWhereInput = {
    ...(filters.status ? { status: filters.status as EventStatus } : {}),
    ...(filters.city ? { city: { contains: filters.city } } : {}),
    ...(filters.county ? { county: { contains: filters.county } } : {}),
    ...(filters.category ? { category: filters.category as Category } : {}),
    ...(filters.sourceName
      ? { sourceName: { contains: filters.sourceName } }
      : {}),
    ...(filters.upcoming
      ? { startDateTime: { gte: startOfDay(new Date()) } }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { title: { contains: filters.query } },
            { description: { contains: filters.query } },
          ],
        }
      : {}),
    ...imgFilter,
  };

  // Try to add imageIsFallback filters (new column — may not exist in DB yet)
  let extraWhere: Prisma.EventWhereInput = {};
  if (filters.imgStatus === "fallback") {
    try {
      extraWhere = { imageIsFallback: true };
    } catch {
      // column not yet in DB
    }
  } else if (filters.imgStatus === "real") {
    try {
      extraWhere = { imageUrl: { not: null }, imageIsFallback: false };
    } catch {
      extraWhere = { imageUrl: { not: null } };
    }
  }

  const combinedWhere = { ...where, ...extraWhere };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: combinedWhere,
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        title: true,
        startDateTime: true,
        isAllDay: true,
        city: true,
        county: true,
        category: true,
        status: true,
        sourceName: true,
        originalUrl: true,
        imageUrl: true,
        imageIsFallback: true,
        imageCredit: true,
        imageSource: true,
        updatedAt: true,
      },
    }),
    prisma.event.count({ where: combinedWhere }),
  ]);

  return {
    events,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getAdminDateReviewQueue() {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { dateVerificationStatus: { in: ["CONFLICT", "AMBIGUOUS", "MISSING_EVIDENCE"] } },
        { timeVerificationStatus: { in: ["CONFLICT", "AMBIGUOUS", "MISSING_EVIDENCE"] } },
      ],
    },
    orderBy: [{ startDateTime: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      startDateTime: true,
      timeZone: true,
      sourceName: true,
      originalUrl: true,
      sourceUrl: true,
      sourceId: true,
      dateVerificationStatus: true,
      dateVerificationReason: true,
      dateEvidence: true,
      dateVerifiedAt: true,
      timeVerificationStatus: true,
      timeVerificationReason: true,
      timeEvidence: true,
      timeVerifiedAt: true,
      sourcePublishedText: true,
      lastSeenAt: true,
      updatedAt: true,
      source: {
        select: { lastScrapedAt: true },
      },
    },
  });
  const sourceNames = [...new Set(events.map((event) => event.sourceName))];
  const logs = await prisma.scrapeLog.findMany({
    where: { sourceName: { in: sourceNames } },
    orderBy: { createdAt: "desc" },
    select: { sourceName: true, status: true, createdAt: true },
  });
  return events.map((event) => ({
    ...event,
    lastScrapeAttemptAt: logs.find((log) => log.sourceName === event.sourceName)?.createdAt ?? null,
    lastSuccessfulScrapeAt:
      logs.find((log) => log.sourceName === event.sourceName && log.status === "SUCCESS")?.createdAt ??
      event.source?.lastScrapedAt ??
      null,
  }));
}

// -------------------------------------------------------------------------
// Admin image stats
// -------------------------------------------------------------------------

export type AdminImageDataResult = {
  stats: {
    total: number;
    missingUpcoming: number;
    withFallback: number;
    withSource: number;
  };
  missingUpcomingEvents: Array<{
    id: string;
    title: string;
    startDateTime: Date;
    category: string;
    city: string;
  }>;
  fallbackEvents: Array<{
    id: string;
    title: string;
    startDateTime: Date;
    category: string;
    city: string;
    imageUrl: string | null;
    imageCredit: string | null;
    imageCreditUrl: string | null;
  }>;
};

export async function getAdminImageData(): Promise<AdminImageDataResult> {
  const now = startOfDay(new Date());

  const [total, missingUpcoming, missingUpcomingEvents] = await Promise.all([
    prisma.event.count({ where: { status: "APPROVED" } }),
    prisma.event.count({
      where: {
        status: "APPROVED",
        startDateTime: { gte: now },
        imageUrl: null,
      },
    }),
    prisma.event.findMany({
      where: {
        status: "APPROVED",
        startDateTime: { gte: now },
        imageUrl: null,
      },
      select: {
        id: true,
        title: true,
        startDateTime: true,
        category: true,
        city: true,
      },
      orderBy: { startDateTime: "asc" },
      take: 50,
    }),
  ]);

  // New column queries — graceful fallback before db push
  let withFallback = 0;
  let withSource = 0;
  let fallbackEvents: AdminImageDataResult["fallbackEvents"] = [];

  try {
    [withFallback, withSource, fallbackEvents] = await Promise.all([
      prisma.event.count({ where: { imageIsFallback: true } }),
      prisma.event.count({
        where: { imageUrl: { not: null }, imageIsFallback: false },
      }),
      prisma.event.findMany({
        where: { imageIsFallback: true, status: "APPROVED" },
        select: {
          id: true,
          title: true,
          startDateTime: true,
          category: true,
          city: true,
          imageUrl: true,
          imageCredit: true,
          imageCreditUrl: true,
        },
        orderBy: { startDateTime: "asc" },
        take: 100,
      }),
    ]);
  } catch {
    withSource = await prisma.event
      .count({ where: { imageUrl: { not: null } } })
      .catch(() => 0);
  }

  return {
    stats: { total, missingUpcoming, withFallback, withSource },
    missingUpcomingEvents,
    fallbackEvents,
  };
}

// -------------------------------------------------------------------------
// Admin scrape logs with filters
// -------------------------------------------------------------------------

export type AdminLogFilters = {
  sourceName?: string;
  status?: string;
  zeros?: boolean;
  created?: boolean;
  page?: number;
};

export async function getAdminScrapeLogs(filters: AdminLogFilters = {}) {
  const PAGE_SIZE = 50;
  const page = Math.max(1, filters.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.ScrapeLogWhereInput = {
    ...(filters.sourceName
      ? { sourceName: { contains: filters.sourceName } }
      : {}),
    ...(filters.status
      ? { status: filters.status as "SUCCESS" | "PARTIAL" | "FAILED" }
      : {}),
    ...(filters.zeros ? { itemsFound: 0 } : {}),
    ...(filters.created ? { itemsCreated: { gt: 0 } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.scrapeLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.scrapeLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// -------------------------------------------------------------------------
// Possible duplicate events inspector
// -------------------------------------------------------------------------

export type DuplicateGroup = Array<{
  id: string;
  title: string;
  startDateTime: Date;
  sourceName: string;
  originalUrl: string | null;
  status: string;
  updatedAt: Date;
}>;

export async function getAdminPossibleDuplicates(): Promise<DuplicateGroup[]> {
  const events = await prisma.event.findMany({
    where: {
      status: "APPROVED",
      startDateTime: { gte: startOfDay(new Date()) },
    },
    select: {
      id: true,
      title: true,
      startDateTime: true,
      city: true,
      sourceName: true,
      originalUrl: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { startDateTime: "asc" },
    take: 500,
  });

  const groups = new Map<string, typeof events>();

  for (const event of events) {
    const normalizedTitle = event.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const dateKey = event.startDateTime.toISOString().split("T")[0];
    const cityKey = event.city.toLowerCase().trim();
    const key = `${normalizedTitle}::${dateKey}::${cityKey}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  return Array.from(groups.values())
    .filter((g) => g.length >= 2)
    .slice(0, 30);
}

export async function getAdminExactDuplicateSummary() {
  const { groupExactDuplicateEvents } = await import("@/server/event-deduplication");
  const events = await prisma.event.findMany({
    where: { status: "APPROVED", startDateTime: { gte: new Date() } },
    select: { id: true, title: true, startDateTime: true, city: true, county: true, locationName: true, address: true },
    orderBy: { startDateTime: "asc" },
  });
  const groups = groupExactDuplicateEvents(events);
  return {
    groupCount: groups.length,
    redundantEventCount: groups.reduce((count, group) => count + group.length - 1, 0),
  };
}
