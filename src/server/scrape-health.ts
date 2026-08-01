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
}): { status: SourceHealthStatus; warning: string | null } {
  if (retired) return { status: "RETIRED", warning: null };
  if (!active) return { status: "PAUSED", warning: null };
  if (!hasAutomatedScraper) {
    return {
      status: "DEGRADED",
      warning: "This active source has no registered automated scraper.",
    };
  }

  const lastLog = recentLogs[0];
  if (!lastScrapedAt || !lastLog) {
    return { status: "DEGRADED", warning: "This automated source has never completed a scrape." };
  }
  if (lastLog.status === "FAILED") {
    return { status: "FAILING", warning: "The latest scrape failed." };
  }

  const ageMs = now.getTime() - lastScrapedAt.getTime();
  const freq = (scrapeFrequency ?? "").toLowerCase();
  let staleMs = 10 * 24 * 60 * 60 * 1000;
  if (freq.includes("hour")) staleMs = 4 * 60 * 60 * 1000;
  else if (freq.includes("daily") || freq.includes("day")) staleMs = 2 * 24 * 60 * 60 * 1000;
  else if (freq.includes("week")) staleMs = 10 * 24 * 60 * 60 * 1000;
  else if (freq.includes("month")) staleMs = 40 * 24 * 60 * 60 * 1000;

  if (ageMs > staleMs) {
    return { status: "DEGRADED", warning: "The latest scrape is overdue for this source's schedule." };
  }

  if (sourceSection !== "ALERTS" && lastLog.itemsFound === 0) {
    return { status: "DEGRADED", warning: "The latest scrape found no items." };
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
    };
  }

  if (lastLog.status === "PARTIAL") {
    return {
      status: "DEGRADED",
      warning: lastLog.message?.trim() || "The latest scrape completed partially.",
    };
  }

  return { status: "HEALTHY", warning: null };
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
