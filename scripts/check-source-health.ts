import { prisma } from "../src/lib/prisma";
import { getAdminSourceHealth } from "../src/server/hub-data";
import { getSupportedScraperNames } from "../src/server/hub-scrapers";

async function main() {
  const sources = await getAdminSourceHealth(getSupportedScraperNames());
  const actionable = sources.filter((source) =>
    source.active && source.hasAutomatedScraper && (
      source.health === "FAILING" || source.overdueByMs > 0 || source.lastAttemptAt === null
    ),
  );

  console.info(JSON.stringify({
    checkedAt: new Date().toISOString(),
    activeAutomatedSources: sources.filter((source) => source.active && source.hasAutomatedScraper).length,
    actionableSources: actionable.map((source) => ({
      name: source.name,
      health: source.health,
      warning: source.healthWarning,
      lastAttemptAt: source.lastAttemptAt?.toISOString() ?? null,
      lastSuccessfulAt: source.lastSuccessfulAt?.toISOString() ?? null,
      freshnessDeadline: source.freshnessDeadline?.toISOString() ?? null,
      overdueByHours: Math.ceil(source.overdueByMs / (60 * 60 * 1000)),
      consecutiveFailures: source.consecutiveFailures,
    })),
  }, null, 2));

  if (actionable.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Source health check failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
