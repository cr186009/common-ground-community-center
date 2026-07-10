---
name: Next.js → Vite+Wouter migration patterns
description: Key lessons from porting a Next.js 14 (App Router) app to Replit's Vite+React+Wouter stack with an Express API backend. Applies to any future Next.js migration.
---

## Pattern summary

### Routing
- Replace `import Link from 'next/link'` → `import { Link } from 'wouter'`
- Replace `useRouter().push(...)` → `import { useLocation } from 'wouter'; const [, navigate] = useLocation(); navigate(...)`
- Replace `useSearchParams()` → `import { useSearch } from 'wouter'; const search = useSearch()` (returns the raw query string)
- Replace `useParams()` → `import { useParams } from 'wouter'` (same API)
- Wrap entire app in `<WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>` to respect the Replit artifact path prefix.

### Data fetching
- SSR `fetch()` in server components → React Query hooks from the generated orval client (`@workspace/api-client-react`)
- `'use server'` actions (hub-actions.ts, hub-data.ts) must be deleted entirely from the Vite bundle; they use Prisma which is server-only
- The generated client hooks expect `Record<string, string>` query params; convert filter objects with `URLSearchParams` then `Object.fromEntries(params)`

### Type alignment
- Drizzle schema fields typed as `string | null | undefined` (optional); local frontend interfaces must match with `| undefined` or TS errors appear
- Generated orval API types also use `| undefined` for optional fields → define local hub types with `field?: string | null` syntax
- Format helper functions (getCategoryLabel, getAlertTypeLabel, etc.) should accept `string` not specific enum types, to avoid casts at every call site

### CSS / theming
- Tailwind v4 requires HSL vars in the `:root` block as bare `H S L` triples (no `hsl()` wrapper)
- Hub-specific design tokens (`--navy`, `--forest`, `--gold`, `--cream`, `--alert`, `--line`) are raw hex/rgba values used directly in `color:var(--name)` classNames — define them separately alongside the Tailwind semantic tokens
- Google Fonts for Fraunces and Manrope go in `index.html` `<link>` tags; font names set in `--app-font-sans` and `--app-font-serif` CSS vars

### Dead code to delete
- `src/server/` (hub-actions.ts, hub-data.ts, hub-scrapers/) — Prisma + Node-only code, crashes Vite
- `src/services/` (meeting-summary, weekly-digest) — same
- `src/lib/prisma.ts` — server-only client
- Leftover scaffold files: `src/components/layout/sidebar.tsx`, `src/components/campaign/`, `src/components/dashboard/`, `src/components/ui/` (these are from a different template)

### Seeding the database
- The pnpm workspace does not have tsx in PATH; run seed scripts with `cd lib/db && node --input-type=module << 'EOF' ... EOF` using pg directly (no TypeScript needed)
- Or add a `seed` script to the db package and use drizzle-kit's built-in ts support

### Admin endpoint
- `ADMIN_PASSWORD` env var must be set in Replit Secrets for the admin login endpoint to work; without it, the endpoint should return 401 (not 500) to avoid noisy server logs

**Why:** The existing Vite+React+Wouter+OpenAPI scaffold in the pnpm monorepo is the right target; trying to keep Next.js patterns will cause import errors and bundle failures.
