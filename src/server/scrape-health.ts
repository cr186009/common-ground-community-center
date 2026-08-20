import { scrapeIntervalMs } from "@/server/scrape-schedule";

export type SourceHealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "FAILING"
  | "PAUSED"
  | "RETIRED";

export type RecentScrapeLog = {
  status: string;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  createdAt?: Date;
  message?: string;
};

export type SourceRunMetrics = {
  runs: number;
  successfulRuns: number;
  partialRuns: number;
  failedRuns: number;
  consecutiveFailures: number;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  successRate: number | null;
  lastSuccessfulAt: Date | null;
};

export type SourceFreshnessSlo = {
  expectedIntervalMs: number;
  overdueAfterMs: number;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Operational freshness target for a source. The overdue threshold includes
 * scheduler/incident grace so one late hourly invocation does not page an
 * administrator, while a genuinely stalled source becomes visible quickly.
 */
export function sourceFreshnessSlo(
  scrapeFrequency: string | null | undefined,
): SourceFreshnessSlo {
  const expectedIntervalMs = scrapeIntervalMs(scrapeFrequency);

  const graceMs = expectedIntervalMs <= 6 * HOUR_MS
    ? 3 * HOUR_MS
    : expectedIntervalMs <= DAY_MS
      ? DAY_MS
      : expectedIntervalMs <= 7 * DAY_MS
        ? 3 * DAY_MS
        : 10 * DAY_MS;

  return { expectedIntervalMs, overdueAfterMs: expectedIntervalMs + graceMs };
}

export const RETIRED_SOURCE_NOTE_MARKER = "[retired]";

export function isRetiredSource(notes: string | null | undefined) {
  return (notes ?? "").toLocaleLowerCase("en-US").includes(RETIRED_SOURCE_NOTE_MARKER);
}

export function summarizeSourceRuns(recentLogs: RecentScrapeLog[]): SourceRunMetrics {
  let consecutiveFailures = 0;
  for (const log of recentLogs) {
    if (log.status !== "FAILED") break;
    consecutiveFailures++;
  }

  const itemsFound = recentLogs.reduce((total, log) => total + log.itemsFound, 0);
  const itemsCreated = recentLogs.reduce((total, log) => total + log.itemsCreated, 0);
  const itemsUpdated = recentLogs.reduce((total, log) => total + log.itemsUpdated, 0);
  const successfulRuns = recentLogs.filter((log) => log.status === "SUCCESS").length;

  return {
    runs: recentLogs.length,
    successfulRuns,
    partialRuns: recentLogs.filter((log) => log.status === "PARTIAL").length,
    failedRuns: recentLogs.filter((log) => log.status === "FAILED").length,
    consecutiveFailures,
    itemsFound,
    itemsCreated,
    itemsUpdated,
    itemsUnchanged: Math.max(0, itemsFound - itemsCreated - itemsUpdated),
    successRate: recentLogs.length === 0 ? null : successfulRuns / recentLogs.length,
    lastSuccessfulAt:
      recentLogs.find((log) => log.status === "SUCCESS")?.createdAt ?? null,
  };
}

export function assessSourceHealth({
  active,
  retired = false,
  lastScrapedAt,
  scrapeFrequency,
  hasAutomatedScraper,
  sourceSection,
  recentLogs,
  publishedContentCount,
  now = new Date(),
}: {
  active: boolean;
  retired?: boolean;
  lastScrapedAt: Date | null;
  scrapeFrequency: string | null;
  hasAutomatedScraper: boolean;
  sourceSection: string;
  recentLogs: RecentScrapeLog[];
  publishedContentCount: number;
  now?: Date;
}): {
  status: SourceHealthStatus;
  warning: string | null;
  freshnessDeadline: Date | null;
  overdueByMs: number;
} {
  const noDeadline = { freshnessDeadline: null, overdueByMs: 0 };
  if (retired) return { status: "RETIRED", warning: null, ...noDeadline };
  if (!active) return { status: "PAUSED", warning: null, ...noDeadline };
  if (!hasAutomatedScraper) {
    return {
      status: "DEGRADED",
      warning: "This active source has no registered automated scraper.",
      ...noDeadline,
    };
  }

  const lastLog = recentLogs[0];
  if (!lastScrapedAt || !lastLog) {
    return { status: "DEGRADED", warning: "This automated source has never completed a scrape.", ...noDeadline };
  }
  const { overdueAfterMs } = sourceFreshnessSlo(scrapeFrequency);
  const freshnessDeadline = new Date(lastScrapedAt.getTime() + overdueAfterMs);
  const overdueByMs = Math.max(0, now.getTime() - freshnessDeadline.getTime());
  if (lastLog.status === "FAILED") {
    const failures = recentLogs.findIndex((log) => log.status !== "FAILED");
    const failureCount = failures === -1 ? recentLogs.length : failures;
    return {
      status: "FAILING",
      warning: `${failureCount || 1} consecutive scrape failure${failureCount === 1 ? "" : "s"}. Preview the source, then inspect its latest log before retrying.`,
      freshnessDeadline,
      overdueByMs,
    };
  }

  if (overdueByMs > 0) {
    return { status: "DEGRADED", warning: "The latest scrape is overdue for this source's freshness target. Check the production scheduler and source logs.", freshnessDeadline, overdueByMs };
  }

  if (sourceSection !== "ALERTS" && lastLog.itemsFound === 0) {
    return { status: "DEGRADED", warning: "The latest scrape found no items.", freshnessDeadline, overdueByMs };
  }

  if (
    sourceSection !== "ALERTS" &&
    lastLog.itemsFound > 0 &&
    lastLog.itemsCreated + lastLog.itemsUpdated > 0 &&
    publishedContentCount === 0
  ) {
    return {
      status: "DEGRADED",
      warning: "The scraper saved items, but this source has no published content.",
      freshnessDeadline,
      overdueByMs,
    };
  }

  if (lastLog.status === "PARTIAL") {
    return {
      status: "DEGRADED",
      warning: lastLog.message?.trim() || "The latest scrape completed partially.",
      freshnessDeadline,
      overdueByMs,
    };
  }

  return { status: "HEALTHY", warning: null, freshnessDeadline, overdueByMs };
}

export function finalizeScrapeOutcome({
  sourceSection,
  totalFound,
  failed,
  saved,
  outputStatus,
  outputMessage,
}: {
  sourceSection: string;
  totalFound: number;
  failed: number;
  saved: number;
  outputStatus?: "SUCCESS" | "PARTIAL";
  outputMessage?: string;
}): { status: "SUCCESS" | "PARTIAL" | "FAILED"; message: string } {
  let status: "SUCCESS" | "PARTIAL" | "FAILED" =
    outputStatus === "PARTIAL" ? "PARTIAL" : "SUCCESS";

  if (failed > 0) status = saved > 0 ? "PARTIAL" : "FAILED";

  const zeroResult = sourceSection !== "ALERTS" && totalFound === 0;
  if (zeroResult && status === "SUCCESS") status = "PARTIAL";

  const baseMessage = outputMessage?.trim() || "Scrape completed.";
  const message = zeroResult && !/found no items/i.test(baseMessage)
    ? `${baseMessage} Scraper completed but found no items.`
    : baseMessage;

  return { status, message };
}
