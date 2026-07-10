import { format } from "date-fns";

import { HubCalendarGrid } from "@/components/hub-calendar-grid";
import { HubEventCard } from "@/components/hub-event-card";
import { HubFilterForm } from "@/components/hub-filter-form";
import { formatTimestamp } from "@/lib/hub-format";
import { parsePublicFilters, readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import {
  getEvents,
  getEventsForCalendar,
  getLastUpdatedTimestamp,
  getUpcomingMonthOptions,
} from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parsePublicFilters(params);
  const view = readSearchParam(params, "view") || "list";
  const monthOptions = getUpcomingMonthOptions().map((option) => ({
    value: option.value,
    label: format(option.date, "MMMM yyyy"),
  }));
  const month = readSearchParam(params, "month") || monthOptions[0].value;

  const [events, calendarEvents, lastUpdatedAt] = await Promise.all([
    getEvents(filters),
    getEventsForCalendar(filters, month),
    getLastUpdatedTimestamp(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Events & activities</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-serif text-4xl text-[color:var(--navy)]">Community events across nearby counties</h1>
            <p className="mt-2 text-sm text-slate-600">
              Search by keyword, filter by county or city, and switch between list and calendar views. Last refreshed {formatTimestamp(lastUpdatedAt)}.
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

      {view === "calendar" ? (
        <HubCalendarGrid events={calendarEvents} monthValue={month} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <HubEventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
          No approved events matched the current filters. Try broadening the search or checking the activities page too.
        </div>
      ) : null}
    </div>
  );
}
