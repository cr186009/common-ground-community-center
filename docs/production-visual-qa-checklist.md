# Production visual QA checklist

Use this checklist after deployment against production data. Capture screenshots at each viewport and record the URL, browser, date/time, and pass/fail result.

## Test matrix

Test in current Chrome and Safari. Repeat keyboard checks in Firefox when practical.

- Mobile narrow: **320 × 568**
- Mobile standard: **390 × 844**
- Tablet: **768 × 1024**
- Desktop: **1440 × 900**
- Desktop zoom: **1440 × 900 at 200% browser zoom**

Use at least one production state with active alerts and one without. For Events, test both populated and zero-result filters. If production data cannot produce a state, note it as blocked rather than passing it by inspection.

## Global shell, navigation, and footer

At every viewport:

- [ ] Page has no horizontal scroll, clipped controls, overlapping text, or hidden content.
- [ ] Keyboard focus is clearly visible on links, buttons, form controls, and disclosure controls.
- [ ] Pressing `Tab` from the top reveals **Skip to main content**; activating it moves focus past navigation to the main content.
- [ ] The current route is visually selected in navigation and exposed as the current page to assistive technology.
- [ ] Focus order follows the visual reading order and no focusable element is unreachable.
- [ ] Text remains readable and controls remain usable at 200% zoom.

Desktop (`1440 × 900`):

- [ ] Sticky desktop header shows brand, site search, Submit action, and all primary links.
- [ ] Site search has an accessible name and submits to Search without layout shift.
- [ ] Header does not cover the page heading after navigation or skip-link use.

Mobile (`320 × 568` and `390 × 844`):

- [ ] Compact sticky header shows the full site identity and **More** control.
- [ ] More menu opens without clipping and exposes Meetings, Activities, Volunteer, About, and Updates.
- [ ] Bottom navigation shows Home, Events, Alerts, Search, and Submit with the active item selected.
- [ ] Bottom navigation respects the device safe area and does not cover page or footer content.
- [ ] Footer can be scrolled fully above the fixed bottom navigation; its last link remains visible and tappable.

## Home `/`

Capture top-of-page and full-page screenshots at `390 × 844` and `1440 × 900`.

- [ ] Hero/value proposition appears before non-urgent alerts; urgent High/Emergency alert presentation matches the approved production rule.
- [ ] Hero heading, imagery, gradient, and all three calls to action remain legible at every viewport.
- [ ] Active-alert banner is compact by default and summarizes the highest-priority alert correctly.
- [ ] Expanding alerts reveals each alert, severity/type, shortened description, and source link; the list scrolls on mobile when long.
- [ ] Minimize returns the banner to its compact state and preserves keyboard focus.
- [ ] Upcoming event cards do not repeat identical occurrences; grouped recurring events show a dates count and expandable dates.
- [ ] Event cards never show a precise unverified time beside a contradictory verification warning.
- [ ] Descriptions end cleanly with a usable Details/Read more path; tag overflow is represented by a `+N more` control.
- [ ] Homepage event modules do not repeat the same listing across primary and quick-pick sections.
- [ ] Stats have understandable labels/context and do not imply broader coverage than the underlying data.

## Events list `/events`

Capture default, filtered, and zero-result states at `390 × 844` and `1440 × 900`.

- [ ] Search, City, County, Category, View, and Month have persistent visible labels.
- [ ] Free, Kid-friendly, and Outdoor are grouped under **Quick filters** and have comfortably sized tap targets.
- [ ] Applying filters preserves selected values and updates the matching-result count.
- [ ] List cards align consistently despite different title, tag, verification, and description lengths.
- [ ] Recurring occurrences group under one card without grouping unrelated events.
- [ ] Zero-result message is visible, helpful, and not stranded beneath an oversized empty region.

## Events calendar `/events?view=calendar`

Capture a populated month at `320 × 568`, `390 × 844`, `768 × 1024`, and `1440 × 900`.

- [ ] Mobile uses the approved agenda/compact behavior or provides deliberate horizontal scrolling; seven columns are not crushed into unreadable cells.
- [ ] Weekday headings, dates, and events retain clear visual and accessible relationships.
- [ ] Event titles and times are readable; truncation does not remove the only route to details.
- [ ] `+N more` is interactive and opens or links to the remaining events for that date.
- [ ] Keyboard users can reach events in chronological order without excessive or confusing traversal.
- [ ] Changing month/view keeps visible labels and selected values intact.

## Alerts `/alerts`

Capture active-alert, expired-alert, and no-match states at `390 × 844` and `1440 × 900`.

- [ ] City, County, and Alert type filters have persistent visible labels.
- [ ] Severity, type, title, geography, updated time, and source are visually distinguishable.
- [ ] Alerts are ordered by the explicit severity policy, then recency; Emergency/High items are never buried below lower severity.
- [ ] Long descriptions wrap without overflow or raw bulletin walls dominating the viewport.
- [ ] Source links open safely and their labels accurately distinguish official sources from original listings.
- [ ] Active and expired sections remain clearly separated; empty states are explicit.

## Event detail `/events/[id]`

Test one verified event, one unverified event, and one recurring/grouped event at `390 × 844` and `1440 × 900`.

- [ ] Title, image/credit, date/time, location, cost, description, and source form a clear reading hierarchy.
- [ ] Verified events do not show a generic confirmation warning.
- [ ] Unverified events avoid false precision and clearly identify which field needs confirmation.
- [ ] Source, calendar, share, interest, and reminder actions have visible keyboard focus and usable tap targets.
- [ ] Form inputs have accessible names; errors/success messages are understandable and focus is managed after submission.
- [ ] Long URLs, venue names, and descriptions wrap without horizontal overflow.

## About `/about`

Capture full-page screenshots at `390 × 844` and `1440 × 900`.

- [ ] Nonpartisan purpose, ownership, sourcing approach, freshness definitions, correction path, and privacy/data-use links are easy to find.
- [ ] Claims about verification and official sources match actual site behavior.
- [ ] Three-card content collapses into a logical single-column reading order on mobile.
- [ ] Footer policy language is user-facing and consistent with the About page.

## Keyboard and accessibility completion pass

Run on Home, Events list/calendar, Alerts, one event detail, and About:

- [ ] Complete all navigation, filtering, alert expansion, calendar access, and form actions using keyboard only.
- [ ] No keyboard trap occurs in the More menu, alert banner, recurring dates, or forms.
- [ ] Native headings and landmarks provide a logical outline: one page `h1`, ordered section headings, named navigation regions, and a main landmark.
- [ ] Form controls have programmatic names; placeholder text is never the only label.
- [ ] Icon-only graphics are hidden from assistive technology or have an accurate accessible name.
- [ ] Status is not communicated by color alone; selected, severity, verification, success, and error states include text/semantics.
- [ ] Run automated accessibility checks (axe or equivalent) with no critical or serious violations; manually document any accepted exception.

## Sign-off record

- Build/commit:
- Production URL:
- Tested by:
- Date:
- Browsers/devices:
- Blocked states:
- Defects filed:
- Final result: Pass / Pass with known issues / Fail
