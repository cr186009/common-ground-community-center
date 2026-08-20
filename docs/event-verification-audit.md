# Event verification audit

The production event-verification audit is read-only. It reports date and time
verification independently, adds the matching source's scrape health, and orders
the review queue so imminent future events appear before later and past events.

Run it with npm's own output suppressed when redirecting the JSON to a file:

```sh
npm --silent run events:audit-verification > event-verification-audit.json
```

The report includes:

- separate date and time status, reason, evidence, and verification timestamp;
- `lastScrapeAttemptAt` and its outcome;
- `lastSuccessfulScrapeAt`;
- source health warnings, consecutive failures, and the latest failure details;
- review priorities of `WITHIN_24_HOURS`, `WITHIN_7_DAYS`, `WITHIN_30_DAYS`,
  `LATER`, and `PAST`.

The command has no apply option and performs no create, update, or delete query.
It requires the same `DATABASE_URL` used by the application.
