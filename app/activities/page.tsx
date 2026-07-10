import { format } from "date-fns";

import { HubCalendarGrid } from "@/components/hub-calendar-grid";
import { HubEventCard } from "@/components/hub-event-card";
import { HubFilterForm } from "@/components/hub-filter-form";
import { parsePublicFilters, readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import { getActivities, getEventsForCalendar, getUpcomingMonthOptions } from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parsePublicFilters(params);
  const view = readSearchParam(params, "view") || "list";
  const monthOptions = getUpcomingMonthOptions().map((option) => ({
    value: option.value,
    label: format(option.date, "MMMM yyyy"),
  }));
  const month = readSearchParam(params, "month") || monthOptions[0].value;

  const [activities, calendarEvents] = await Promise.all([
    getActivities(filters),
    getEventsForCalendar(filters, month, true),
  ]);

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

      {view === "calendar" ? (
        <HubCalendarGrid events={calendarEvents} monthValue={month} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activities.map((event) => (
            <HubEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
