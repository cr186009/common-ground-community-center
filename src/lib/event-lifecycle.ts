import {
  endOfCommunityDay,
  startOfCommunityDay,
} from "@/lib/hub-date";

export const EVENT_MISSING_END_FALLBACK_HOURS = 3;

export type EventLifecycleInput = {
  startDateTime: Date;
  endDateTime?: Date | null;
  isAllDay?: boolean;
};

/**
 * Public event lifecycle policy:
 * - a trustworthy end after the start is authoritative;
 * - an all-day event without a trustworthy end remains current through the
 *   end of its start day in the community timezone;
 * - a timed event without a trustworthy end receives a three-hour fallback.
 *
 * Treating zero/backwards ends as missing prevents corrupt source data from
 * making an event disappear before it has reasonably finished.
 */
export function getEventEffectiveEnd(event: EventLifecycleInput) {
  if (
    event.endDateTime &&
    event.endDateTime.getTime() > event.startDateTime.getTime()
  ) {
    return event.endDateTime;
  }

  if (event.isAllDay) {
    return endOfCommunityDay(event.startDateTime);
  }

  return new Date(
    event.startDateTime.getTime() +
      EVENT_MISSING_END_FALLBACK_HOURS * 60 * 60 * 1000,
  );
}

export function isEventInPublicRange(
  event: EventLifecycleInput,
  rangeStart: Date,
  rangeEnd?: Date,
) {
  return (
    getEventEffectiveEnd(event).getTime() >= rangeStart.getTime() &&
    (!rangeEnd || event.startDateTime.getTime() <= rangeEnd.getTime())
  );
}

/**
 * A deliberately broad database cutoff used before the exact in-memory
 * lifecycle check. It includes timed fallback events spanning midnight and
 * same-day all-day events, while avoiding an unbounded scan.
 */
export function getEventLifecycleCandidateStart(rangeStart: Date) {
  const timedFallbackStart = new Date(
    rangeStart.getTime() -
      EVENT_MISSING_END_FALLBACK_HOURS * 60 * 60 * 1000,
  );
  const communityDayStart = startOfCommunityDay(rangeStart);

  return timedFallbackStart < communityDayStart
    ? timedFallbackStart
    : communityDayStart;
}
