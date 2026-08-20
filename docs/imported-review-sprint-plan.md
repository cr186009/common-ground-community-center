# Imported Codex review: sprint integration plan

Date: August 19, 2026
Source: external Codex review of the production resident journey
Scope: triage and planning only; no production-data changes are authorized by this document

## Executive decision

The review identifies three release-blocking trust defects that should be inserted
before the existing homepage redesign:

1. Paulding/Hiram civil-time and all-day normalization.
2. Government-meeting classification precision.
3. Kid-friendly safety tagging.

All three are fixable in the current repository. They should become a new **Sprint
1A — Data correctness hotfix**. The existing Sprint 4 homepage discovery redesign
should then absorb county-first discovery, intent shortcuts, count clarification,
and submission prompts. Freshness work belongs in Sprint 5 because it spans job
scheduling, stale-content lifecycle, monitoring, and public messaging.

Do not promote the site broadly until Sprint 1A exits and a production-data audit
shows that existing bad records have been repaired or quarantined.

## Finding disposition

| # | Imported finding | Feasibility | Sprint placement | Repository evidence / scope |
|---|---|---|---|---|
| 1 | Four-hour time and previous-evening all-day shifts | High; P0 | Sprint 1A | `paulding-calendar.ts` parses source civil times with `date-fns/parse` and `new Date(...)`, which depend on the server timezone. The shared `parseCommunityDateTime` utility already provides the correct Eastern civil-time primitive. Audit Hiram and every scraper accepting date-only/offset-free input. Repair stored records after deploying the parser fix. |
| 1a | Add-to-calendar audit | High; P0 companion | Sprint 1A | Google Calendar generation already emits UTC instants and supplies `America/New_York`; it will be correct only when stored instants are correct. Add timed, all-day, DST, missing-end, and repaired-record regression tests. Decide whether true all-day events need date-only calendar parameters. |
| 2 | Non-government content on Meetings | High; P0 | Sprint 1A | Global `inferCategory` treats any “meeting,” “board,” or “commission” occurrence as government. `classifyEventContent` then promotes any `GOVERNMENT_MEETING` event. Require authoritative government evidence or an explicit scraper/manual meeting declaration; default ambiguous content to ordinary events and queue it for review. |
| 3 | Unsafe Kid-friendly tagging | High; P0 | Sprint 1A | Many scrapers independently use broad positive regexes such as `family`, `youth`, or `teen`, with no negative-content guardrail. Centralize the policy: explicit positive evidence plus hard-block terms for mature/sexual content, violence, suicide, adults-only, 18+/21+, and similar warnings. Conflicts should clear the public tag and enter an audit queue. |
| 4 | County-first/local homepage | High; product decision needed | Sprint 4 | County filtering already exists on `/events`; the homepage query is unfiltered. Reuse the existing query model, initially with a remembered county preference and an explicit All option. Geolocation/radius requires consent, coordinates, distance queries, and a fallback, so schedule it as a later increment rather than blocking county tabs. |
| 5 | Intent buttons | High | Sprint 4 | Free, kid-friendly, outdoor, county, category, and arbitrary date-range filters already exist. Add Tonight, This Weekend, and Next 7 Days as generated `/events` links; map Music/Food/Public Meetings to existing destinations. Do not create a second filter engine. |
| 6 | Stale homepage and expired events | Medium-high; production operations required | Sprint 5, with Sprint 0 evidence | Public event queries already exclude events whose start is in the past, but they do not account for an event currently in progress, scraper deployment health, or per-source freshness. Scheduling supports hourly sources and near-event revalidation. Verify the production scheduler first, then use end time (or a documented default duration) for expiry, expose relative freshness only while healthy, and alert administrators on overdue sources. |
| 7 | Conflicting event counts | High | Sprint 4 | Homepage count uses raw approved future rows while event pages can group recurring occurrences for display. Publish both concepts from one aggregation: “X event series · Y upcoming dates,” or remove the hero count until the aggregation is reliable. |
| 8 | Long imported descriptions | Already substantially complete | Sprint 3 verification | `HubEventCard` uses a word-safe 220-character summary and a detail link. Audit the remaining compact homepage lists, search results, volunteer cards, and any production build that may predate this code. Normalize repeated source boilerplate during ingestion only when source-scoped and testable. |
| 9 | Empty Volunteer experience | High; supply is operational | Sprint 4 UX, Later roadmap for supply | The homepage already hides the volunteer module when empty; the dedicated page still needs an invitational empty state. Add “Know somewhere that needs volunteers? Submit it” now. Adding dependable volunteer sources and matching remains later community-participation work. |
| 10 | Submission visibility | High | Sprint 4 | The hero already links to Submit. Add contextual “Something missing?” prompts after county results and in empty states, carrying the selected county/city into the submission form where safe. Track prompt-to-submission conversion. |

## Revised sprint sequence

### Sprint 0 — Production evidence (continue in parallel)

Add aggregate audits for:

- source-published time versus stored/displayed Eastern time;
- offset-free timestamps and date-only/all-day records by scraper;
- events currently classified as meetings, grouped by source and matched rule;
- kid-friendly records containing negative safety terms;
- raw occurrences versus grouped series by county;
- per-source last success, overdue schedule, and visible expired records.

Capture the named production examples as regression fixtures without retaining
unnecessary personal data. Until read-only production access is available, mark
the size of the repair set as unknown rather than assuming the examples are
isolated.

### Sprint 1A — Data correctness hotfix (new, release blocking)

1. Introduce one helper for parsing offset-free civil date/times in
   `America/New_York`; prohibit direct parsing of scraper civil times through
   environment-local `Date`/`date-fns` behavior.
2. Correct Paulding parsing and audit Hiram plus all other scraper inputs for
   date-only, offset-free, explicit-offset, UTC, all-day, and DST behavior.
3. Add calendar-link tests for timed events, all-day events, DST boundaries,
   invalid/missing end times, and the three reported Paulding examples.
4. Replace loose government inference with an evidence-based classifier. A
   meeting must have an explicit normalized meeting declaration or recognized
   public-body/source evidence plus meeting-title evidence.
5. Replace per-scraper kid-friendly regexes with a shared policy evaluator that
   returns the decision, evidence, and blocking reason.
6. Add a dry-run repair command reporting proposed time, content-type, and safety
   tag changes. Require explicit `--apply`, log before/after values, and re-run
   verification after application.

Exit criteria:

- Fixtures matching the reported Paulding events display the official Eastern
  times and all-day dates in both UI and calendar output.
- Direct offset-free scraper parsing is covered by a repository audit/test.
- The named board game, business club, car show, and TTRPG examples cannot enter
  Meetings without explicit authoritative evidence.
- Mature-content fixtures cannot be publicly labeled Kid-friendly or selected by
  the homepage family query.
- The production dry-run is reviewed; repaired/quarantined totals reconcile with
  the post-run audit.

Estimated effort: 5–8 developer days plus production validation.

### Sprints 2–3 — Keep the existing committed sequence

Do not displace the completed accessibility work. Add regression coverage for
the new county and intent controls to its production QA gate. In Sprint 3, verify
word-safe summaries and recurrence grouping across every public list, not only
the main card component.

### Sprint 4 — County-first discovery and contribution

Deliver this in two increments:

1. County tabs/preference, Tonight/Weekend/Next 7 Days, Free/Kids/Music/Outdoors/
   Food/Public Meetings, unified homepage event discovery, series/date count
   labels, and contextual submission/volunteer empty-state prompts.
2. Optional “Use my location” and radius filters only after a privacy decision,
   coordinate coverage audit, and distance-query performance test.

Exit criteria:

- A resident can reach “Paulding + This Weekend + Free” in no more than three
  actions and the preference persists without preventing an obvious All view.
- “Nearby” results precede a separately labeled “Worth the drive” section.
- Counts distinguish grouped event series from occurrence dates.
- Empty Volunteer and county results invite a pre-contextualized submission.

Estimated effort: 7–12 developer days for increment 1; geolocation is separately
estimated after discovery.

### Sprint 5 — Freshness and lifecycle reliability

1. Verify the production invocation and monitoring of `scrape:due`.
2. Define per-source freshness SLOs and administrator alerts.
3. Expire events after their valid end; use a documented fallback when no end is
   supplied, while retaining same-day discoverability for ongoing events.
4. Derive homepage freshness from relevant healthy event sources, not merely the
   latest successful scrape of any source.
5. Show relative public freshness while healthy and suppress the reassuring badge
   when stale; preserve precise timestamps in admin diagnostics.

Exit criteria:

- A failed or overdue production collector generates an internal alert.
- Ended events disappear consistently from Home, Events, Search, and quick-filter
  results.
- Homepage and Search use the same freshness and eligibility rules.
- Public freshness copy cannot imply the event catalog is current because an
  unrelated scraper succeeded.

Estimated effort: 5–9 developer days plus deployment/monitoring access.

## Dependency and risk notes

- Production read-only access is required to size repairs; write access should be
  granted only for the reviewed repair command and deployment workflow.
- Existing incorrect rows will not fix themselves merely by changing display
  formatting. They must be re-scraped or repaired from retained source evidence.
- A negative keyword list reduces harm but is not a complete content-rating
  system. Conflicting or ambiguous safety evidence must fail closed and remain
  manually reviewable.
- Government-owned calendars also publish ordinary community events. Source
  authority alone is insufficient; classification must combine source/body and
  event evidence.
- Browser geolocation is optional enhancement work, not a prerequisite for a
  useful county-first experience.

## Recommended backlog order

1. Timezone/all-day parser and production repair.
2. Calendar-output audit.
3. Government-meeting classifier and taxonomy repair.
4. Kid-friendly policy and safety repair.
5. Cross-taxonomy production audit.
6. County-first unified discovery and intent shortcuts.
7. Freshness scheduler/lifecycle monitoring.
8. Count clarification and remaining summary consistency.
9. Volunteer/submission prompts and source-development work.
10. Optional geolocation/radius discovery.
