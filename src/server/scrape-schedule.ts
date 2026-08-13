const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type ScheduledSource = {
  id: string;
  name: string;
  scrapeFrequency: string | null;
  lastAttemptAt: Date | null;
  nextUpcomingEventAt?: Date | null;
};

export type SourceDueReason =
  | "NEVER_ATTEMPTED"
  | "FREQUENCY_DUE"
  | "UPCOMING_EVENT_REVALIDATION";

export type SourceScheduleDecision = {
  due: boolean;
  reason: SourceDueReason | null;
  dueAt: Date;
  intervalMs: number;
};

/**
 * Convert the human-readable frequency stored on Source into an enforceable
 * interval. Unknown/blank values deliberately fall back to daily so an active
 * automated source cannot silently stop running.
 */
export function scrapeIntervalMs(frequency: string | null | undefined) {
  const value = (frequency ?? "").trim().toLowerCase();
  const numeric = value.match(/^(\d+)\s*(hour|day|week|month)s?$/);

  if (numeric) {
    const amount = Number(numeric[1]);
    const unit = numeric[2];
    if (unit === "hour") return amount * HOUR_MS;
    if (unit === "day") return amount * DAY_MS;
    if (unit === "week") return amount * 7 * DAY_MS;
    return amount * 30 * DAY_MS;
  }

  if (value.includes("hour")) return HOUR_MS;
  if (value.includes("week")) return 7 * DAY_MS;
  if (value.includes("month")) return 30 * DAY_MS;
  return DAY_MS;
}

/** Upcoming events are refreshed more often as their start approaches. */
export function revalidationIntervalMs(
  eventStart: Date | null | undefined,
  now: Date,
) {
  if (!eventStart) return null;
  const untilStart = eventStart.getTime() - now.getTime();
  if (untilStart < 0 || untilStart > 7 * DAY_MS) return null;
  if (untilStart <= 12 * HOUR_MS) return 3 * HOUR_MS;
  if (untilStart <= 48 * HOUR_MS) return 12 * HOUR_MS;
  return DAY_MS;
}

export function getSourceScheduleDecision(
  source: ScheduledSource,
  now = new Date(),
): SourceScheduleDecision {
  const normalInterval = scrapeIntervalMs(source.scrapeFrequency);
  const revalidationInterval = revalidationIntervalMs(
    source.nextUpcomingEventAt,
    now,
  );
  const intervalMs = Math.min(normalInterval, revalidationInterval ?? Infinity);

  if (!source.lastAttemptAt) {
    return {
      due: true,
      reason: "NEVER_ATTEMPTED",
      dueAt: now,
      intervalMs,
    };
  }

  const dueAt = new Date(source.lastAttemptAt.getTime() + intervalMs);
  const due = dueAt <= now;
  const reason = !due
    ? null
    : revalidationInterval !== null && revalidationInterval < normalInterval
      ? "UPCOMING_EVENT_REVALIDATION"
      : "FREQUENCY_DUE";

  return { due, reason, dueAt, intervalMs };
}

export function selectDueSources(sources: ScheduledSource[], now = new Date()) {
  return sources
    .map((source) => ({ source, schedule: getSourceScheduleDecision(source, now) }))
    .filter(({ schedule }) => schedule.due)
    .sort((first, second) =>
      first.schedule.dueAt.getTime() - second.schedule.dueAt.getTime(),
    );
}
