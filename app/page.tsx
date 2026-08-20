import Link from "next/link";
import { addDays } from "date-fns";

import {
  CollapsibleAlertBanner,
  type AlertBannerItem,
} from "@/components/collapsible-alert-banner";
import { HubEventCard } from "@/components/hub-event-card";
import { HomeDiscoveryControls } from "@/components/home-discovery-controls";
import { getDeliveredImageUrl } from "@/lib/cloudinary-image";
import {
  COUNTY_FILTERS,
  DIGEST_INTEREST_OPTIONS,
  HOME_HEADLINE,
  HOME_SUBHEADLINE,
} from "@/lib/hub-constants";
import {
  formatDateTimeRange,
  formatTimestamp,
  getAlertSeverityLabel,
  getAlertTypeLabel,
} from "@/lib/hub-format";
import {
  getCommunityDateKey,
  getCommunityWeekendRange,
} from "@/lib/hub-date";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import { subscribeDigestAction } from "@/server/hub-actions";
import { getHomepageData } from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedCounty = readSearchParam(params, "county") || "";
  const selectedCounty = COUNTY_FILTERS.includes(
    requestedCounty as (typeof COUNTY_FILTERS)[number],
  )
    ? requestedCounty
    : "";
  const data = await getHomepageData(
    selectedCounty
      ? { county: selectedCounty, sort: "asc" }
      : { sort: "asc" },
  );
  const subscribed = readSearchParam(params, "subscribed");
  const heroEvent = data.upcomingEvents.find((event) => event.imageUrl);
  const heroImageUrl = getDeliveredImageUrl(heroEvent?.imageUrl, {
    width: 1600,
    height: 800,
  });
  const allLocalEventGroups = data.upcomingEventGroups;
  const localEventGroups = allLocalEventGroups.slice(0, 6);
  const worthTheDriveGroups = selectedCounty
    ? data.worthTheDriveEventGroups.slice(0, 3)
    : [];
  const localDateCount = data.upcomingDateCount;
  const now = new Date();
  const today = getCommunityDateKey(now);
  const nextWeek = getCommunityDateKey(addDays(now, 7));
  const weekend = getCommunityWeekendRange(now);
  const countyQuery = selectedCounty
    ? `county=${encodeURIComponent(selectedCounty)}&`
    : "";
  const intentOptions = [
    {
      label: "Tonight",
      href: `/events?${countyQuery}from=${encodeURIComponent(now.toISOString())}&to=${today}`,
    },
    {
      label: "This Weekend",
      href: `/events?${countyQuery}from=${getCommunityDateKey(weekend.start)}&to=${getCommunityDateKey(weekend.end)}`,
    },
    { label: "Next 7 Days", href: `/events?${countyQuery}from=${today}&to=${nextWeek}` },
    { label: "Free", href: `/events?${countyQuery}free=1` },
    { label: "Kids", href: `/events?${countyQuery}kids=1` },
    { label: "Live Music", href: `/events?${countyQuery}category=MUSIC` },
    { label: "Outdoors", href: `/events?${countyQuery}outdoor=1` },
    { label: "Food & Drink", href: `/events?${countyQuery}category=FOOD_DRINK` },
    {
      label: "Public Meetings",
      href: `/meetings${selectedCounty ? `?county=${encodeURIComponent(selectedCounty)}` : ""}`,
    },
  ];
  const urgentAlerts = data.activeAlerts.filter(
    (alert) => alert.severity === "HIGH" || alert.severity === "EMERGENCY",
  );
  const nonUrgentAlerts = data.activeAlerts.filter(
    (alert) => alert.severity !== "HIGH" && alert.severity !== "EMERGENCY",
  );
  const toBannerItems = (alerts: typeof data.activeAlerts): AlertBannerItem[] =>
    alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      severityLabel: getAlertSeverityLabel(alert.severity),
      alertTypeLabel: getAlertTypeLabel(alert.alertType),
      sourceUrl: alert.sourceUrl,
      description: alert.description,
    }));

  return (
    <div className="space-y-8">
      <CollapsibleAlertBanner alerts={toBannerItems(urgentAlerts)} />

      <section
        className="relative isolate min-h-[34rem] overflow-hidden rounded-[2rem] bg-[color:var(--navy)] text-white shadow-[0_32px_90px_-45px_rgba(20,44,68,0.8)] sm:min-h-[38rem]"
        style={
          heroImageUrl
            ? {
                backgroundImage: `url(${heroImageUrl})`,
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
                {data.catalogFreshness.status === "CURRENT" && data.lastUpdatedAt
                  ? formatTimestamp(data.lastUpdatedAt)
                  : "Refresh status pending"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 backdrop-blur-md">
              <p className="text-sm uppercase tracking-[0.14em] text-white/70">Upcoming event series</p>
              <p className="mt-2 font-serif text-3xl text-white">{data.upcomingEventSeriesCount}</p>
              <p className="mt-1 text-xs leading-5 text-white/75">
                {data.upcomingDateCount} scheduled {data.upcomingDateCount === 1 ? "date" : "dates"} in this view
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 backdrop-blur-md">
              <p className="text-sm uppercase tracking-[0.14em] text-white/70">Area selected</p>
              <p className="mt-2 font-serif text-xl text-white">
                {selectedCounty ? `${selectedCounty} County` : "All nearby counties"}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/75">
                {selectedCounty
                  ? "Local results first · other counties under Worth the drive"
                  : "Paulding · Polk · Cobb · Bartow · Cherokee"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <CollapsibleAlertBanner alerts={toBannerItems(nonUrgentAlerts)} />

      <section className="space-y-8" id="discover">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--gold-soft)]/30 p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
            Find something nearby
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)] sm:text-4xl">
            What do you want to do?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pick your county, then jump straight to the time or kind of outing you have in mind.
          </p>
          <div className="mt-6">
            <HomeDiscoveryControls
              selectedCounty={selectedCounty}
              counties={[
                { label: "All", value: "", href: "/#discover" },
                ...COUNTY_FILTERS.map((county) => ({
                  label: county,
                  value: county,
                  href: `/?county=${encodeURIComponent(county)}#discover`,
                })),
              ]}
              intents={intentOptions}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
                {selectedCounty ? `${selectedCounty} County` : "All nearby counties"}
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">
                Coming up near you
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {allLocalEventGroups.length} event series · {localDateCount} upcoming {localDateCount === 1 ? "date" : "dates"}
              </p>
            </div>
            <Link
              href={`/events${selectedCounty ? `?county=${encodeURIComponent(selectedCounty)}` : ""}`}
              className="text-sm font-semibold text-[color:var(--forest)] hover:text-[color:var(--forest-dark)]"
            >
              View all events
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {localEventGroups.map(({ event, additionalOccurrences }) => (
              <HubEventCard
                key={event.id}
                event={event}
                additionalOccurrences={additionalOccurrences}
              />
            ))}
          </div>
          {localEventGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white p-6 text-sm text-slate-600">
              No upcoming events are available for this county yet. Know about one?{" "}
              <Link href={`/submit${selectedCounty ? `?county=${encodeURIComponent(selectedCounty)}` : ""}`} className="font-semibold text-[color:var(--forest)]">
                Add it.
              </Link>
            </div>
          ) : null}
        </div>

        {selectedCounty ? (
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Nearby counties</p>
                <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Worth the drive</h2>
              </div>
              <Link href="/events" className="text-sm font-semibold text-[color:var(--forest)]">See all nearby</Link>
            </div>
            {worthTheDriveGroups.length > 0 ? (
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {worthTheDriveGroups.map(({ event, additionalOccurrences }) => (
                  <HubEventCard key={event.id} event={event} additionalOccurrences={additionalOccurrences} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Explore all counties to see more events across the region.</p>
            )}
          </div>
        ) : null}
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
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Preferred city <span className="font-normal text-slate-500">(optional)</span>
              <input
                name="city"
                autoComplete="address-level2"
                className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              County
              <select
                name="county"
                className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal"
              >
                <option value="">Any county</option>
                {COUNTY_FILTERS.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-2 w-full text-sm font-medium text-slate-700">
                Interests
              </legend>
              {DIGEST_INTEREST_OPTIONS.map((interest) => (
                <label
                  key={interest}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700"
                >
                  <input type="checkbox" name="interests" value={interest} />
                  {interest}
                </label>
              ))}
            </fieldset>
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
            {data.catalogFreshness.status === "CURRENT" && data.lastUpdatedAt ? (
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last scraper refresh</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{formatTimestamp(data.lastUpdatedAt)}</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Source refresh status</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Current refresh information is temporarily unavailable. Use each listing’s original-source link for the latest details.
                </p>
              </div>
            )}
            <div className="rounded-2xl bg-stone-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Corrections and freshness
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Refresh times reflect the relevant event sources only and appear
                when every one is within its expected collection schedule. Event
                details can change, so each listing retains a link to its original
                source for corrections and the latest information.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
