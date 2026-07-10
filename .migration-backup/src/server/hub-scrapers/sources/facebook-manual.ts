import type { SourceScraper } from "@/server/hub-scrapers/types";

export function createFacebookManualScraper(sourceName: string): SourceScraper {
  return {
    sourceName,
    async scrape(source) {
      return {
        events: [],
        status: "PARTIAL",
        message: `${source.name} is tracked as a manual-review social or community source. No automated scrape was attempted.`,
      };
    },
  };
}
