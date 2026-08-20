import { SourceSection, SourceType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
const managedSources = [
  {
    name: "City of Dallas official events page",
    url: "https://www.dallasga.gov/calendar.aspx?view=list&CID=0",
    type: SourceType.GOVERNMENT,
    section: SourceSection.EVENTS,
    city: "Dallas",
    county: "Paulding",
    scrapeFrequency: "DAILY",
    notes: "Official CivicEngage calendar scraper",
  },
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
    name: "City of Hiram official site",
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
    url: "https://www.mydallasga.com/events",
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
    name: "Cobb Schools — Kennesaw campuses",
    url: "https://www.cobbk12.org/kennesaw/calendars",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Kennesaw",
    county: "Cobb",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Cobb Schools API adapter restricted to Kennesaw Elementary, Awtrey Middle, and Kennesaw Mountain High School.",
  },
  {
    name: "Kennesaw State University public events",
    url: "https://calendar.kennesaw.edu/calendar",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Kennesaw",
    county: "Cobb",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Localist API; strict General Public audience and Kennesaw, Georgia physical-location filters.",
  },
  {
    name: "North Cobb Regional Library events",
    url: "https://www.cobbcounty.gov/events?department=85&location=1645",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Kennesaw",
    county: "Cobb",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Cobb County events API filtered exactly to Public Library department 85 and North Cobb Regional Library location 1645.",
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
  {
    name: "City of Rockmart official site",
    url: "https://www.rockmart-ga.gov/CityCalendar.aspx",
    type: SourceType.GOVERNMENT,
    section: SourceSection.EVENTS,
    city: "Rockmart",
    county: "Polk",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Rockmart Mimsware calendar scraper.",
  },
  {
    name: "Visit Woodstock events",
    url: "https://visitwoodstockga.com/events/",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Woodstock",
    county: "Cherokee",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Visit Woodstock calendar API scraper.",
  },
  {
    name: "Explore Canton events",
    url: "https://explorecantonga.com/events/",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Canton",
    county: "Cherokee",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Explore Canton tourism calendar scraper.",
  },
  {
    name: "Cherokee Recreation & Parks events",
    url: "https://playcherokee.org/events/",
    type: SourceType.GOVERNMENT,
    section: SourceSection.EVENTS,
    city: "Canton",
    county: "Cherokee",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Play Cherokee Tribe Events API, restricted to venues whose published city is Canton.",
  },
  {
    name: "Cherokee County Chamber events",
    url: "https://widgets.cherokeechamber.com/feeds/events/event.aspx?cid=94&wid=701",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Canton",
    county: "Cherokee",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Chamber calendar with JSON-LD detail enrichment; restricted to published Canton addresses.",
  },
  {
    name: "Cherokee County School District — Canton coverage",
    url: "https://www.cherokeek12.net/fs/pages/5787",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Canton",
    county: "Cherokee",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official CCSD Finalsite district calendar ID 364; stable occurrence timestamps with school-board meetings routed to Meetings.",
  },
  {
    name: "West Georgia Regional Library events",
    url: "https://wgrls.org/events/",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: null,
    county: "Paulding",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official WGRLS iCalendar feed restricted to Dallas, New Georgia, Hiram–Maude P. Ragsdale, and Crossroads library branches.",
  },
  {
    name: "National Weather Service alerts",
    url: "https://api.weather.gov/alerts/active",
    type: SourceType.GOVERNMENT,
    section: SourceSection.ALERTS,
    city: null,
    county: "Georgia",
    scrapeFrequency: "HOURLY",
    active: true,
    notes: "Official NWS active-alert API, filtered to Cherokee, Cobb, Paulding, Polk, and Bartow counties.",
  },
  {
    name: "Paulding County School District events",
    url: "https://www.paulding.k12.ga.us/",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: "Dallas",
    county: "Paulding",
    scrapeFrequency: "DAILY",
    active: true,
    notes: "Official Finalsite district calendar with stable occurrence timestamps; district events and school-board meetings are routed to their appropriate sections.",
  },
  {
    name: "Polk County Chamber events",
    url: "https://business.polkgeorgia.com/events",
    type: SourceType.CALENDAR,
    section: SourceSection.EVENTS,
    city: null,
    county: "Polk",
    scrapeFrequency: "DAILY",
    notes:
      "Polk County Chamber GrowthZone calendar with detail-page enrichment.",
  },
  {
    name: "Polk County official calendar",
    url: "https://www.polkga.org/calendar.php",
    type: SourceType.GOVERNMENT,
    section: SourceSection.EVENTS,
    city: null,
    county: "Polk",
    scrapeFrequency: "DAILY",
    notes:
      "Official Polk County Revize calendar; routes government meetings separately.",
  },
  {
    name: "Rockmart Cultural Arts Center",
    url: "https://www.rockmart-ga.gov/RCACArtGallery.aspx",
    type: SourceType.GOVERNMENT,
    section: SourceSection.EVENTS,
    city: "Rockmart",
    county: "Polk",
    scrapeFrequency: "DAILY",
    notes:
      "Official RCAC gallery exhibits, receptions, and festival listings.",
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
          ...(source.active === true ? { active: true } : {}),
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
