import { prisma } from "../src/lib/prisma";

type CountMap = Record<string, number>;

function increment(counts: CountMap, key: string | null | undefined) {
  const label = key?.trim() || "(missing)";
  counts[label] = (counts[label] ?? 0) + 1;
}

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countDuplicateKeys(keys: string[]) {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  const groups = [...counts.values()].filter((count) => count > 1);
  return {
    groupCount: groups.length,
    redundantRecordCount: groups.reduce((total, count) => total + count - 1, 0),
  };
}

function inspectTags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return { malformed: true, duplicates: false };
    const normalized = parsed
      .map((entry) => normalizeText(String(entry)))
      .filter(Boolean);
    return {
      malformed: false,
      duplicates: new Set(normalized).size !== normalized.length,
    };
  } catch {
    return { malformed: true, duplicates: false };
  }
}

async function main() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [events, meetings, alerts, sources] = await Promise.all([
    prisma.event.findMany({
      select: {
        title: true,
        description: true,
        startDateTime: true,
        endDateTime: true,
        city: true,
        county: true,
        locationName: true,
        sourceName: true,
        status: true,
        dateVerificationStatus: true,
        timeVerificationStatus: true,
        confidenceScore: true,
        tags: true,
        lastSeenAt: true,
      },
    }),
    prisma.meeting.findMany({
      select: {
        startDateTime: true,
        endDateTime: true,
        status: true,
        sourceName: true,
      },
    }),
    prisma.alert.findMany({
      select: {
        status: true,
        severity: true,
        alertType: true,
        sourceName: true,
        startsAt: true,
        expiresAt: true,
      },
    }),
    prisma.source.findMany({
      select: {
        active: true,
        name: true,
        lastScrapedAt: true,
      },
    }),
  ]);

  const eventStatus: CountMap = {};
  const dateVerification: CountMap = {};
  const timeVerification: CountMap = {};
  const eventSource: CountMap = {};
  for (const event of events) {
    increment(eventStatus, event.status);
    increment(dateVerification, event.dateVerificationStatus);
    increment(timeVerification, event.timeVerificationStatus);
    increment(eventSource, event.sourceName);
  }

  const upcomingApproved = events.filter(
    (event) => event.status === "APPROVED" && event.startDateTime >= now,
  );
  const tagInspections = events.map((event) => inspectTags(event.tags));
  const exactDuplicates = countDuplicateKeys(
    upcomingApproved.map((event) =>
      [
        normalizeText(event.title),
        event.startDateTime.toISOString(),
        normalizeText(event.city),
        normalizeText(event.county),
      ].join("|"),
    ),
  );
  const recurringSeries = countDuplicateKeys(
    upcomingApproved.map((event) =>
      [
        normalizeText(event.title),
        normalizeText(event.sourceName),
        normalizeText(event.locationName),
        normalizeText(event.city),
        normalizeText(event.county),
      ].join("|"),
    ),
  );

  const report = {
    generatedAt: now.toISOString(),
    safety: "Read-only aggregate report; no event titles, URLs, addresses, emails, or subscriber data are emitted.",
    totals: {
      events: events.length,
      upcomingApprovedEvents: upcomingApproved.length,
      meetings: meetings.length,
      alerts: alerts.length,
      sources: sources.length,
      activeSources: sources.filter((source) => source.active).length,
    },
    events: {
      byStatus: eventStatus,
      byDateVerificationStatus: dateVerification,
      byTimeVerificationStatus: timeVerification,
      bySource: eventSource,
      invalidOrZeroLengthRanges: events.filter(
        (event) => event.endDateTime && event.endDateTime <= event.startDateTime,
      ).length,
      missingEndTime: events.filter((event) => !event.endDateTime).length,
      invalidConfidence: events.filter(
        (event) =>
          event.confidenceScore !== null &&
          (event.confidenceScore < 0 || event.confidenceScore > 1),
      ).length,
      missingConfidence: events.filter((event) => event.confidenceScore === null).length,
      staleUpcomingApproved: upcomingApproved.filter(
        (event) => event.lastSeenAt < staleBefore,
      ).length,
      malformedTagPayloads: tagInspections.filter((tag) => tag.malformed).length,
      tagPayloadsWithDuplicates: tagInspections.filter((tag) => tag.duplicates).length,
      descriptionsEndingWithoutSentencePunctuation: events.filter((event) => {
        const description = event.description?.trim();
        return Boolean(description && description.length > 80 && !/[.!?…]["')\]]?$/.test(description));
      }).length,
      exactDuplicateCandidates: exactDuplicates,
      recurringSeriesCandidates: recurringSeries,
    },
    meetings: {
      invalidOrZeroLengthRanges: meetings.filter(
        (meeting) => meeting.endDateTime && meeting.endDateTime <= meeting.startDateTime,
      ).length,
      missingEndTime: meetings.filter((meeting) => !meeting.endDateTime).length,
    },
    alerts: {
      active: alerts.filter((alert) => alert.status === "ACTIVE").length,
      activeExpired: alerts.filter(
        (alert) =>
          alert.status === "ACTIVE" && alert.expiresAt && alert.expiresAt < now,
      ).length,
      activeMissingExpiry: alerts.filter(
        (alert) => alert.status === "ACTIVE" && !alert.expiresAt,
      ).length,
    },
    sources: {
      activeNeverScraped: sources.filter(
        (source) => source.active && !source.lastScrapedAt,
      ).length,
      activeStaleSevenDays: sources.filter(
        (source) =>
          source.active &&
          source.lastScrapedAt !== null &&
          source.lastScrapedAt < staleBefore,
      ).length,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
