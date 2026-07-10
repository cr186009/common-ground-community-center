import { useLocation, useSearch } from 'wouter';
import { format } from 'date-fns';
import { useListEvents, useListCalendarEvents } from '@workspace/api-client-react';

import { HubCalendarGrid } from '@/components/hub-calendar-grid';
import { HubEventCard } from '@/components/hub-event-card';
import { HubFilterForm } from '@/components/hub-filter-form';
import { formatTimestamp } from '@/lib/hub-format';
import { parsePublicFiltersFromUrl, getUpcomingMonthOptions, eventFiltersToParams } from '@/lib/hub-search';

export default function EventsPage() {
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
  const queryString = filterParams.toString();

  const { data: events = [], isLoading } = useListEvents(
    Object.fromEntries(filterParams) as Record<string, string>,
  );

  const calendarParams = new URLSearchParams({ month, ...(filters.city ? { city: filters.city } : {}), ...(filters.county ? { county: filters.county } : {}) });
  const { data: calendarEvents = [] } = useListCalendarEvents(
    Object.fromEntries(calendarParams) as Record<string, string>,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Events &amp; activities</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-serif text-4xl text-[color:var(--navy)]">Community events across nearby counties</h1>
            <p className="mt-2 text-sm text-slate-600">
              Search by keyword, filter by county or city, and switch between list and calendar views.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-600">{events.length} matching events</p>
        </div>
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
          {events.map((event) => (
            <HubEventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {!isLoading && events.length === 0 && view !== 'calendar' ? (
        <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
          No approved events matched the current filters. Try broadening the search or checking the activities page too.
        </div>
      ) : null}
    </div>
  );
}
