import type { Event } from "@prisma/client";

export type GroupedEvent = {
  event: Event;
  additionalOccurrences: Event[];
};

export type EventDiscoveryCounts = {
  eventSeries: number;
  upcomingDates: number;
};

function normalizeGroupingText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSource(event: Event) {
  const eventWithSource = event as Event & {
    sourceId?: string | null;
    sourceUrl?: string | null;
  };

  return normalizeGroupingText(
    eventWithSource.sourceId ||
      eventWithSource.sourceUrl ||
      "",
  );
}

function createEventGroupingKey(event: Event) {
  const title = normalizeGroupingText(event.title);
  const source = normalizeSource(event);
  const location = normalizeGroupingText(event.locationName);
  const address = normalizeGroupingText(event.address);
  const city = normalizeGroupingText(event.city);
  const county = normalizeGroupingText(event.county);

  return [
    title,
    source,
    location,
    address,
    city,
    county,
  ].join("|");
}

function createOccurrenceKey(event: Event) {
  return [
    event.startDateTime.getTime(),
    event.endDateTime?.getTime() ?? "",
    normalizeGroupingText(event.locationName),
    normalizeGroupingText(event.address),
  ].join("|");
}

function sortEventsByDate(events: Event[]) {
  return [...events].sort(
    (first, second) =>
      first.startDateTime.getTime() -
      second.startDateTime.getTime(),
  );
}

export function groupEventsForDisplay(
  events: Event[],
): GroupedEvent[] {
  const groupedEvents = new Map<string, Event[]>();

  for (const event of events) {
    const groupingKey = createEventGroupingKey(event);
    const existingGroup = groupedEvents.get(groupingKey);

    if (existingGroup) {
      existingGroup.push(event);
    } else {
      groupedEvents.set(groupingKey, [event]);
    }
  }

  const results: GroupedEvent[] = [];

  for (const group of groupedEvents.values()) {
    const sortedGroup = sortEventsByDate(group);

    /*
     * Avoid showing the exact same date and time more than once
     * when duplicate database records exist.
     */
    const uniqueOccurrences = sortedGroup.filter(
      (event, index, allEvents) => {
        const occurrenceKey = createOccurrenceKey(event);

        return (
          allEvents.findIndex(
            (candidate) =>
              createOccurrenceKey(candidate) === occurrenceKey,
          ) === index
        );
      },
    );

    const [event, ...additionalOccurrences] =
      uniqueOccurrences;

    if (!event) {
      continue;
    }

    results.push({
      event,
      additionalOccurrences,
    });
  }

  return results.sort(
    (first, second) =>
      first.event.startDateTime.getTime() -
      second.event.startDateTime.getTime(),
  );
}

export function countEventDiscoveryResults(
  events: Event[],
): EventDiscoveryCounts {
  return {
    eventSeries: groupEventsForDisplay(events).length,
    upcomingDates: events.length,
  };
}
