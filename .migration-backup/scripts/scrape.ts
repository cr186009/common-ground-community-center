import { scrapeAllSupportedSources } from "../src/server/hub-scrapers";

async function main() {
  const results = await scrapeAllSupportedSources();

  for (const result of results) {
    if ("error" in result && result.error) {
      console.error(`${result.source}: failed`);
      continue;
    }

    console.log(
      `${result.source}: ${result.parsed} parsed, ${result.created} created, ${result.updated} updated (${result.status})`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
