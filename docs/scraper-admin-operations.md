# Scraper administration routine

## Automatic schedule

Run `pnpm scrape:due` from an external scheduler every hour. The command is
idempotent: it runs only active, registered sources whose stored frequency is
due. Facebook and manual-review sources are excluded. A cron example is:

```cron
7 * * * * cd /path/to/app && pnpm scrape:due >> /var/log/community-scrape.log 2>&1
```

The scheduler treats the newest scrape log as the **last attempt**, including
failures and zero-result runs. The newest successful log remains the **last
success**. Keeping these timestamps separate prevents a failing source from
being reported as fresh while also preventing an hourly scheduler from
retrying it continuously.

Upcoming approved events trigger a tighter source refresh cadence: every 24
hours within seven days, every 12 hours within 48 hours, and every three hours
within 12 hours. This rechecks source calendars for late date, time,
cancellation, or postponement changes. Blank or unrecognized source frequency
values default to daily.

### Marietta fallback feeds

The City of Marietta may block automated access to its iCalendar index while
leaving individual official CivicPlus feeds available. In that case, set
`MARIETTA_CALENDAR_CATEGORY_IDS` to the comma-separated numeric category IDs
copied from Marietta's official iCalendar links. The scraper rejects nonnumeric
values and constructs only `mariettaga.gov` feed URLs; do not guess category
IDs or substitute third-party calendars.

The Sources tab is the control center for automated calendars. Its default coverage policy is a 25-mile radius from Dallas City Hall, with a five-mile borderline review buffer. Paulding County sources are always treated as core coverage.

## Automated source onboarding contract

Before enabling a new automated source:

1. Register its canonical database source name in the runtime scraper fleet. Source-name matching ignores only casing and repeated whitespace; wording changes create a database-only source.
2. Add source-specific fixture tests for parsing, date/time-zone handling, malformed records, and upstream response changes. Add the canonical name to the fleet invariant test.
3. Retain official date/time evidence (`listingDate`, `structuredDate`, and the relevant `sourcePublishedText`) so displayed timestamps can be verified independently.
4. Provide a stable item identity: prefer an official occurrence/detail URL or upstream ID. Verify that reruns update existing records instead of creating duplicates.
5. Treat an unexpected zero-result event, meeting, or activity run as partial/degraded and preserve a diagnostic message. Alert feeds may legitimately contain zero active alerts.
6. Confirm each record is inside the geographic coverage policy using venue coordinates where available, with city/source coordinates only as a fallback.
7. Run a read-only preview, inspect classification and deduplication, then run the focused tests, TypeScript, and the full scraper test suite before activation.

## Weekly review

1. Filter to **Failing** and inspect the latest error and recent run metrics.
2. Open **Preview** before running a repaired or unfamiliar scraper. A preview fetches records but does not save content, update the source timestamp, or write a scrape log.
3. Review **Degraded** sources for zero-result, partial, overdue, or unpublished-content warnings.
4. Filter by coverage. Keep core and within-radius sources active; manually review borderline and unknown sources; pause or retire confirmed out-of-area sources.
5. Use **Pause** for temporary problems. Use **Retire** when the calendar is obsolete, irrelevant, or replaced. Retirement preserves imported records and run history.
6. Use **Restore** if a retired source becomes useful again.

## Safe cleanup rules

- Do not permanently delete a source merely because it fails. Preview it and inspect its logs first.
- Retirement is the default removal operation. Existing events, meetings, alerts, volunteer records, and scrape logs remain attributed to the source.
- Bulk pause is reversible and should be used for a review queue, not as permanent deletion.
- A database-only source has no matching registered scraper and cannot run automatically.
- A registry-only scraper exists in code but needs a matching database source before it can run.
- Venue coordinates are preferred for final event-level coverage. A known city center is only a source-level estimate.

## Coverage decisions

- **Core Paulding:** Paulding County records, including records without coordinates.
- **Within 25 miles:** Known coordinates fall inside the configured radius.
- **Borderline:** Between 25 and 30 miles; review the venue and community relevance.
- **Out of area:** Beyond the review buffer; normally pause or retire unless it is an approved regional exception.
- **Unknown:** Missing a usable city or venue location; preview and review manually.
