# Common Ground Digital Community Center

Common Ground Digital Community Center is a full-stack local civic web app for nearby Georgia communities. It combines community events, alerts, public meetings, activities, volunteer opportunities, source-aware listings, resident submissions, and a weekly digest preview into one mobile-friendly community calendar.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite for local development
- Cheerio for scraper parsing

## Main sections

- `/`
- `/events`
- `/events/[id]`
- `/alerts`
- `/meetings`
- `/meetings/[id]`
- `/activities`
- `/volunteer`
- `/submit`
- `/search`
- `/about`
- `/admin`

`/sources` is no longer public. Non-admin visitors are redirected away, while source management remains available through `/admin`.

## Supported counties

- Paulding
- Polk
- Cobb
- Bartow
- Cherokee

## Supported city filters

- Hiram
- Dallas
- Rockmart
- Cedartown
- Woodstock
- Rome
- Canton
- Adairsville
- Marietta
- Acworth
- Kennesaw
- Smyrna
- Powder Springs

## Database models

The Prisma schema lives at [prisma/schema.prisma](/Users/home/Documents/Playground/prisma/schema.prisma) and includes:

- `Event`
- `Alert`
- `Meeting`
- `VolunteerOpportunity`
- `Source`
- `SubmittedEvent`
- `Subscriber`
- `ScrapeLog`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Sync the local database:

```bash
npm run db:push
```

3. Seed sources and sample data:

```bash
npm run db:seed
```

4. Start the app:

```bash
npm run dev
```

## Environment variables

Use `.env.example` as the template:

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="community-center-admin"
NEXT_PUBLIC_SITE_NAME="Common Ground Digital Community Center"
EMAIL_PROVIDER_API_KEY=
OPENAI_API_KEY=
```

Only `DATABASE_URL` and `ADMIN_PASSWORD` are required for local development. Email and AI keys remain optional stubs.

## How to seed sources

Run:

```bash
npm run db:seed
```

The seed script clears local content and repopulates:

- Expanded source coverage for Paulding, Polk, Cobb, Bartow, and Cherokee
- Sample events, alerts, meetings, and volunteer opportunities across multiple counties
- Sample pending submissions
- Sample digest subscribers
- Sample scrape logs

## How to run scrapers manually

Run the full scraper set:

```bash
npm run scrape
```

Current working scraper modules include:

1. `Paulding County Parks calendar`
2. `City of Dallas official events page`
3. `City of Hiram official site`
4. `City of Rockmart official site`
5. `Downtown Cedartown events page`

Facebook and Instagram sources are stored as source records and treated as manual-review placeholders. They are not required for the core app experience and are not aggressively scraped.

## Admin access

1. Start the app locally.
2. Open `/admin`.
3. Sign in with the value of `ADMIN_PASSWORD`.

Admin features include:

- Approve or reject pending submissions
- Edit or archive events
- Add manual events
- Add manual alerts
- Add manual meetings
- Add volunteer opportunities
- Add and toggle sources
- Run all scrapers
- Run a single scraper
- Review scrape logs
- Generate placeholder plain-English meeting summaries
- Preview weekly digest content for saved subscribers

## Adding new sources

You can add sources directly from `/admin`.

For scraper-backed sources:

1. Add the source in `/admin`
2. Create a module under [src/server/hub-scrapers/sources](/Users/home/Documents/Playground/src/server/hub-scrapers/sources)
3. Register it in [src/server/hub-scrapers/index.ts](/Users/home/Documents/Playground/src/server/hub-scrapers/index.ts)

For Facebook, Instagram, and community-manual sources:

1. Add the source in `/admin`
2. Mark the source notes clearly as manual review
3. Avoid treating the source as a hard production dependency unless you later add a compliant importer

## Social source policy

- Facebook and Instagram sources are supported in the source catalog
- They are intentionally not required for core functionality
- Public social scraping is not implemented as a hard dependency
- Manual review placeholders exist for those sources
- The app does not require social-media login
- The app avoids aggressive automated scraping behavior

## Weekly digest

The project stores subscribers and can build a digest preview in admin, but it does not send live email yet unless a future email provider is configured.

## Deployment notes

- SQLite is fine for local testing
- For production, consider moving Prisma to Postgres or another managed database
- Set a real `ADMIN_PASSWORD`
- Add an email provider before enabling live sends
- Replace the placeholder meeting-summary service with an AI integration if needed
- Review scraper cadence, rate limits, and monitoring before deploying scheduled jobs
