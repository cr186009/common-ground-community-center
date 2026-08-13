import { prisma } from "../src/lib/prisma";
import {
  getSupportedScraperNames,
  normalizeSourceName,
  scrapeSingleSourceById,
} from "../src/server/hub-scrapers";
import { selectDueSources } from "../src/server/scrape-schedule";

const concurrency = 3;

async function main() {
  const now = new Date();
  const registered = new Set(getSupportedScraperNames().map(normalizeSourceName));
  const sources = await prisma.source.findMany({
    where: { active: true },
    include: {
      logs: { orderBy: { createdAt: "desc" }, take: 1 },
      events: {
        where: {
          status: "APPROVED",
          startDateTime: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { startDateTime: "asc" },
        take: 1,
        select: { startDateTime: true },
      },
    },
  });

  const scheduled = sources
    .filter(
      (source) =>
        registered.has(normalizeSourceName(source.name)) &&
        source.type !== "FACEBOOK" &&
        source.type !== "MANUAL",
    )
    .map((source) => ({
      id: source.id,
      name: source.name,
      scrapeFrequency: source.scrapeFrequency,
      // ScrapeLog.createdAt is the authoritative last-attempt timestamp,
      // including failed and zero-result attempts.
      lastAttemptAt: source.logs[0]?.createdAt ?? null,
      nextUpcomingEventAt: source.events[0]?.startDateTime ?? null,
    }));

  const due = selectDueSources(scheduled, now);
  console.info(`[SCRAPER SCHEDULER] ${due.length} of ${scheduled.length} automated sources due.`);

  let failed = false;
  for (let index = 0; index < due.length; index += concurrency) {
    const batch = due.slice(index, index + concurrency);
    const results = await Promise.all(batch.map(async ({ source, schedule }) => {
      console.info(`[SCRAPER SCHEDULER] Running ${source.name}: ${schedule.reason}`);
      return scrapeSingleSourceById(source.id);
    }));
    if (results.some((result) => result.status === "FAILED")) failed = true;
  }

  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Scheduled scrape failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
