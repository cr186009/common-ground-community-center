import { format } from "date-fns";
import Link from "next/link";

import { HubCalendarGrid } from "@/components/hub-calendar-grid";
import { HubEventCard } from "@/components/hub-event-card";
import { EventMapPrototype } from "@/components/event-map-prototype";
import { HubFilterForm } from "@/components/hub-filter-form";
import { groupEventsForDisplay } from "@/lib/hub-event-grouping";
import { formatTimestamp } from "@/lib/hub-format";
import { mapEventsToApproximatePoints } from "@/lib/event-map";
import { buildSubmissionHref } from "@/lib/submission-context";
import {
  parsePublicFilters,
  readSearchParam,
  type SearchParamsRecord,
} from "@/lib/hub-search";
import {
  getEvents,
  getEventCatalogFreshness,
  getEventsForCalendar,
  getUpcomingMonthOptions,
} from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EventsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const filters = parsePublicFilters(params);
  const requestedView = readSearchParam(params, "view");
  const view = requestedView === "calendar" || requestedView === "map" ? requestedView : "list";

  const monthOptions = getUpcomingMonthOptions().map(
    (option) => ({
      value: option.value,
      label: format(option.date, "MMMM yyyy"),
    }),
  );

  const month =
    readSearchParam(params, "month") ||
    monthOptions[0].value;

  const [events, calendarEvents, catalogFreshness] =
    await Promise.all([
      getEvents(filters),
      getEventsForCalendar(filters, month),
      getEventCatalogFreshness(filters),
    ]);

  const groupedEvents = groupEventsForDisplay(events);
  const mapPoints = mapEventsToApproximatePoints(
    groupedEvents.map(({ event }) => event),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">
          Events & activities
        </p>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-serif text-4xl text-[color:var(--navy)]">
              Community events across nearby counties
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Search by keyword, filter by county or city,
              and switch between list, calendar, and map views. {" "}
              {catalogFreshness.status === "CURRENT" && catalogFreshness.asOf
                ? `Relevant sources current as of ${formatTimestamp(catalogFreshness.asOf)}.`
                : "Current source refresh information is temporarily unavailable; use each listing’s original-source link for the latest details."}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-600">
            {view === "calendar" || view === "map"
              ? `${events.length} matching event${events.length === 1 ? "" : "s"}`
              : `${groupedEvents.length} matching event${
                  groupedEvents.length === 1 ? "" : "s"
                }`}
          </p>
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

      {view === "map" ? (
        mapPoints.length > 0 ? (
          <EventMapPrototype points={mapPoints} />
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
            None of the matching events has a mappable community location yet. Try the List view for every result.
          </div>
        )
      ) : null}

      {view === "calendar" ? (
        <HubCalendarGrid
          events={calendarEvents}
          monthValue={month}
        />
      ) : view === "list" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupedEvents.map(
            ({ event, additionalOccurrences }) => (
              <HubEventCard
                key={event.id}
                event={event}
                additionalOccurrences={
                  additionalOccurrences
                }
              />
            ),
          )}
        </div>
      ) : null}

      {events.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8">
          <p className="text-sm text-slate-600">
            No approved events matched the current filters. Try broadening the
            search or checking the activities page too.
          </p>
          <p className="mt-4 text-sm font-medium text-[color:var(--navy)]">
            Something missing?{" "}
            <Link
              href={buildSubmissionHref({
                city: filters.city,
                county: filters.county,
                submissionType: "EVENT",
              })}
              className="underline decoration-[color:var(--amber)] decoration-2 underline-offset-4"
            >
              Submit an event for review.
            </Link>
          </p>
        </div>
      ) : null}

      {events.length > 0 && filters.county ? (
        <aside className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 text-sm text-slate-700">
          <span className="font-semibold text-[color:var(--navy)]">
            Something missing in {filters.county} County?
          </span>{" "}
          <Link
            href={buildSubmissionHref({
              city: filters.city,
              county: filters.county,
              submissionType: "EVENT",
            })}
            className="font-medium underline decoration-[color:var(--amber)] decoration-2 underline-offset-4"
          >
            Add it to the community review queue.
          </Link>
        </aside>
      ) : null}
    </div>
  );
}
