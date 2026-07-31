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
