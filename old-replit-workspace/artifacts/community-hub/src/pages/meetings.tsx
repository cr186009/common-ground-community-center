import { useSearch } from 'wouter';
import { Link } from 'wouter';
import { useListMeetings } from '@workspace/api-client-react';

import { CITY_FILTERS, COUNTY_FILTERS, MEETING_TYPE_OPTIONS } from '@/lib/hub-constants';
import { formatDateTimeRange, getMeetingTypeLabel } from '@/lib/hub-format';
import { parseMeetingFiltersFromUrl } from '@/lib/hub-search';

export default function MeetingsPage() {
  const search = useSearch();
  const filters = parseMeetingFiltersFromUrl(search);

  const { data, isLoading } = useListMeetings({
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.county ? { county: filters.county } : {}),
    ...(filters.governmentBody ? { body: filters.governmentBody } : {}),
    ...(filters.meetingType ? { type: filters.meetingType } : {}),
  });

  const upcomingMeetings = data?.upcomingMeetings ?? [];
  const completedMeetings = data?.completedMeetings ?? [];
  const governmentBodies = data?.governmentBodies ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Transparency &amp; public meetings</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Government meetings in plain language</h1>
        <p className="mt-2 text-sm text-slate-600">
          Browse upcoming meetings, recent completed meetings, agenda links, and plain-English summaries when available.
        </p>
      </section>

      <form className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-4">
        <select name="body" defaultValue={filters.governmentBody ?? ''} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All government bodies</option>
          {governmentBodies.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
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
        <select name="type" defaultValue={filters.meetingType ?? ''} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All meeting types</option>
          {MEETING_TYPE_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)] md:col-span-4 md:justify-self-end"
        >
          Apply filters
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--navy)] border-t-transparent" />
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Upcoming</p>
              <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Public meetings ahead</h2>
            </div>
            {upcomingMeetings.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
                No upcoming meetings match the current filters.
              </div>
            ) : (
              <div className="grid gap-4">
                {upcomingMeetings.map((meeting) => (
                  <article key={meeting.id} className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span className="rounded-full bg-[color:var(--navy-soft)] px-3 py-1 text-[color:var(--navy)]">
                        {getMeetingTypeLabel(meeting.meetingType)}
                      </span>
                      <span className="rounded-full bg-stone-100 px-3 py-1">{meeting.governmentBody}</span>
                    </div>
                    <Link href={`/meetings/${meeting.id}`} className="mt-4 block font-serif text-2xl text-[color:var(--navy)]">
                      {meeting.title}
                    </Link>
                    <p className="mt-2 text-sm text-slate-600">{formatDateTimeRange(meeting.startDateTime, meeting.endDateTime)}</p>
                    <p className="mt-1 text-sm text-slate-600">{[meeting.locationName, meeting.city, meeting.county].filter(Boolean).join(' · ')}</p>
                    {meeting.plainEnglishSummary ? (
                      <p className="mt-4 text-sm leading-6 text-slate-700">{meeting.plainEnglishSummary}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Completed</p>
              <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Recent completed meetings</h2>
            </div>
            {completedMeetings.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
                No completed meetings to show.
              </div>
            ) : (
              <div className="grid gap-4">
                {completedMeetings.map((meeting) => (
                  <article key={meeting.id} className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
                    <Link href={`/meetings/${meeting.id}`} className="font-semibold text-[color:var(--navy)]">
                      {meeting.title}
                    </Link>
                    <p className="mt-2 text-sm text-slate-600">{meeting.governmentBody} · {formatDateTimeRange(meeting.startDateTime, meeting.endDateTime)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
