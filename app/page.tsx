import Link from "next/link";

import {
  CollapsibleAlertBanner,
  type AlertBannerItem,
} from "@/components/collapsible-alert-banner";
import { HubEventCard } from "@/components/hub-event-card";
import {
  COUNTY_FILTERS,
  DIGEST_INTEREST_OPTIONS,
  HOME_HEADLINE,
  HOME_SUBHEADLINE,
} from "@/lib/hub-constants";
import {
  formatDateTimeRange,
  formatFriendlyDate,
  formatTimestamp,
  getAlertSeverityLabel,
  getAlertTypeLabel,
} from "@/lib/hub-format";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import { subscribeDigestAction } from "@/server/hub-actions";
import { getHomepageData } from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getHomepageData();
  const subscribed = readSearchParam(params, "subscribed");
  const heroEvent = data.upcomingEvents.find((event) => event.imageUrl);

  return (
    <div className="space-y-8">
      <CollapsibleAlertBanner
        alerts={data.activeAlerts.map(
          (a): AlertBannerItem => ({
            id: a.id,
            title: a.title,
            severity: a.severity,
            severityLabel: getAlertSeverityLabel(a.severity),
            alertTypeLabel: getAlertTypeLabel(a.alertType),
            sourceUrl: a.sourceUrl,
            description: a.description,
          }),
        )}
      />

      <section
        className="relative isolate min-h-[34rem] overflow-hidden rounded-[2rem] bg-[color:var(--navy)] text-white shadow-[0_32px_90px_-45px_rgba(20,44,68,0.8)] sm:min-h-[38rem]"
        style={
          heroEvent?.imageUrl
            ? {
                backgroundImage: `url(${heroEvent.imageUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,_rgba(11,34,52,0.96)_0%,_rgba(22,59,89,0.82)_48%,_rgba(22,59,89,0.24)_100%)]" />
        <div className="flex min-h-[34rem] flex-col justify-between p-7 sm:min-h-[38rem] sm:p-10 lg:p-12">
          <div className="max-w-3xl pt-5 sm:pt-10">
            <p className="text-sm uppercase tracking-[0.2em] text-white/75">
              Local Georgia communities
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.08] sm:text-6xl lg:text-7xl">
              {HOME_HEADLINE}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
              {HOME_SUBHEADLINE}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/events" className="btn btn-light btn-md">Browse events</Link>
              <Link href="/submit" className="btn btn-outline-white btn-md">Submit an item</Link>
              <Link href="/meetings" className="btn btn-outline-white btn-md">See public meetings</Link>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 backdrop-blur-md">
              <p className="text-sm uppercase tracking-[0.14em] text-white/70">
                Last updated
              </p>
              <p className="mt-2 font-serif text-xl text-white">
                {data.lastUpdatedAt
                  ? formatTimestamp(data.lastUpdatedAt)
                  : "Update pending"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 backdrop-blur-md">
              <p className="text-sm uppercase tracking-[0.14em] text-white/70">Upcoming events</p>
              <p className="mt-2 font-serif text-3xl text-white">{data.upcomingEventCount}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 backdrop-blur-md">
              <p className="text-sm uppercase tracking-[0.14em] text-white/70">Communities covered</p>
              <p className="mt-2 font-serif text-3xl text-white">{data.communitiesCovered}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                Upcoming events
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">
                Coming up soon
              </h2>
            </div>
            <Link
              href="/events"
              className="text-sm font-semibold text-[color:var(--forest)] hover:text-[color:var(--forest-dark)]"
            >
              View all events
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.upcomingEvents.map((event) => (
              <HubEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                  This weekend
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">
                  Quick family plans
                </h2>
              </div>
              <Link
                href="/activities"
                className="text-sm font-semibold text-[color:var(--forest)]"
              >
                Activities
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {data.weekendEvents.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Weekend picks will appear here as new events are added.
                </p>
              ) : (
                data.weekendEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {formatFriendlyDate(event.startDateTime, event.isAllDay)}
                    </p>
                    <Link
                      href={`/events/${event.id}`}
                      className="mt-2 block font-semibold text-[color:var(--navy)]"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">
                      {[event.locationName, event.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">
              Free & cheap
            </h2>
            <div className="mt-5 space-y-3">
              {data.freeEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-[color:var(--gold-soft)]/50 p-4"
                >
                  <div>
                    <Link
                      href={`/events/${event.id}`}
                      className="font-semibold text-[color:var(--navy)]"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTimeRange(
                        event.startDateTime,
                        event.endDateTime,
                        event.isAllDay,
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {event.cost || "Free"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">
              Kid-friendly picks
            </h2>
            <div className="mt-5 space-y-3">
              {data.kidFriendlyEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl bg-[color:var(--forest-soft)]/55 p-4"
                >
                  <Link
                    href={`/events/${event.id}`}
                    className="font-semibold text-[color:var(--navy)]"
                  >
                    {event.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">
                    {[event.locationName, event.city]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {data.upcomingMeetings.length > 0 ||
      data.volunteerOpportunities.length > 0 ? (
        <section
          className={`grid gap-6 ${data.upcomingMeetings.length > 0 && data.volunteerOpportunities.length > 0 ? "lg:grid-cols-2" : ""}`}
        >
          {data.upcomingMeetings.length > 0 ? (
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                Public meetings
              </p>
              <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">
                Upcoming civic calendar
              </h2>
            </div>
            <Link
              href="/meetings"
              className="text-sm font-semibold text-[color:var(--forest)]"
            >
              Meetings
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {meeting.governmentBody}
                </p>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="mt-2 block font-semibold text-[color:var(--navy)]"
                >
                  {meeting.title}
                </Link>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDateTimeRange(
                    meeting.startDateTime,
                    meeting.endDateTime,
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {[meeting.locationName, meeting.city]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
          ) : null}

        {data.volunteerOpportunities.length > 0 ? (
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                Volunteer & community help
              </p>
              <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">
                Ways to pitch in
              </h2>
            </div>
            <Link
              href="/volunteer"
              className="text-sm font-semibold text-[color:var(--forest)]"
            >
              Volunteer
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.volunteerOpportunities.map((item) => (
              <div key={item.id} className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {item.organization}
                </p>
                <h3 className="mt-2 font-semibold text-[color:var(--navy)]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          </div>
        ) : null}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Weekly digest</p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Join the digest early-access list</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Choose your county and interests to help shape a personalized weekly preview of what is happening nearby. We will let early-access members know when delivery begins.
          </p>

          {subscribed ? (
            <div className="mt-4 rounded-2xl border border-[color:var(--forest)]/20 bg-[color:var(--forest-soft)] p-4 text-sm text-[color:var(--forest)]">
              Your digest preferences were saved.
            </div>
          ) : null}

          <form action={subscribeDigestAction} className="mt-5 grid gap-3">
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
            />
            <input
              name="city"
              placeholder="Preferred city (optional)"
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
            />
            <select
              name="county"
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
            >
              <option value="">Any county</option>
              {COUNTY_FILTERS.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {DIGEST_INTEREST_OPTIONS.map((interest) => (
                <label
                  key={interest}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700"
                >
                  <input type="checkbox" name="interests" value={interest} />
                  {interest}
                </label>
              ))}
            </div>
            <button type="submit" className="mt-2 btn btn-primary btn-md">
              Save digest preferences
            </button>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
            How current is the site?
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">
            Built for local trust
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Source attribution
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Each listing points back to its original source so residents can
                verify details fast.
              </p>
            </div>
            {data.lastUpdatedAt ? (
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last scraper refresh</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{formatTimestamp(data.lastUpdatedAt)}</p>
              </div>
            ) : null}
            <div className="rounded-2xl bg-stone-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Design approach
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Warm, mobile-first, easy to read, and built to feel more like a
                community center bulletin board than a campaign site.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
