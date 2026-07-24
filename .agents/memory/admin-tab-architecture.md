---
name: Admin tab architecture
description: How the reorganized admin page is structured with 6 tabs.
---

# Admin tab architecture

## Tab routing
The admin page uses `?tab=X` URL query params. Tabs: `overview`, `sources`, `events`, `images`, `logs`, `add`.

If `?edit=ID` is present without a tab param, defaults to the `events` tab.

## Section components (server components)
Each tab renders a dedicated async server component from `src/components/admin/`:
- `overview-section.tsx` — stat cards, needs attention panel, pending submissions, digest preview, subscribers
- `sources-section.tsx` — source list with health status, filter form, inline edit form (?editSource=ID)
- `events-section.tsx` — event management with filters, pagination, per-event actions, duplicate inspector
- `images-section.tsx` — Pexels image stats, bulk assign, missing/fallback event lists
- `logs-section.tsx` — scrape log viewer with filters and expandable details

## Data functions added to hub-data.ts
- `getAdminExtendedCounts()` — new operational stats
- `getAdminSourceHealth(scraperNames[])` — enhanced source data + health status computation
- `getAdminEventManagement(filters)` — paginated event list (25/page)
- `getAdminImageData()` — image stats + missing/fallback event lists
- `getAdminScrapeLogs(filters)` — filtered log list (50/page)
- `getAdminPossibleDuplicates()` — in-memory duplicate detection for upcoming events

## Source health computation
Health status: HEALTHY / WARNING / FAILED / MANUAL / INACTIVE
MANUAL = no automated scraper registered (e.g. Facebook sources). Never shows as failed.
Staleness thresholds: hourly=4h, daily=2d, weekly=10d, monthly=40d.

**Why:** Facebook/manual sources must not be flagged as broken just because they lack automation.
