import type {
  NormalizedScrapedAlert,
  NormalizedScrapedEvent,
} from "@/server/hub-scrapers/types";

const GENERIC_EVENT_TITLES = new Set([
  "calendar",
  "community calendar",
  "event",
  "events",
  "event calendar",
]);

export function isValidScrapedDate(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function validateScrapedEvent(event: NormalizedScrapedEvent) {
  const title = event.title?.trim();
  if (!title) throw new Error("Event is missing a title.");

  if (GENERIC_EVENT_TITLES.has(title.toLocaleLowerCase())) {
    throw new Error(
      `Event title "${title}" is a generic calendar label, not an event name.`,
    );
  }

  if (!isValidScrapedDate(event.startDateTime)) {
    throw new Error(`Event "${title}" has an invalid start date.`);
  }

  if (
    event.endDateTime &&
    (!isValidScrapedDate(event.endDateTime) ||
      event.endDateTime < event.startDateTime)
  ) {
    throw new Error(`Event "${title}" has an invalid end date.`);
  }

  if (!event.city?.trim()) throw new Error(`Event "${title}" is missing a city.`);
  if (!event.county?.trim()) throw new Error(`Event "${title}" is missing a county.`);
  if (!event.sourceUrl?.trim()) {
    throw new Error(`Event "${title}" is missing a source URL.`);
  }
}

export function validateScrapedAlert(alert: NormalizedScrapedAlert) {
  const title = alert.title?.trim();
  if (!title) throw new Error("Alert is missing a title.");
  if (!alert.county?.trim()) throw new Error(`Alert "${title}" is missing a county.`);
  if (!alert.sourceUrl?.trim()) {
    throw new Error(`Alert "${title}" is missing a source URL.`);
  }
  if (alert.startsAt && !isValidScrapedDate(alert.startsAt)) {
    throw new Error(`Alert "${title}" has an invalid start date.`);
  }
  if (alert.expiresAt && !isValidScrapedDate(alert.expiresAt)) {
    throw new Error(`Alert "${title}" has an invalid expiration date.`);
  }
}
