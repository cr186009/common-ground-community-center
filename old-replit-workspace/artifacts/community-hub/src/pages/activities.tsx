import { useSearch } from 'wouter';
import { format } from 'date-fns';
import { useListActivities, useListCalendarEvents } from '@workspace/api-client-react';

import { HubCalendarGrid } from '@/components/hub-calendar-grid';
import { HubEventCard } from '@/components/hub-event-card';
import { HubFilterForm } from '@/components/hub-filter-form';
import { parsePublicFiltersFromUrl, getUpcomingMonthOptions, eventFiltersToParams } from '@/lib/hub-search';

export default function ActivitiesPage() {
  const search = useSearch();
  const filters = parsePublicFiltersFromUrl(search);
  const params = new URLSearchParams(search);
  const view = params.get('view') || 'list';

  const monthOptions = getUpcomingMonthOptions().map((option) => ({
    value: option.value,
    label: format(option.date, 'MMMM yyyy'),
  }));
  const month = params.get('month') || monthOptions[0].value;

  const filterParams = eventFiltersToParams(filters);
  const { data: activities = [], isLoading } = useListActivities(
    Object.fromEntries(filterParams) as Record<string, string>,
  );

  const calendarParams = { month, activity: '1', ...(filters.city ? { city: filters.city } : {}), ...(filters.county ? { county: filters.county } : {}) };
  const { data: calendarEvents = [] } = useListCalendarEvents(calendarParams);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Activities</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Trivia, karaoke, live music, food nights, and family hangouts</h1>
        <p className="mt-2 text-sm text-slate-600">
          A lighter-weight view of local things to do, pulled from the same community data with activity-friendly categories.
        </p>
      </section>

      <HubFilterForm
        city={filters.city}
        county={filters.county}
        category={filters.category}
        query={filters.query}
        view={view}
        month={month}
        monthOptions={monthOptions}
        isFree={filters.isFree}
        isKidFriendly={filters.isKidFriendly}
        isOutdoor={filters.isOutdoor}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--navy)] border-t-transparent" />
        </div>
      ) : view === 'calendar' ? (
        <HubCalendarGrid events={calendarEvents} monthValue={month} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activities.length === 0 ? (
            <div className="col-span-full rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
              No activities matched the current filters.
            </div>
          ) : activities.map((event) => (
            <HubEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
