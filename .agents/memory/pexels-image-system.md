---
name: Pexels fallback image system
description: How the Pexels integration works, what schema fields it adds, and what the user must do before it runs.
---

# Pexels fallback image system

## Schema fields added to Event model
- `imageSource String?` — e.g. "Pexels"
- `imageCredit String?` — photographer name
- `imageCreditUrl String?` — Pexels photo page URL
- `imageAlt String?` — alt text
- `imageIsFallback Boolean @default(false)` — true = assigned via Pexels

## Critical: requires `prisma db push`
These columns do NOT exist in the database until the user runs:
```
pnpm exec prisma db push
```
Until then, ALL event queries fail at runtime because Prisma implicitly SELECTs all columns. The build passes (prisma generate updates TS types) but the app will error on every event route.

## Key files
- `src/server/pexels.ts` — Pexels API service (search, assign, bulk assign)
- API key: `process.env.PEXELS_API_KEY` (never client-side)
- Actions in `hub-actions.ts`: `assignFallbackImageAction`, `replaceFallbackImageAction`, `removeFallbackImageAction`, `assignBulkFallbackImagesAction`

## Priority rule
Never overwrite a real (non-fallback) image automatically. Only assign when `imageUrl` is null or `imageIsFallback` is true.

**Why:** Real scraped images are authoritative and should not be replaced by generic stock photos.
