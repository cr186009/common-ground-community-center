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
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

import { ACTIVITY_CATEGORIES } from "@/lib/hub-constants";
import type {
  AlertFilters,
  GlobalSearchFilters,
  MeetingFilters,
  PublicEventFilters,
} from "@/lib/hub-search";
import { prisma } from "@/lib/prisma";
import { buildWeeklyDigestPreview } from "@/services/weekly-digest";

function buildEventWhere(filters: PublicEventFilters, activityOnly = false): Prisma.EventWhereInput {
  const query = filters.query?.trim();
  const dateFrom = filters.dateFrom ?? startOfDay(new Date());

  return {
    status: "APPROVED",
    startDateTime: {
      gte: dateFrom,
      ...(filters.dateTo ? { lte: endOfDay(filters.dateTo) } : {}),
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

function buildAlertWhere(filters: AlertFilters, status?: AlertStatus | AlertStatus[]) {
  const where: Prisma.AlertWhereInput = {
    ...(Array.isArray(status) ? { status: { in: status } } : status ? { status } : {}),
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
    ...(filters.governmentBody ? { governmentBody: filters.governmentBody } : {}),
    ...(filters.meetingType ? { meetingType: filters.meetingType } : {}),
  };
}

export async function expireElapsedAlerts() {
  await prisma.alert.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

export async function getHomepageData() {
  await expireElapsedAlerts();
  const now = new Date();
  const weekendStart = startOfWeek(now, { weekStartsOn: 5 });
  const weekendEnd = endOfWeek(now, { weekStartsOn: 5 });

  const [
    topAlert,
    upcomingEvents,
    weekendEvents,
    freeEvents,
    kidFriendlyEvents,
    upcomingMeetings,
    volunteerOpportunities,
    pendingSubmissions,
    activeSubscriberCount,
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
    prisma.event.findMany({
      where: {
        ...buildEventWhere({ sort: "asc" }),
        startDateTime: { gte: weekendStart, lte: weekendEnd },
      },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),
    prisma.event.findMany({
      where: {
        ...buildEventWhere({ sort: "asc" }),
        OR: [{ isFree: true }, { cost: { contains: "cheap" } }, { cost: { contains: "$5" } }],
      },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),
    prisma.event.findMany({
      where: { ...buildEventWhere({ sort: "asc" }), isKidFriendly: true },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),
    prisma.meeting.findMany({
      where: { status: "UPCOMING", startDateTime: { gte: now } },
      orderBy: { startDateTime: "asc" },
      take: 4,
    }),
    prisma.volunteerOpportunity.findMany({
      where: { status: "OPEN" },
      orderBy: [{ dateTime: "asc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.submittedEvent.count({ where: { status: "PENDING" } }),
    prisma.subscriber.count({ where: { active: true } }),
  ]);

  return {
    activeAlerts: topAlert,
    upcomingEvents,
    weekendEvents,
    freeEvents,
    kidFriendlyEvents,
    upcomingMeetings,
    volunteerOpportunities,
    pendingSubmissions,
    activeSubscriberCount,
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
  const baseDate = monthValue ? new Date(`${monthValue}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);

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

  return { upcomingMeetings, completedMeetings, governmentBodies: governmentBodies.map((item) => item.governmentBody) };
}

export async function getMeetingById(id: string) {
  return prisma.meeting.findUnique({ where: { id } });
}

export async function getVolunteerOpportunities(filters?: { city?: string; county?: string }) {
  return prisma.volunteerOpportunity.findMany({
    where: {
      status: "OPEN",
      ...(filters?.city ? { city: filters.city } : {}),
      ...(filters?.county ? { county: filters.county } : {}),
    },
    orderBy: [{ dateTime: "asc" }, { createdAt: "desc" }],
  });
}

export async function getPublicSources() {
  return prisma.source.findMany({
    orderBy: [{ section: "asc" }, { county: "asc" }, { city: "asc" }, { name: "asc" }],
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

  const sourceFilter = filters.sourceType ? { source: { is: { type: filters.sourceType } } } : {};

  const [events, alerts, meetings, volunteer] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: "APPROVED",
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.county ? { county: filters.county } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.isFree ? { isFree: true } : {}),
        ...(filters.isKidFriendly ? { isKidFriendly: true } : {}),
        ...(dateClause ? { startDateTime: dateClause } : { startDateTime: { gte: startOfDay(new Date()) } }),
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
              OR: [{ title: { contains: query } }, { description: { contains: query } }],
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
      
      orderBy: [
        { section: "asc" },
        { name: "asc" },
      ],
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
      : prisma.subscriber.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.event.findMany({
      where: { status: "APPROVED", startDateTime: { gte: startOfDay(new Date()) } },
      orderBy: { startDateTime: "asc" },
      take: 8,
    }),
    prisma.alert.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ severity: "desc" }, { startsAt: "desc" }],
      take: 5,
    }),
    prisma.meeting.findMany({
      where: { status: "UPCOMING", startDateTime: { gte: startOfDay(new Date()) } },
      orderBy: { startDateTime: "asc" },
      take: 6,
    }),
    prisma.volunteerOpportunity.findMany({
      where: { status: "OPEN" },
      orderBy: [{ dateTime: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  return buildWeeklyDigestPreview({ subscriber, events, alerts, meetings, volunteer });
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

    const failures = logs.filter(
      (log) => log.status === "FAILED"
    ).length;

    const successes = logs.filter(
      (log) => log.status === "SUCCESS"
    ).length;

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

export type SourceHealthStatus = "HEALTHY" | "WARNING" | "FAILED" | "MANUAL" | "INACTIVE";

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
  health: SourceHealthStatus;
  consecutiveFailures: number;
  eventCount: number;
  hasAutomatedScraper: boolean;
  lastLog: {
    status: string;
    message: string;
    itemsFound: number;
    itemsCreated: number;
    itemsUpdated: number;
    createdAt: Date;
  } | null;
};

function computeSourceHealthStatus(
  source: { active: boolean; lastScrapedAt: Date | null; scrapeFrequency: string | null },
  lastLogStatus: string | null,
  recentLogs: Array<{ status: string; itemsFound: number }>,
  hasAutomatedScraper: boolean,
  sourceSection: string,
): SourceHealthStatus {
  if (!source.active) return "INACTIVE";
  if (!hasAutomatedScraper) return "MANUAL";
  if (!source.lastScrapedAt || !lastLogStatus) return "WARNING";
  if (lastLogStatus === "FAILED") return "FAILED";

  const ageMs = Date.now() - source.lastScrapedAt.getTime();
  const freq = (source.scrapeFrequency ?? "").toLowerCase();
  let staleMs = 10 * 24 * 60 * 60 * 1000;
  if (freq.includes("hour")) staleMs = 4 * 60 * 60 * 1000;
  else if (freq.includes("daily") || freq.includes("day")) staleMs = 2 * 24 * 60 * 60 * 1000;
  else if (freq.includes("week")) staleMs = 10 * 24 * 60 * 60 * 1000;
  else if (freq.includes("month")) staleMs = 40 * 24 * 60 * 60 * 1000;

  if (ageMs > staleMs) return "WARNING";

  // Repeated zero-results for event sources (alerts legitimately can return zero)
  if (sourceSection !== "ALERTS" && recentLogs.length >= 3) {
    const recent = recentLogs.slice(0, 3);
    if (recent.every((l) => l.itemsFound === 0 && l.status === "SUCCESS")) {
      return "WARNING";
    }
  }

  return "HEALTHY";
}

export async function getAdminSourceHealth(
  scraperNames: string[] = [],
): Promise<AdminSourceHealth[]> {
  const sources = await prisma.source.findMany({
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
      _count: { select: { events: true } },
    },
    orderBy: [{ section: "asc" }, { name: "asc" }],
  });

  return sources.map((source) => {
    const lastLog = source.logs[0] ?? null;
    const hasAutomatedScraper = scraperNames.includes(source.name);

    let consecutiveFailures = 0;
    for (const log of source.logs) {
      if (log.status === "FAILED") consecutiveFailures++;
      else break;
    }

    const health = computeSourceHealthStatus(
      source,
      lastLog?.status ?? null,
      source.logs,
      hasAutomatedScraper,
      source.section,
    );

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
      health,
      consecutiveFailures,
      eventCount: source._count.events,
      hasAutomatedScraper,
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
): Promise<{ events: AdminEventRow[]; total: number; page: number; totalPages: number }> {
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
    ...(filters.sourceName ? { sourceName: { contains: filters.sourceName } } : {}),
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
      where: { status: "APPROVED", startDateTime: { gte: now }, imageUrl: null },
    }),
    prisma.event.findMany({
      where: { status: "APPROVED", startDateTime: { gte: now }, imageUrl: null },
      select: { id: true, title: true, startDateTime: true, category: true, city: true },
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
      prisma.event.count({ where: { imageUrl: { not: null }, imageIsFallback: false } }),
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
    ...(filters.sourceName ? { sourceName: { contains: filters.sourceName } } : {}),
    ...(filters.status ? { status: filters.status as "SUCCESS" | "PARTIAL" | "FAILED" } : {}),
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

  return { logs, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
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