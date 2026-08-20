import { COMMUNITY_COORDINATES } from "@/lib/geographic-coverage";

export type EventMapSource = {
  id: string;
  title: string;
  city: string;
  county: string;
  locationName?: string | null;
  address?: string | null;
};

export type EventMapPoint = EventMapSource & {
  latitude: number;
  longitude: number;
  precision: "city-center";
  locationQuery: string;
};

export function buildEventLocationQuery(event: EventMapSource) {
  return [event.locationName, event.address, event.city, `${event.county} County`, "Georgia"]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Produces safe approximate pins without claiming venue-level accuracy. Exact
 * venue geocoding can replace these points later without a database migration.
 */
export function mapEventsToApproximatePoints(events: EventMapSource[]) {
  return events.flatMap<EventMapPoint>((event) => {
    const coordinates = COMMUNITY_COORDINATES[event.city.trim().toLocaleLowerCase("en-US")];
    if (!coordinates) return [];
    return [{
      ...event,
      ...coordinates,
      precision: "city-center",
      locationQuery: buildEventLocationQuery(event),
    }];
  });
}
