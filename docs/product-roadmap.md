# Common Ground product roadmap

## Current release — Version 2.1.0

Version 2.1.0 combines county-first homepage discovery, intent shortcuts,
dedicated list/calendar/map event views, safer schedule and content trust
signals, consistent event lifecycle rules, relevant-source freshness, guarded
production cleanup, and a two-week public alert history. Tag and publish the
release only after the Sprint 5 production health and cleanup dry runs pass.

## Now — trust and engagement foundation

- Keep event date and time verification visible and auditable.
- Stabilize the 20 automated scraper integrations and expand Canton and Kennesaw coverage profiles.
- Capture privacy-safe event interest: public counts, optional first-name display, and private admin contact records.
- Protect public submission and engagement forms with CAPTCHA.
- Notify the administrator about digest registrations, event submissions, and new event interest.

## Next — useful follow-up

- Rename the homepage metric from “Upcoming event series” to “Upcoming events,”
  with supporting copy that reads “Across X scheduled dates.”
- Monitor one-time event reminder delivery and retry failures safely.
- Add organizer-facing engagement totals without exposing resident emails.
- Add share links and track privacy-safe referral counts.
- Group recurring events and preserve interest per occurrence.

### Sprint 6 — engagement safety and clarity

1. Make the homepage event-count language resident-friendly: “Upcoming events”
   with “Across X scheduled dates,” while retaining recurrence-aware counting.
2. Protect public submission and engagement forms with CAPTCHA and rate limits.
3. Notify administrators about event submissions, digest registrations, and new
   event interest without exposing resident contact details publicly.
4. Validate reminder delivery, failure logging, and safe retries.
5. Add privacy-safe share/referral measurement and organizer-facing engagement
   totals.

Exit criteria:

- Homepage counts are understandable without knowing the difference between an
  event series and an occurrence.
- Automated abuse is constrained on every public write endpoint.
- Administrators can act on new submissions and failed notifications.
- Resident emails and subscriber details remain private.

## Soon — digest delivery

- Move the digest from preview to scheduled delivery.
- Personalize by city, county, category, and followed events.
- Include date/time verification status and direct official links.
- Add unsubscribe, preference management, delivery logs, and bounce handling.

## Later — community participation

- Optional resident accounts for saved events and notification preferences.
- Organizer claim-and-correct workflow with administrator approval.
- Post-event feedback such as “I attended” and a short usefulness rating.
- Community collections, accessible-event attributes, and volunteer matching.

## Guardrails

- Never publish email addresses or full attendee lists.
- Require explicit consent before marketing or reminders.
- Keep official sources and verification state visible.
- Moderate user-generated content and rate-limit engagement endpoints.
- Measure useful outcomes, not just clicks.
