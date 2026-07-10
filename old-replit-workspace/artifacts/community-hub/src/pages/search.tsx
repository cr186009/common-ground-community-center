import { useSearch } from 'wouter';
import { Link } from 'wouter';
import { useGlobalSearch } from '@workspace/api-client-react';

import { CATEGORY_OPTIONS, CITY_FILTERS, COUNTY_FILTERS } from '@/lib/hub-constants';
import { formatDateTimeRange, getAlertTypeLabel } from '@/lib/hub-format';
import { parseGlobalSearchFiltersFromUrl } from '@/lib/hub-search';

export default function SearchPage() {
  const search = useSearch();
  const filters = parseGlobalSearchFiltersFromUrl(search);

  const { data, isLoading } = useGlobalSearch({
    ...(filters.query ? { query: filters.query } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.county ? { county: filters.county } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.isFree ? { free: '1' } : {}),
    ...(filters.isKidFriendly ? { kids: '1' } : {}),
  });

  const events = data?.events ?? [];
  const alerts = data?.alerts ?? [];
  const meetings = data?.meetings ?? [];
  const volunteer = data?.volunteer ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Global search</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Search the whole community center</h1>
        <p className="mt-2 text-sm text-slate-600">Find events, alerts, meetings, and volunteer opportunities in one place.</p>
      </section>

      <form className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-3">
        <input
          name="query"
          defaultValue={filters.query}
          placeholder="Search all sections..."
          className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-3"
        />
        <select name="city" defaultValue={filters.city ?? ''} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All cities</option>
          {CITY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <select name="county" defaultValue={filters.county ?? ''} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All counties</option>
          {COUNTY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <select name="category" defaultValue={filters.category ?? ''} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All event categories</option>
          {CATEGORY_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)] md:col-span-3 md:justify-self-end"
        >
          Search
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--navy)] border-t-transparent" />
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Events &amp; activities</h2>
            <div className="mt-4 space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-slate-600">No events found.</p>
              ) : events.map((event) => (
                <div key={event.id} className="rounded-2xl bg-stone-50 p-4">
                  <Link href={`/events/${event.id}`} className="font-semibold text-[color:var(--navy)]">{event.title}</Link>
                  <p className="mt-1 text-sm text-slate-600">{formatDateTimeRange(event.startDateTime, event.endDateTime)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Alerts</h2>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-600">No alerts found.</p>
              ) : alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl bg-stone-50 p-4">
                  <p className="font-semibold text-[color:var(--navy)]">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{getAlertTypeLabel(alert.alertType)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Meetings</h2>
            <div className="mt-4 space-y-3">
              {meetings.length === 0 ? (
                <p className="text-sm text-slate-600">No meetings found.</p>
              ) : meetings.map((meeting) => (
                <div key={meeting.id} className="rounded-2xl bg-stone-50 p-4">
                  <Link href={`/meetings/${meeting.id}`} className="font-semibold text-[color:var(--navy)]">{meeting.title}</Link>
                  <p className="mt-1 text-sm text-slate-600">{meeting.governmentBody}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Volunteer</h2>
            <div className="mt-4 space-y-3">
              {volunteer.length === 0 ? (
                <p className="text-sm text-slate-600">No volunteer opportunities found.</p>
              ) : volunteer.map((item) => (
                <div key={item.id} className="rounded-2xl bg-stone-50 p-4">
                  <p className="font-semibold text-[color:var(--navy)]">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.organization}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
