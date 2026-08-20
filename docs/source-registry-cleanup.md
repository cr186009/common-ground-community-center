# Source registry cleanup

The source cleanup is intentionally conservative. It removes clutter without deleting civic content or scraper history.

## Policy

- Managed automated sources are retained.
- Names that differ only by capitalization or whitespace are merged. Their content and scrape logs are reassigned before the duplicate record is deleted.
- Unmanaged legacy or discovery records with no related events, meetings, alerts, or volunteer opportunities are deleted. Any scrape logs remain as detached audit history.
- Unmanaged records with related public content are retired and made inactive. They are not deleted until their content has been deliberately reconciled.
- Downtown Cedartown remains on an explicit hold because its host disallows crawling. An existing record is retired; synchronization does not create it.
- National Weather Service alerts is part of managed synchronization.

## Production workflow

Always capture and review the read-only report first:

```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" npm run sources:cleanup > source-cleanup-preview.json
```

The preview does not change the database. Review every `merge`, `retire`, and `delete` action. Apply only after approval:

```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" npm run sources:cleanup -- --apply

To merge only case/spacing duplicates without retiring or deleting any other
source, run the guarded duplicate-only workflow:

```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" node --import tsx scripts/cleanup-sources.ts --duplicates-only
DATABASE_URL="$PRODUCTION_DATABASE_URL" node --import tsx scripts/cleanup-sources.ts --duplicates-only --apply --expected-merges=REVIEWED_COUNT
```
DATABASE_URL="$PRODUCTION_DATABASE_URL" npm run sources:sync
```

Running cleanup repeatedly is safe: deleted empty leads remain absent, retired historical sources remain retired, and managed sources remain canonical.
