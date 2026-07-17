import { prisma } from "../src/lib/prisma";
import {
  getSupportedScraperNames,
  scrapeAllSupportedSources,
  scrapeSingleSourceById,
} from "../src/server/hub-scrapers";

async function main() {
  const requestedSource = process.argv.slice(2).join(" ").trim();

  if (!requestedSource) {
    console.log("No source selected.");
    console.log("\nAvailable scraper sources:");

    for (const name of getSupportedScraperNames()) {
      console.log(`- ${name}`);
    }

    console.log(
      '\nRun one with: npm run scrape -- "Exact Source Name"',
    );
    console.log(
      "Run all sources explicitly with: npm run scrape -- --all",
    );

    return;
  }

  if (requestedSource === "--all") {
    const results = await scrapeAllSupportedSources();
    console.dir(results, { depth: null });
    return;
  }

  const source = await prisma.source.findUnique({
    where: { name: requestedSource },
  });

  if (!source) {
    throw new Error(
      `Source "${requestedSource}" was not found in the database.`,
    );
  }

  const result = await scrapeSingleSourceById(source.id);

  console.dir(result, {
    depth: null,
    colors: true,
  });

  if (result.status === "FAILED") {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Scrape command failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });