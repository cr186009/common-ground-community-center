# SQLite to Replit PostgreSQL migration

This package was generated from the downloaded `dev.db`. The SQLite integrity check returned `ok`.

## Original row counts

| Table | Rows |
| --- | ---: |
| Source | 79 |
| Event | 11 |
| Alert | 4 |
| Meeting | 4 |
| VolunteerOpportunity | 5 |
| ScrapeLog | 32 |
| SubmittedEvent | 3 |
| Subscriber | 4 |
| **Total** | **142** |

## Before importing

1. Keep a backup of `dev.db`.
2. Confirm Replit's `DATABASE_URL` points to the new PostgreSQL development database.
3. Change `prisma/schema.prisma` from `provider = "sqlite"` to `provider = "postgresql"`.
4. Create the PostgreSQL tables and Prisma client:

```bash
npx prisma db push
npx prisma generate
```

5. Copy the entire `migration-package` folder into the root of the Replit project.

## Import

Run from the Replit project root:

```bash
node migration-package/import-csv-to-postgres.mjs
```

The script imports `Source` first, preserves the original IDs, and then imports all related records. It uses `skipDuplicates`, so it is safe to rerun after a partial attempt, provided existing records retain their original IDs.

## Verify

Expected PostgreSQL counts are shown above. You can also open Prisma Studio:

```bash
npx prisma studio
```

Then run:

```bash
npx tsc --noEmit
npm run build
```

Do not run `prisma migrate reset`; it deletes database data.
