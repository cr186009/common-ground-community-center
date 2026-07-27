import { pauldingCalendarScraper } from "./sources/paulding-calendar";
import { acworthOfficialScraper } from "./sources/acworth-official";
import { hiramOfficialScraper } from "./sources/hiram-official";
import { dallasOfficialScraper } from "./sources/dallas-official";

export const scraperRegistry = [
  {
    key: "paulding-public-calendar",
    name: "Paulding County Public Calendar",
    url: "https://www.paulding.gov/calendar.aspx",
    county: "Paulding",
    city: "Dallas",
    scraper: pauldingCalendarScraper,
    defaultFrequency: "DAILY",
    enabledByDefault: true,
  },
  {
    key: "acworth-official",
    name: "City of Acworth events",
    url: "https://www.acworth-ga.gov/events/",
    county: "Cobb",
    city: "Acworth",
    scraper: acworthOfficialScraper,
    defaultFrequency: "DAILY",
    enabledByDefault: true,
  },
] as const;