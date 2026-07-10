import { useSearch } from 'wouter';
import { useListVolunteer } from '@workspace/api-client-react';

import { CITY_FILTERS, COUNTY_FILTERS } from '@/lib/hub-constants';
import { formatDateTimeRange } from '@/lib/hub-format';

export default function VolunteerPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const city = params.get('city') || undefined;
  const county = params.get('county') || undefined;

  const { data: opportunities = [], isLoading } = useListVolunteer({
    ...(city ? { city } : {}),
    ...(county ? { county } : {}),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Volunteer &amp; community help</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Ways to help across nearby communities</h1>
        <p className="mt-2 text-sm text-slate-600">
          Food pantry needs, animal shelter support, donation drives, cleanup days, and other local ways to pitch in.
        </p>
      </section>

      <form className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-3">
        <select name="city" defaultValue={city ?? ''} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All cities</option>
          {CITY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <select name="county" defaultValue={county ?? ''} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All counties</option>
          {COUNTY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)] md:justify-self-end"
        >
          Apply filters
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--navy)] border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.length === 0 ? (
            <div className="col-span-full rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
              No volunteer opportunities matched the current filters.
            </div>
          ) : opportunities.map((item) => (
            <article key={item.id} className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.organization}</p>
              <h2 className="mt-3 font-serif text-2xl text-[color:var(--navy)]">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                {item.dateTime ? (
                  <div>
                    <dt className="font-semibold text-slate-500">When</dt>
                    <dd>{formatDateTimeRange(item.dateTime, null)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-semibold text-slate-500">Where</dt>
                  <dd>{[item.locationName, item.city, item.county].filter(Boolean).join(' · ') || 'Location not specified'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Contact</dt>
                  <dd>{[item.contactName, item.contactEmail].filter(Boolean).join(' · ') || 'See source for contact details'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
