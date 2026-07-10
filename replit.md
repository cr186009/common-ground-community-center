# Common Ground Digital Community Center

A civic community hub for northwest Georgia (Paulding, Polk, Cobb, Bartow, Cherokee counties). Aggregates local events, alerts, public meetings, activities, and volunteer opportunities from official city/county sources.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 6
- **Database:** Prisma 6 + SQLite (`prisma/dev.db`)
- **Styling:** Tailwind CSS 4, PostCSS
- **Scraping:** Cheerio
- **Validation:** Zod

## Running the app

The **Community Center** workflow runs the dev server on port 5000:

```
PORT=5000 pnpm run dev
```

## Database setup

```bash
pnpm run db:push   # sync schema to SQLite
pnpm run db:seed   # seed sample data and sources
pnpm run scrape    # pull from official city/county sources
```

## Environment secrets

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma connection string — **required**. Resolves relative to `prisma/schema.prisma`, so `file:./prisma/dev.db` places the DB at `prisma/prisma/dev.db`. |
| `ADMIN_PASSWORD` | Password for the `/admin` route |
| `NEXT_PUBLIC_SITE_NAME` | Site title shown in the UI |
| `OPENAI_API_KEY` | Optional — meeting summary service |
| `EMAIL_PROVIDER_API_KEY` | Optional — weekly digest emails |

## Key routes

| Route | Description |
|-------|-------------|
| `/` | Home / dashboard |
| `/events` | Community events |
| `/alerts` | Safety & road alerts |
| `/meetings` | Public meetings |
| `/activities` | Local activities |
| `/volunteer` | Volunteer opportunities |
| `/submit` | Community submission form |
| `/search` | Full-text search |
| `/about` | About page |
| `/admin` | Password-protected admin panel |

## Project structure

```
app/              Next.js App Router pages and layouts
src/
  components/     UI components (cards, filters, shell)
  server/         Server actions and data fetching
    hub-scrapers/ Scraper implementations per source
  services/       Business logic (digest, meeting summaries, dashboard)
prisma/
  schema.prisma   Data models
  seed.ts         Sample data seeder
scripts/
  scrape.ts       Runs all registered scrapers
```

## User preferences

- Keep the existing Next.js project structure — do not migrate to a multi-artifact workspace.
- Do not replace the `/admin` page or generate placeholder code.
