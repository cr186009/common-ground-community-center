# Scraper administration routine

The Sources tab is the control center for automated calendars. Its default coverage policy is a 25-mile radius from Dallas City Hall, with a five-mile borderline review buffer. Paulding County sources are always treated as core coverage.

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
