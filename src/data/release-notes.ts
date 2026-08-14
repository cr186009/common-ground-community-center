export type ReleaseNote = {
  slug: string;
  publishedOn: string;
  title: string;
  summary: string;
  highlights: string[];
};

/**
 * Public, plain-language product updates. Add the newest entry first.
 * `publishedOn` uses YYYY-MM-DD so dates remain easy to sort and review.
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    slug: "modular-community-coverage-profiles",
    publishedOn: "2026-08-14",
    title: "Reusable coverage profiles for more communities",
    summary:
      "Administrators can now compare each community’s coverage plan and see which local information sources are connected, need attention, or are still missing.",
    highlights: [
      "Added coverage profiles for all 13 communities currently supported by Common Ground.",
      "Added a side-scrolling profile library that works with touch, trackpads, arrow buttons, and keyboards.",
      "Grouped each community’s automated calendars and manually reviewed sources into a reusable source bundle.",
      "Made missing coverage areas visible so new community profiles can be prepared and improved before reuse.",
      "Added direct paths for administrators to preview, edit, filter, and review logs for a profile’s sources.",
    ],
  },
  {
    slug: "priority-calendar-production-verification",
    publishedOn: "2026-08-05",
    title: "Priority community calendars verified",
    summary:
      "Rockmart, Woodstock, and Canton calendar connections have been checked against live production records and public listings.",
    highlights: [
      "Restored active daily updates for the Visit Woodstock and Explore Canton calendars.",
      "Confirmed current Woodstock and Canton listings appear on the public events page.",
      "Confirmed Rockmart government calendar items appear in the public meetings section when appropriate.",
      "Added a safeguard that keeps these priority calendar sources active during source synchronization.",
    ],
  },
  {
    slug: "scraper-administration-and-coverage",
    publishedOn: "2026-08-01",
    title: "Clearer calendar source management",
    summary:
      "Administrators can now understand scraper health, inspect incoming records, and safely focus coverage around Paulding County.",
    highlights: [
      "Added clear healthy, degraded, failing, paused, and retired source states with recent-run metrics.",
      "Added dry-run previews that show what a scraper finds without publishing or changing records.",
      "Added reversible source retirement, restoration, and bulk pause controls that preserve history.",
      "Added a configurable 25-mile coverage policy centered in Dallas with a five-mile review buffer.",
      "Added inventory warnings for database sources without code and code scrapers without source records.",
    ],
  },
  {
    slug: "acworth-calendar-time-corrections",
    publishedOn: "2026-08-01",
    title: "Correct Acworth dates and times",
    summary:
      "Acworth calendar listings now preserve local calendar dates and use the city calendar’s published event times.",
    highlights: [
      "Stopped date-only calendar values from shifting to the previous evening during Eastern Time conversion.",
      "Preserved explicit Eastern and UTC timestamps as exact moments in time.",
      "Improved Acworth time extraction for meetings, volunteer workdays, and community events.",
      "Added safeguards so a corrected source record updates its existing listing instead of creating a duplicate.",
    ],
  },
  {
    slug: "expanded-rockmart-and-polk-calendars",
    publishedOn: "2026-08-01",
    title: "More Rockmart and Polk County events",
    summary:
      "We connected more dependable local calendars and improved safeguards for overlapping listings.",
    highlights: [
      "Added events from the Polk County Chamber and the official Polk County calendar.",
      "Added Rockmart Cultural Arts Center exhibits, receptions, and festivals.",
      "Separated county government meetings from general community events.",
      "Improved duplicate protection when multiple calendars publish the same event.",
      "Changed dark-blue buttons to keep clear white text in every interaction state.",
    ],
  },
  {
    slug: "priority-community-calendar-recovery",
    publishedOn: "2026-07-31",
    title: "More local calendars are connected",
    summary:
      "We restored and expanded several priority community calendars so new local events can reach Common Ground more reliably.",
    highlights: [
      "Rebuilt the Rockmart calendar connection for the city’s current website format.",
      "Connected the official Visit Woodstock calendar and its recurring event dates.",
      "Added an Explore Canton calendar connection after the city calendar blocked automated access.",
      "Added source-specific checks for event titles, dates, Eastern Time, and official links.",
    ],
  },
  {
    slug: "mvp-data-quality-and-community-tools",
    publishedOn: "2026-07-31",
    title: "More dependable listings and community tools",
    summary:
      "We completed a broad cleanup before launch so local information is easier to trust, browse, and understand.",
    highlights: [
      "Reviewed active event dates and times and repaired malformed event titles.",
      "Separated public meetings from general events and marked meetings complete after they end.",
      "Added current volunteer opportunities and an archive for past opportunities.",
      "Improved local alert cleanup so expired weather notices do not linger.",
      "Clarified the people and purpose behind Common Ground on the About page.",
    ],
  },
  {
    slug: "calendar-browsing-improvements",
    publishedOn: "2026-07-30",
    title: "A clearer community calendar",
    summary:
      "Events are now easier to scan, especially when an activity repeats or lasts all day.",
    highlights: [
      "Grouped recurring activities instead of showing long rows of nearly identical listings.",
      "Improved all-day and multi-day date display.",
      "Added clearer calendar totals and refreshed event browsing details.",
      "Kept source links visible so residents can confirm details with the original publisher.",
    ],
  },
];
