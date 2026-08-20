# Miller4GA Site QA Audit and Remediation Plan

Date: August 14, 2026  
Scope: QA handoff review, repository audit, local fixture review, accessibility and responsive review

## Executive summary

The QA report is directionally accurate, but the repository has already addressed parts of several findings. Four items are substantially complete in code: compact weather alerts, desktop navigation expansion, a populated local-trust section, and recurring-event grouping on the main Events page. Six items are partially complete, while the remaining core concerns are still open.

The highest-priority work is not the large homepage redesign. The first release should remove contradictory or misleading signals: exact times paired with an unverified warning, zero-length time ranges, incorrect alert-severity summaries, internal-facing Facebook copy, and unsupported “official source” wording. Accessibility fixes and homepage duplicate grouping should follow immediately because they are relatively contained and materially improve usability.

Repository checks completed during this audit:

- ESLint: pass
- TypeScript type-check: pass
- Automated tests: 172 passed, 0 failed
- Local rendered-page verification: blocked because `DATABASE_URL` is not available in this workspace
- Local SQLite fixture: only 11 legacy Event rows and not representative of production

## Sprint breakdown

| Sprint | Target | Committed scope | Completion signal |
|---|---|---|---|
| Sprint 0 — Baseline | Production evidence | Production data audit, representative defect fixtures, desktop/mobile screenshots, baseline counts | Every reported defect is reproducible or explicitly classified as production-data-only. |
| Sprint 1 — Correctness and trust | Remove misleading public output | Status-aware time copy, invalid range handling, calendar duration fallback, alert severity ordering, source wording, Facebook copy, known typo corrections | No contradictory or zero-length time output; alert badge matches the highest severity; known feed defects are corrected safely. |
| Sprint 2 — Accessible navigation | Make core journeys usable by keyboard and assistive technology | Labels, skip link, focus treatment, `aria-current`, mobile header/More navigation, safe-area/footer spacing | All public controls have accessible names and every top-level section is reachable on desktop and mobile. |
| Sprint 3 — Complete partial QA fixes | Close contained homepage/card gaps | Homepage recurrence grouping, hero/alert policy, contextual stats, word-safe summaries, tag disclosure | Recurring series appears once, statistics are defined, hidden card content has a disclosure path. |
| Sprint 4 — Homepage discovery redesign | Establish one primary homepage job | One filterable event-discovery module, quick filters, removal of overlapping event blocks, compact secondary pathways | One component owns event discovery and an event is not repeated across homepage modules. |
| Sprint 5 — Reliability and alert intelligence | Publish explainable trust signals | Reliability/freshness model, corrections workflow, methodology/privacy content, structured and deduplicated NWS alerts | Public badge meanings are auditable and warnings appear only when actionable. |

Sprint 0 depends on production access. Sprints 1–3 can proceed in the repository now. Sprint 4 needs product/design approval of the consolidated homepage direction. Sprint 5 needs production history and agreed public trust semantics.

### Current implementation pass

- Sprint 0: the read-only aggregate audit command, representative regression fixtures, production visual checklist, and deployment-access discovery are complete. Running the baseline against production still requires a SELECT-only PostgreSQL credential from Replit.
- Sprint 1: implemented in the repository, except production-data validation and a broader admin-managed correction catalog.
- Sprint 2: implemented in the repository; visual and assistive-technology checks remain part of the production QA gate.
- Sprint 3: implemented for homepage recurrence grouping, alert placement, metric context, description summaries, tag disclosure, and trust copy. The narrow-screen calendar agenda remains for a later UI pass.
- Sprint 4: not started because it changes the homepage product direction and should be reviewed before the overlapping event modules are removed.
- Sprint 5: not started because it depends on production history and approved public reliability semantics.

Run the aggregate production baseline with a dedicated SELECT-only connection:

```bash
umask 077
DATABASE_URL="$PRODUCTION_READONLY_DATABASE_URL" npm --silent run qa:baseline > qa-baseline.json
```

The report intentionally emits aggregate counts only and excludes event titles,
URLs, addresses, emails, subscriber records, and submitted-event records. Do
not run `db:push`, `db:seed`, scraping, imports, migrations, cleanup `--apply`,
or event-audit `--apply` against production.

## QA findings: current status

| # | Finding | Status | Current evidence | Recommended action |
|---|---|---|---|---|
| 1 | Source-feed typos | Open | Ingestion cleans markup and entities but has no source-scoped correction map or spelling workflow. | Add conservative source-specific corrections plus an admin audit queue; never apply a general spellchecker blindly to proper nouns. |
| 2 | Exact time shown with “Time not yet verified” | Open | Time formatting and verification messaging are independent, so both signals can appear together. | Create one status-aware date/time presenter. For ambiguous or missing evidence, either suppress precision or explicitly say the time is source-listed but not independently verified. |
| 3 | Descriptions cut off mid-sentence | Partial | A tested word-safe summarizer exists, but cards use CSS line clamping and have no explicit “Read more” affordance. | Use the summarizer for card copy and add a clear link to details. |
| 4 | Duplicate/recurring event cards | Partial | Recurring occurrences are grouped on `/events`; the homepage still renders raw rows, and cross-source or slightly varied series do not group. | Apply display grouping to the homepage now; later introduce a stable series identity and a cautious near-duplicate review workflow. |
| 5 | Zero-length meeting ranges | Open | The shared formatter prints a range whenever an end exists, including `end <= start`; calendar links also default missing end to start. | Normalize invalid/equal ends, render “Starts at …,” and give calendar exports a documented default duration or supported start-only behavior. |
| 6 | Source/tag chips lack spacing or overflow behavior | Partial | Spacing and a four-tag cap exist; excess tags disappear silently. | Extract a reusable chip list and show an accessible “+N more” disclosure. Normalize and deduplicate stored tags. |
| 7 | Homepage has too many competing jobs | Open | Homepage still contains hero/stats, four event views, meetings, volunteering, digest, and trust modules. | Establish event discovery as the primary job; demote secondary modules and link to dedicated pages. |
| 8 | Weather alerts dominate in raw format | Partial | Alerts are compact and collapsed by default; expanded descriptions remain lightly processed source text. | Keep the compact interaction, add explicit severity ordering, deduplicate related bulletins, and derive short summaries from structured alert fields. |
| 9 | Hero/value proposition appears below alerts | Open | Alert banner still renders before the hero, though it is now slim. | Put the hero first for low/medium alerts; reserve above-hero placement for high/emergency alerts. |
| 10 | “Built for local trust” section is empty | Done | Section now contains source attribution, refresh information, and design approach. | Replace the internal “Design approach” content with methodology, freshness definitions, and a corrections link. |
| 11 | Homepage stats lack context | Open | Counts appear without a time window, source count, or precise definition. | Label counts as approved upcoming listings, explain the time window, and rename “communities covered” to “cities represented” unless the metric changes. |
| 12 | Blanket disclaimers and missing source reliability model | Partial foundation | Event confidence and verification data exist, but public messaging uses date/time status only; Source has no historical reliability model. | Define understandable public states first, then track evidence status, source reliability, and freshness separately. Avoid one opaque numeric score. |
| 13 | Facebook policy reads like an engineering note | Open | The original internal wording remains in the footer. | Rewrite in plain language and link detailed collection policy from About. |
| 14 | Navigation does not expose actual site sections | Partial | Desktop nav now includes Meetings, Activities, Volunteer, About, and Updates; mobile nav does not. | Add a compact mobile header and More menu or footer sitemap; mark the current page with `aria-current`. |
| 15 | Four overlapping event views on the homepage | Open | Upcoming, weekend, free/cheap, and kid-friendly modules remain separate and can repeat the same event. | Replace them with one discovery module and quick filters linking into the existing Events filter system. |

## Additional issues found

### Correctness and trust

- The alert component computes the highest severity for color styling but displays the label from the first database result. Prisma enum ordering is not the same as the component’s explicit severity rank, so the summary can be wrong.
- “Check official source” is shown for links that may only be an original community listing. Use “original listing” unless the source registry establishes official provenance.
- The homepage claims each listing points back to its original source, but verified event cards do not expose a source link without opening the detail page.
- Calendar exports can create zero-duration events when no end time exists.
- The production data could not be quantified from this workspace. The local fixture is small, stale, and lacks current verification fields.

### Accessibility and responsive UX

- Header search, event filters, alert filters, and digest fields rely on placeholders or option text instead of programmatic labels.
- There is no skip link to bypass the sticky header.
- Navigation does not expose `aria-current="page"` or a consistent selected state.
- The seven-column calendar is too dense for narrow phones and lacks an agenda-mode fallback or horizontal overflow strategy.
- The fixed mobile bottom navigation can cover footer content and does not account for safe-area insets.
- The mobile experience has no visible site brand/header because the desktop header is fully hidden below the large breakpoint.
- Calendar days hide events after the first three behind non-actionable “+N more” text.

## Recommended delivery plan

### Phase 0 — Production evidence and release guardrails

Goal: establish a reliable baseline before changing public behavior.

1. Provide read-only production database access or an anonymized export.
2. Run counts by event/date/time verification status and source.
3. Audit `end <= start`, missing end times, stale `lastSeenAt`, confidence outside 0–1, malformed tags, exact duplicates, and likely recurring-series duplicates.
4. Capture desktop and mobile screenshots of Home, Events list, Events calendar, Alerts, event detail, About, and footer states.
5. Add a short QA fixture containing every known defect from the report.

Exit criteria:

- Baseline counts and screenshots are attached to the release task.
- Each defect can be reproduced in a fixture or is marked production-data-only.
- Production verification semantics and source categories are documented.

### Phase 1 — Correctness, trust, and accessibility quick wins

Goal: remove misleading output and basic access barriers.

1. Build a status-aware date/time display and eliminate contradictory exact-time warnings.
2. Treat equal/reversed end times as invalid; render “Starts at …” and fix calendar exports.
3. Sort alerts with one explicit severity rank and use the same top alert for style, label, and summary.
4. Rewrite Facebook policy copy and change unsupported “official source” labels to “original listing.”
5. Add labels to all public form controls, a skip link, focus treatment, and `aria-current` navigation state.
6. Add source-scoped typo corrections with regression tests and audit logging.
7. Use word-safe description summaries and add an explicit details/read-more affordance.

Exit criteria:

- No card displays a precise unverified time without explanatory context.
- No equal or reversed time range is presented publicly or exported.
- Alert summary severity matches the highest visible alert.
- Automated accessibility checks find no unlabeled public form controls.
- Known typo fixtures are corrected without changing unrecognized proper nouns.

Estimated effort: 3–5 developer days, depending on production-data access and copy approval.

### Phase 2 — Finish partial QA fixes

Goal: close visible duplication, navigation, and metadata gaps without redesigning the whole site.

1. Apply recurring-event grouping to the homepage.
2. Add a reusable chip list with “+N more” and normalize stored tag identity.
3. Move the hero ahead of non-urgent alerts; keep urgent alert placement policy-driven.
4. Add context to stats and correct the “communities covered” metric/label.
5. Add a mobile header and More menu or footer sitemap.
6. Add bottom-nav safe-area spacing and prevent footer overlap.
7. Make calendar “+N more” actionable and use an agenda layout on narrow screens.
8. Replace trust-section “Design approach” copy with sourcing, freshness, and corrections guidance.

Exit criteria:

- The same recurring series appears once in homepage event discovery.
- All hidden tags and calendar events have an accessible disclosure path.
- Every top-level public section is reachable on desktop and mobile without scrolling the homepage.
- Homepage statistics have a definition and freshness context.

Estimated effort: 4–7 developer days.

### Phase 3 — Homepage information architecture

Goal: make “find something happening nearby” the clear primary homepage job.

1. Replace Upcoming, Weekend, Free/Cheap, and Kid-friendly blocks with one event discovery component.
2. Use quick filters such as Today, This weekend, Free, Kid-friendly, and Near me/Community.
3. Reuse the existing `/events` filter query model rather than creating a second filtering system.
4. Keep one editorially distinct secondary module only if it has a clear selection rule.
5. Demote Meetings, Volunteer, Digest, and Trust into compact pathways or dedicated-page cards.
6. Instrument filter use and downstream event-detail visits before further tuning.

Exit criteria:

- One primary event list owns homepage discovery.
- An event does not appear in multiple homepage modules during the same view.
- Key tasks are validated at phone and desktop widths with keyboard-only navigation.

Estimated effort: 5–10 developer days, including design and responsive QA.

### Phase 4 — Reliability, freshness, and structured alerts

Goal: replace blanket warnings with transparent, explainable trust signals.

1. Define public states such as Verified, Source-confirmed, and Needs confirmation, including exact criteria.
2. Track event evidence, source historical reliability, and freshness as separate inputs.
3. Establish minimum sample sizes and prevent a new source from receiving an unjustified strong rating.
4. Add a corrections/reporting workflow and publish sourcing methodology and privacy information.
5. Parse NWS/CAP alert fields into short type, severity, affected area, effective/expiry, and recommended-action summaries.
6. Deduplicate alert updates and overlapping geographies while preserving source links.

Exit criteria:

- Badge meanings are documented in user-facing language.
- A warning appears only when it changes a reasonable attendance decision.
- Alert summaries remain concise while source details are available on demand.
- Trust metrics can be recalculated and audited from stored evidence.

Estimated effort: 2–4 weeks, depending on product decisions and available historical data.

## Test and verification checklist

- Unit tests for all date/time verification states, equal/reversed/missing ends, all-day and DST cases.
- Component tests for alert rank/order, compact and expanded states, and multiple alert types.
- Grouping tests for repeated occurrences, title suffixes, cross-source syndication, and distinct venues.
- Tests for typo-map idempotency, proper-noun preservation, tag normalization, and hidden-count disclosure.
- Keyboard checks for skip link, navigation, filters, alert disclosure, chip disclosure, and calendar overflow.
- Screen-reader checks for labels, verification status, quick-filter groups, and current navigation state.
- Responsive visual checks at 320, 375, 768, 1024, and 1440 pixels.
- Production smoke tests after deployment using anonymized event IDs from each verification state.

## Suggested ownership

- Product/UX: homepage primary job, alert placement rules, public verification language, reliability-state definitions.
- Frontend: time presentation, alert ordering, grouping integration, chip disclosure, unified event discovery, navigation, calendar responsive behavior, accessibility.
- Data/backend: typo correction workflow, time-range validation, recurrence/series identity, source reliability/freshness model, alert parsing and deduplication.
- Content/operations: Facebook policy, sourcing methodology, correction policy, privacy text, manual override governance.
- QA: production baseline, regression fixture maintenance, keyboard/screen-reader verification, cross-device screenshots.

## Immediate next sprint recommendation

Commit only Phase 1 and the homepage grouping portion of Phase 2 to the next sprint. These changes resolve the most damaging trust contradictions and accessibility gaps while avoiding premature commitment to the larger homepage redesign. Run Phase 0 production evidence work in parallel so the Phase 3 and Phase 4 designs are based on actual duplication, verification, and freshness rates.
