import { Link, useParams } from 'wouter';
import { useGetEvent } from '@workspace/api-client-react';

import {
  createCalendarUrl,
  formatDateTimeRange,
  formatMoneyText,
  getCategoryLabel,
  parseStoredList,
} from '@/lib/hub-format';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, isError } = useGetEvent(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--navy)] border-t-transparent" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="space-y-4 text-center py-20">
        <p className="font-serif text-2xl text-[color:var(--navy)]">Event not found</p>
        <Link href="/events" className="text-sm text-[color:var(--forest)] hover:underline">
          ← Back to events
        </Link>
      </div>
    );
  }

  const tags = parseStoredList(event.tags);

  return (
    <article className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--line)] bg-white p-8 shadow-[0_30px_85px_-45px_rgba(20,44,68,0.48)]">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="rounded-full bg-[color:var(--navy-soft)] px-3 py-1 text-[color:var(--navy)]">
            {getCategoryLabel(event.category)}
          </span>
          {event.city ? <span className="rounded-full bg-stone-100 px-3 py-1">{event.city}</span> : null}
          {event.county ? <span className="rounded-full bg-stone-100 px-3 py-1">{event.county}</span> : null}
          {event.isOutdoor ? <span className="rounded-full bg-stone-100 px-3 py-1">Outdoor</span> : null}
        </div>
        <h1 className="mt-5 font-serif text-4xl text-[color:var(--navy)]">{event.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          {event.description || 'This listing was imported with limited detail. Use the original source link for the latest information.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={createCalendarUrl({
              title: event.title,
              description: event.description,
              location: [event.locationName, event.address, event.city].filter(Boolean).join(', '),
              start: event.startDateTime,
              end: event.endDateTime,
            })}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)]"
          >
            Add to calendar
          </a>
          {(event.originalUrl || event.sourceUrl) ? (
            <a
              href={event.originalUrl || event.sourceUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--forest)] hover:text-[color:var(--forest)]"
            >
              View original source
            </a>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Event details</h2>
          <dl className="mt-5 grid gap-5 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">Date and time</dt>
              <dd className="mt-1 text-slate-800">{formatDateTimeRange(event.startDateTime, event.endDateTime)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Location</dt>
              <dd className="mt-1 text-slate-800">
                {[event.locationName, event.address, event.city, event.county].filter(Boolean).join(' · ')}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Cost</dt>
              <dd className="mt-1 text-slate-800">{formatMoneyText(event.cost, event.isFree)}</dd>
            </div>
            {event.sourceName ? (
              <div>
                <dt className="font-semibold text-slate-500">Source attribution</dt>
                <dd className="mt-1 text-slate-800">{event.sourceName}</dd>
              </div>
            ) : null}
            {tags.length > 0 ? (
              <div>
                <dt className="font-semibold text-slate-500">Tags</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--forest-soft)] p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Family and access notes</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>{event.isKidFriendly ? 'Kid-friendly event.' : 'Check the organizer details for age-specific guidance.'}</li>
              <li>{event.isOutdoor ? 'Outdoor setting, so weather may affect timing.' : 'Indoor or unspecified location.'}</li>
              <li>{event.isFree ? 'Free to attend.' : 'Pricing varies; the source link may include ticket details.'}</li>
            </ul>
          </div>
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Why source links matter</h2>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              This site keeps the original source visible so residents can double-check event timing, sign-up instructions, parking notes, and last-minute changes.
            </p>
          </div>
        </aside>
      </section>
    </article>
  );
}
