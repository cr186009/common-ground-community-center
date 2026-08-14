# Canton school and library calendar findings

Research date: August 14, 2026.

## Cherokee County School District

Implemented an adapter for the official CCSD Finalsite district calendar at `https://www.cherokeek12.net/fs/pages/5787`.

- The page server-renders calendar ID `364`, occurrence IDs, exact ISO timestamps, and all-day markers.
- Districtwide dates are useful to Canton families. School Board meetings are explicitly associated with the district auditorium in Canton; other districtwide dates are not falsely assigned a venue address.
- The adapter rejects the response if calendar ID `364` disappears, preventing an unrelated redesign page from being treated as a successful empty scrape.
- The public iCalendar URL advertised by Finalsite did not return within a 20-second verification window. The adapter therefore uses only the stable server-rendered official page and its published occurrence IDs.
- Individual Canton school calendars were not added yet. CCSD publishes many school subdomains, but a stable machine-readable cross-school feed and complete Canton-school calendar-ID allowlist could not be proven safely. Importing guessed IDs would risk mixing Woodstock, Ball Ground, or countywide campus events into Canton.

Required source registration:

```text
name: Cherokee County School District — Canton coverage
url: https://www.cherokeek12.net/fs/pages/5787
type: CALENDAR
section: EVENTS
city: Canton
county: Cherokee
frequency: DAILY
active: true
```

## Sequoyah Regional Library System

Not implemented yet.

- The official events page is `https://www.sequoyahregionallibrary.org/events`.
- Canton branches are verifiably R.T. Jones Memorial Library and Hickory Flat Public Library from the official locations directory.
- The event page is a Wix shell containing a client-side HTML embed. It does not server-render event records, event IDs, dates, locations, or the embedded provider URL.
- No official iCalendar, RSS, JSON, or stable public collection endpoint could be verified from the server response or official indexed pages.
- Scraping promotional articles would be incomplete and would not represent the library’s full event calendar.

Hold this source until the embedded provider/feed can be identified through an approved public endpoint or supplied by SRLS. Do not register an active scraper against the empty Wix shell.
