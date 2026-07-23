import {
  type AlertStatus,
  type Category,
  type EventStatus,
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
  return {
    ...(Array.isArray(status) ? { status: { in: status } } : status ? { status } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.county ? { county: filters.county } : {}),
    ...(filters.alertType ? { alertType: filters.alertType } : {}),
  } satisfies Prisma.AlertWhereInput;
}

function buildMeetingWhere(filters: MeetingFilters): Prisma.MeetingWhereInput {
  return {
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.county ? { county: filters.county } : {}),
    ...(filters.governmentBody ? { governmentBody: filters.governmentBody } : {}),
    ...(filters.meetingType ? { meetingType: filters.meetingType } : {}),
  };
}

export async function getHomepageData() {
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
    prisma.alert.findFirst({
      where: { status: "ACTIVE" },
      orderBy: [{ severity: "desc" }, { startsAt: "desc" }],
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
    topAlert,
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

prisma.source.findMany({
  orderBy: [
    { section: "asc" },
    { name: "asc" },
  ],
})