export type ReleaseNote = {
  slug: string;
  version?: string;
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
    slug: "v2-1-local-discovery-and-dependable-listings",
    version: "2.1.0",
    publishedOn: "2026-08-20",
    title: "Local discovery and dependable listings",
    summary:
      "Common Ground 2.1 makes nearby plans easier to find while strengthening schedule confidence, classification safety, freshness monitoring, and production cleanup safeguards.",
    highlights: [
      "Added county-first homepage browsing with a remembered preference, clearer selected-area metrics, intent shortcuts, and a separate Worth the drive section.",
      "Added dedicated List, Calendar, and Map event views, with larger map navigation and visible date and time details on every mapped event.",
      "Clarified the difference between event series and scheduled dates and made missing-event and volunteer submissions easier to start in context.",
      "Corrected Eastern Time and all-day handling, strengthened government-meeting and kid-friendly classification, and introduced a neutral source-listed schedule status.",
      "Kept events visible while they are still in progress and applied consistent end-time handling across Home, Events, Activities, Search, calendar views, and digest previews.",
      "Added per-source refresh targets, overdue deadlines, failure-streak guidance, and a read-only production health check for administrators.",
      "Stopped unrelated scraper activity from making the public event catalog appear current.",
      "Added guarded dry-run cleanup for invalid ranges and exact duplicates, with ambiguous evidence held for review and reminder records preserved.",
      "Extended public expired-alert history from 48 hours to two weeks.",
      "Published clearer sourcing, freshness, privacy, and corrections guidance.",
    ],
  },
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
