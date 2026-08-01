export type SourceHealthStatus =
  | "HEALTHY"
  | "WARNING"
  | "FAILED"
  | "MANUAL"
  | "INACTIVE";

type RecentLog = {
  status: string;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
};

export function assessSourceHealth({
  active,
  lastScrapedAt,
  scrapeFrequency,
  hasAutomatedScraper,
  sourceSection,
  recentLogs,
  publishedContentCount,
  now = new Date(),
}: {
  active: boolean;
  lastScrapedAt: Date | null;
  scrapeFrequency: string | null;
  hasAutomatedScraper: boolean;
  sourceSection: string;
  recentLogs: RecentLog[];
  publishedContentCount: number;
  now?: Date;
}): { status: SourceHealthStatus; warning: string | null } {
  if (!active) return { status: "INACTIVE", warning: null };
  if (!hasAutomatedScraper) return { status: "MANUAL", warning: null };

  const lastLog = recentLogs[0];
  if (!lastScrapedAt || !lastLog) {
    return { status: "WARNING", warning: "This automated source has never completed a scrape." };
  }
  if (lastLog.status === "FAILED") {
    return { status: "FAILED", warning: "The latest scrape failed." };
  }

  const ageMs = now.getTime() - lastScrapedAt.getTime();
  const freq = (scrapeFrequency ?? "").toLowerCase();
  let staleMs = 10 * 24 * 60 * 60 * 1000;
  if (freq.includes("hour")) staleMs = 4 * 60 * 60 * 1000;
  else if (freq.includes("daily") || freq.includes("day")) staleMs = 2 * 24 * 60 * 60 * 1000;
  else if (freq.includes("week")) staleMs = 10 * 24 * 60 * 60 * 1000;
  else if (freq.includes("month")) staleMs = 40 * 24 * 60 * 60 * 1000;

  if (ageMs > staleMs) {
    return { status: "WARNING", warning: "The latest scrape is overdue for this source's schedule." };
  }

  // Alert feeds commonly have no active notices. A zero result from other
  // automated sources is worth reviewing immediately, even if the run itself
  // completed without a network or parsing exception.
  if (sourceSection !== "ALERTS" && lastLog.itemsFound === 0) {
    return { status: "WARNING", warning: "The latest scrape found no items." };
  }

  if (
    sourceSection !== "ALERTS" &&
    lastLog.itemsFound > 0 &&
    lastLog.itemsCreated + lastLog.itemsUpdated > 0 &&
    publishedContentCount === 0
  ) {
    return {
      status: "WARNING",
      warning: "The scraper saved items, but this source has no published content.",
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
