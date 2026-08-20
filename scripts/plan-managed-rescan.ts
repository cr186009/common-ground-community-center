import { prisma } from "../src/lib/prisma";
import { getSupportedScraperNames, normalizeSourceName } from "../src/server/hub-scrapers";

async function main() {
  const registered = new Set(getSupportedScraperNames().map(normalizeSourceName));
  const sources = await prisma.source.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      active: true,
      type: true,
      lastScrapedAt: true,
      _count: { select: { events: true } },
    },
  });

  const managed = sources.filter((source) => registered.has(normalizeSourceName(source.name)));
  const runnable = managed.filter((source) => source.active && source.type !== "FACEBOOK" && source.type !== "MANUAL");
  console.info(JSON.stringify({
    mode: "read-only rescan plan",
    databaseSources: sources.length,
    registeredScrapers: registered.size,
    matchedManagedSources: managed.length,
    runnableManagedSources: runnable.length,
    totalManagedEvents: managed.reduce((sum, source) => sum + source._count.events, 0),
    sources: managed.map((source) => ({
      id: source.id,
      name: source.name,
      active: source.active,
      eventCount: source._count.events,
      lastScrapedAt: source.lastScrapedAt,
    })),
    unmatchedRegisteredNames: getSupportedScraperNames().filter(
      (name) => !sources.some((source) => normalizeSourceName(source.name) === normalizeSourceName(name)),
    ),
  }, null, 2));
  console.info("\nNo scrapers were run and no database records were changed.");
}

main()
  .catch((error) => {
    console.error("Managed rescan plan failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
