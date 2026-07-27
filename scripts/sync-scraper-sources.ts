import { SourceSection, SourceType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
const managedSources = [
  {
    name: "Paulding County Public Calendar",
    url: "https://www.paulding.gov/calendar.aspx",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Dallas",
    county: "Paulding",
    scrapeFrequency: "DAILY",
    notes: "CivicPlus calendar scraper",
  },
  {
    name: "City of Acworth Events",
    url: "https://www.acworth-ga.gov/events/",
    type: SourceType.GOVERNMENT,
    section: SourceSection.EVENTS,
    city: "Acworth",
    county: "Cobb",
    scrapeFrequency: "DAILY",
    notes: "Dedicated Acworth events scraper",
  },
  {
    name: "City of Hiram Official Events",
    url: "https://www.cityofhiramga.gov/",
    type: SourceType.GOVERNMENT,
    section: SourceSection.EVENTS,
    city: "Hiram",
    county: "Paulding",
    scrapeFrequency: "DAILY",
    notes: "Dedicated Hiram events scraper",
  },
  {
    name: "Downtown Dallas / MyDallasGA",
    url: "https://www.mydallasga.com/eventcalendar",
    type: SourceType.WEBSITE,
    section: SourceSection.EVENTS,
    city: "Dallas",
    county: "Paulding",
    scrapeFrequency: "DAILY",
    notes: "Dedicated MyDallasGA events scraper",
  },

  {
    name: "City of Kennesaw events",
    url: "https://www.kennesaw-ga.gov/events/",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Kennesaw",
    county: "Cobb",
    scrapeFrequency: "DAILY",
    notes:
      "Tier 1 official City of Kennesaw calendar. Platform: WordPress with The Events Calendar / Tribe Events REST API.",
  },
  {
    name: "City of Marietta calendar",
    url: "https://www.mariettaga.gov/calendar.aspx",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Marietta",
    county: "Cobb",
    scrapeFrequency: "DAILY",
    notes:
      "Tier 1 official City of Marietta calendar. Platform: CivicPlus / CivicEngage using category-specific iCalendar feeds.",
  },
];

async function main() {
  console.log(`Synchronizing ${managedSources.length} managed sources...`);

  for (const source of managedSources) {
    const existing = await prisma.source.findUnique({
      where: {
        name: source.name,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.source.update({
        where: {
          id: existing.id,
        },
        data: {
          url: source.url,
          type: source.type,
          section: source.section,
          city: source.city,
          county: source.county,
          scrapeFrequency: source.scrapeFrequency,
          notes: source.notes,
        },
      });

      console.log(`Updated: ${source.name}`);
      continue;
    }

    await prisma.source.create({
      data: {
        ...source,
        active: true,
      },
    });

    console.log(`Created: ${source.name}`);
  }

  console.log("Source synchronization complete.");
}

main()
  .catch((error) => {
    console.error("Source synchronization failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
