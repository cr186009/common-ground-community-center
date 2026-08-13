import { prisma } from "../src/lib/prisma";
import {
  assessImminence,
  compareAuditPriority,
  needsVerificationReview,
  parseEvidence,
  summarizeVerificationStatuses,
} from "../src/lib/event-verification-audit-report";
import { assessSourceHealth, isRetiredSource, summarizeSourceRuns } from "../src/server/scrape-health";
import { getSupportedScraperNames, normalizeSourceName } from "../src/server/hub-scrapers";

async function main() {
  const now = new Date();
  const registeredScrapers = new Set(getSupportedScraperNames().map(normalizeSourceName));
  const [events, sources, latestSuccessfulLogs] = await Promise.all([
    prisma.event.findMany({
      where: { status: { in: ["APPROVED", "PENDING"] } },
      orderBy: [{ startDateTime: "asc" }, { title: "asc" }],
      select: {
        id: true, title: true, startDateTime: true, endDateTime: true, isAllDay: true,
        timeZone: true, status: true, sourceId: true, sourceName: true, sourceUrl: true,
        originalUrl: true, dateVerificationStatus: true, dateVerificationReason: true,
        dateEvidence: true, dateVerifiedAt: true, timeVerificationStatus: true,
        timeVerificationReason: true, timeEvidence: true, timeVerifiedAt: true,
      },
    }),
    prisma.source.findMany({
      include: {
        logs: { orderBy: { createdAt: "desc" }, take: 20 },
        events: { where: { status: "APPROVED" }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.scrapeLog.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      distinct: ["sourceName"],
      select: { sourceName: true, createdAt: true },
    }),
  ]);

  const latestSuccessBySourceName = new Map(latestSuccessfulLogs.map((log) => [
    normalizeSourceName(log.sourceName),
    log.createdAt,
  ]));

  const sourceReports = sources.map((source) => {
    const runs = summarizeSourceRuns(source.logs);
    const lastAttempt = source.logs[0] ?? null;
    const lastFailure = source.logs.find((log) => log.status === "FAILED") ?? null;
    const health = assessSourceHealth({
      active: source.active,
      retired: isRetiredSource(source.notes),
      lastScrapedAt: source.lastScrapedAt,
      scrapeFrequency: source.scrapeFrequency,
      hasAutomatedScraper: registeredScrapers.has(normalizeSourceName(source.name)),
      sourceSection: source.section,
      recentLogs: source.logs,
      publishedContentCount: source.events.length,
      now,
    });
    return {
      id: source.id,
      name: source.name,
      healthStatus: health.status,
      healthWarning: health.warning,
      lastScrapeAttemptAt: lastAttempt?.createdAt ?? null,
      lastScrapeAttemptStatus: lastAttempt?.status ?? null,
      lastScrapeAttemptMessage: lastAttempt?.message ?? null,
      lastSuccessfulScrapeAt: latestSuccessBySourceName.get(normalizeSourceName(source.name))
        ?? runs.lastSuccessfulAt,
      lastFailureAt: lastFailure?.createdAt ?? null,
      lastFailureMessage: lastFailure?.message ?? null,
      lastFailureDetails: lastFailure?.details ?? null,
      consecutiveFailures: runs.consecutiveFailures,
      recentRuns: { total: runs.runs, success: runs.successfulRuns, partial: runs.partialRuns, failed: runs.failedRuns },
    };
  });
  const sourceById = new Map(sourceReports.map((source) => [source.id, source]));
  const sourceByName = new Map(sourceReports.map((source) => [normalizeSourceName(source.name), source]));

  const assessedEvents = events.map((event) => {
    const source = (event.sourceId ? sourceById.get(event.sourceId) : undefined)
      ?? sourceByName.get(normalizeSourceName(event.sourceName));
    return {
      id: event.id,
      title: event.title,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      isAllDay: event.isAllDay,
      timeZone: event.timeZone,
      publicationStatus: event.status,
      ...assessImminence(event.startDateTime, now),
      dateVerification: {
        status: event.dateVerificationStatus,
        reason: event.dateVerificationReason,
        evidence: parseEvidence(event.dateEvidence),
        verifiedAt: event.dateVerifiedAt,
      },
      timeVerification: {
        status: event.timeVerificationStatus,
        reason: event.timeVerificationReason,
        evidence: parseEvidence(event.timeEvidence),
        verifiedAt: event.timeVerifiedAt,
      },
      source: {
        name: event.sourceName,
        sourceUrl: event.sourceUrl,
        originalUrl: event.originalUrl,
        healthStatus: source?.healthStatus ?? "UNKNOWN",
        healthWarning: source?.healthWarning ?? "No matching source record was found.",
        lastScrapeAttemptAt: source?.lastScrapeAttemptAt ?? null,
        lastScrapeAttemptStatus: source?.lastScrapeAttemptStatus ?? null,
        lastSuccessfulScrapeAt: source?.lastSuccessfulScrapeAt ?? null,
        consecutiveFailures: source?.consecutiveFailures ?? null,
        lastFailureAt: source?.lastFailureAt ?? null,
        lastFailureMessage: source?.lastFailureMessage ?? null,
        lastFailureDetails: source?.lastFailureDetails ?? null,
      },
    };
  });
  const reviewQueue = assessedEvents.filter((event) =>
    needsVerificationReview(event.dateVerification.status)
    || needsVerificationReview(event.timeVerification.status),
  ).sort(compareAuditPriority);

  process.stdout.write(`${JSON.stringify({
    generatedAt: now,
    mode: "read-only",
    totalEvents: assessedEvents.length,
    verificationSummary: summarizeVerificationStatuses(assessedEvents),
    reviewQueueCount: reviewQueue.length,
    reviewQueue,
    sourceHealth: sourceReports,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
