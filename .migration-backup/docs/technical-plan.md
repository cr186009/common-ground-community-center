# Technical Plan

## Architecture Decisions

- `Next.js App Router` is used for a fast, modular route structure with server-rendered pages and client-only islands where interaction matters.
- `TypeScript` is used throughout for typed domain models and adapter contracts.
- `Tailwind CSS` is used for layout and design tokens, with custom CSS variables providing the warmer, more personal visual system.
- The app is structured so UI components do not read mock data directly unless routed through a service boundary.

## Folder Structure

```text
app/
  layout.tsx
  page.tsx
  media/page.tsx
  vault/page.tsx
  projects/page.tsx
  life/page.tsx
  legacy/page.tsx
  settings/page.tsx
src/
  adapters/
    contracts.ts
    mock/
  components/
    dashboard/
    layout/
    ui/
  config/
    navigation.ts
  data/
    mock-data.ts
  lib/
    utils.ts
  services/
    dashboard-service.ts
  types/
    dashboard.ts
docs/
  product-brief.md
  technical-plan.md
```

## Integration Strategy

The integration model is:

1. Route/page requests data from a service.
2. Service composes one or more adapters.
3. Adapter owns the real integration details.
4. Mock adapters are swapped out with real implementations later.

This keeps:

- UI concerns focused on presentation
- business logic in services
- external-system complexity isolated in adapters

### Planned Integrations

- Plex:
  Server status, recently added items, active sessions, playlist or collection metadata
  Likely needs: base URL, token auth, read-only fetches, caching

- NAS / storage:
  Volume health, free space, share summaries, index refresh status
  Likely needs: endpoint strategy, auth model, stable metrics schema

- Family archive:
  Media index, dates, people tags, prompts, recent uploads
  Likely needs: file metadata source, dedupe rules, durable IDs, timestamp normalization

- Projects / personal dashboards:
  Could later come from local files, CSV, Google Sheets, RSS, or a lightweight custom backend

## Future Roadmap

### Phase 1

- Core responsive shell
- Main pages
- Typed mock data
- Adapter contracts and mocked implementations

### Phase 2

- Search and command palette
- Theme toggle and pinned modules
- Richer media and archive widgets
- Real data fetch paths for one or two integrations

### Phase 3

- Timeline views
- User-configurable modules
- Persistent storage for preferences
- Cross-domain activity feed sourced from real events
