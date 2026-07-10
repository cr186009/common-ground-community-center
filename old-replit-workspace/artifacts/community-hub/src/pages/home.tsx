import { useState } from 'react';
import { Link } from 'wouter';
import { useGetHomepage } from '@workspace/api-client-react';

import { HubEventCard } from '@/components/hub-event-card';
import {
  COUNTY_FILTERS,
  DIGEST_INTEREST_OPTIONS,
  HOME_HEADLINE,
  HOME_SUBHEADLINE,
} from '@/lib/hub-constants';
import {
  formatDateTimeRange,
  formatFriendlyDate,
  formatTimestamp,
  getAlertSeverityLabel,
  getAlertTypeLabel,
} from '@/lib/hub-format';

export default function HomePage() {
  const { data, isLoading, isError } = useGetHomepage();
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const interests = (fd.getAll('interests') as string[]).join(',');
    setSubscribing(true);
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fd.get('email'),
          city: fd.get('city') || undefined,
          county: fd.get('county') || undefined,
          interests,
        }),
      });
      setSubscribed(true);
    } catch {
      // ignore
    } finally {
      setSubscribing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--navy)] border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Could not load community data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data.topAlert ? (
        <section className="rounded-[1.75rem] border border-[color:var(--alert)]/20 bg-[color:var(--alert-soft)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--alert)]">
                {getAlertSeverityLabel(data.topAlert.severity)} alert · {getAlertTypeLabel(data.topAlert.alertType)}
              </p>
              <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">{data.topAlert.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                {data.topAlert.description || 'See source link for the full notice and any updates.'}
              </p>
            </div>
            <Link
              href="/alerts"
              className="rounded-full bg-[color:var(--alert)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              View alerts
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] bg-[linear-gradient(140deg,_rgba(22,59,89,0.97),_rgba(39,92,67,0.92)_58%,_rgba(216,179,86,0.9))] p-8 text-white shadow-[0_32px_90px_-45px_rgba(20,44,68,0.8)]">
          <p className="text-sm uppercase tracking-[0.2em] text-white/70">Local Georgia communities</p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{HOME_HEADLINE}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">{HOME_SUBHEADLINE}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[color:var(--navy)] transition hover:bg-[color:var(--cream)]"
            >
              Browse events
            </Link>
            <Link
              href="/submit"
              className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Submit an item
            </Link>
            <Link
              href="/meetings"
              className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See public meetings
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Upcoming events</p>
            <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{data.upcomingEvents.length}</p>
            <p className="mt-2 text-sm text-slate-600">Fresh listings from official sources and moderated submissions.</p>
          </div>
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Pending submissions</p>
            <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{data.pendingSubmissions}</p>
            <p className="mt-2 text-sm text-slate-600">Community contributions waiting for review.</p>
          </div>
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 sm:col-span-3 lg:col-span-1">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Digest subscribers</p>
            <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{data.activeSubscriberCount}</p>
            <p className="mt-2 text-sm text-slate-600">Local residents signed up for the weekly digest preview.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Upcoming events</p>
              <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Coming up soon</h2>
            </div>
            <Link href="/events" className="text-sm font-semibold text-[color:var(--forest)] hover:text-[color:var(--forest-dark)]">
              View all events
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.upcomingEvents.map((event) => (
              <HubEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.14em] text-slate-500">This weekend</p>
                <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">Quick family plans</h2>
              </div>
              <Link href="/activities" className="text-sm font-semibold text-[color:var(--forest)]">
                Activities
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {data.weekendEvents.length === 0 ? (
                <p className="text-sm text-slate-600">Weekend picks will appear here as new events are added.</p>
              ) : (
                data.weekendEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {formatFriendlyDate(event.startDateTime)}
                    </p>
                    <Link href={`/events/${event.id}`} className="mt-2 block font-semibold text-[color:var(--navy)]">
                      {event.title}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">{[event.locationName, event.city].filter(Boolean).join(' · ')}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Free &amp; cheap</h2>
            <div className="mt-5 space-y-3">
              {data.freeEvents.length === 0 ? (
                <p className="text-sm text-slate-600">Free events will appear here once they are added.</p>
              ) : data.freeEvents.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-3 rounded-2xl bg-[color:var(--gold-soft)]/50 p-4">
                  <div>
                    <Link href={`/events/${event.id}`} className="font-semibold text-[color:var(--navy)]">
                      {event.title}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">{formatDateTimeRange(event.startDateTime, event.endDateTime)}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {event.cost || 'Free'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Kid-friendly picks</h2>
            <div className="mt-5 space-y-3">
              {data.kidFriendlyEvents.length === 0 ? (
                <p className="text-sm text-slate-600">Kid-friendly events will appear here once they are added.</p>
              ) : data.kidFriendlyEvents.map((event) => (
                <div key={event.id} className="rounded-2xl bg-[color:var(--forest-soft)]/55 p-4">
                  <Link href={`/events/${event.id}`} className="font-semibold text-[color:var(--navy)]">
                    {event.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">{[event.locationName, event.city].filter(Boolean).join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Public meetings</p>
              <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">Upcoming civic calendar</h2>
            </div>
            <Link href="/meetings" className="text-sm font-semibold text-[color:var(--forest)]">
              Meetings
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-slate-600">Upcoming meetings will appear here once they are added.</p>
            ) : data.upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{meeting.governmentBody}</p>
                <Link href={`/meetings/${meeting.id}`} className="mt-2 block font-semibold text-[color:var(--navy)]">
                  {meeting.title}
                </Link>
                <p className="mt-1 text-sm text-slate-600">{formatDateTimeRange(meeting.startDateTime, meeting.endDateTime)}</p>
                <p className="mt-1 text-sm text-slate-600">{[meeting.locationName, meeting.city].filter(Boolean).join(' · ')}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Volunteer &amp; community help</p>
              <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">Ways to pitch in</h2>
            </div>
            <Link href="/volunteer" className="text-sm font-semibold text-[color:var(--forest)]">
              Volunteer
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.volunteerOpportunities.length === 0 ? (
              <p className="text-sm text-slate-600">Volunteer opportunities will appear here once they are added.</p>
            ) : data.volunteerOpportunities.map((item) => (
              <div key={item.id} className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.organization}</p>
                <h3 className="mt-2 font-semibold text-[color:var(--navy)]">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Weekly digest</p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Subscribe for a weekly preview</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Choose a county, optional city, and a few interests. Email sending is stubbed for now, but subscriptions are stored and previewed in admin.
          </p>

          {subscribed ? (
            <div className="mt-4 rounded-2xl border border-[color:var(--forest)]/20 bg-[color:var(--forest-soft)] p-4 text-sm text-[color:var(--forest)]">
              Your digest preferences were saved.
            </div>
          ) : null}

          <form onSubmit={handleSubscribe} className="mt-5 grid gap-3">
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
            <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
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
            <button
              type="submit"
              disabled={subscribing}
              className="mt-2 rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)] disabled:opacity-60"
            >
              {subscribing ? 'Saving…' : 'Save digest preferences'}
            </button>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">How current is the site?</p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Built for local trust</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Source attribution</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Each listing points back to its original source so residents can verify details fast.
              </p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last scraper refresh</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{formatTimestamp(data.lastUpdatedAt)}</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Design approach</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Warm, mobile-first, easy to read, and built to feel more like a community center bulletin board than a campaign site.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
