import type { AlertSeverity, AlertType, Category, MeetingType, SourceSection, SourceType } from "@prisma/client";
import {
  compactUtcDateTime,
  formatCommunityDate,
  getCommunityDateKey,
  getTomorrowCommunityDateKey,
} from "@/lib/hub-date";

import {
  ALERT_SEVERITY_OPTIONS,
  ALERT_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  MEETING_TYPE_OPTIONS,
  SOURCE_SECTION_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/hub-constants";

const COMMUNITY_TIME_ZONE = "America/New_York";

export function getCategoryLabel(category: Category) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    "Other"
  );
}

export function getAlertTypeLabel(type: AlertType) {
  return (
    ALERT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Other"
  );
}

export function getAlertSeverityLabel(severity: AlertSeverity) {
  return (
    ALERT_SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ??
    "Low"
  );
}

export function getMeetingTypeLabel(type: MeetingType) {
  return (
    MEETING_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    "Other"
  );
}

export function getSourceTypeLabel(type: SourceType) {
  return SOURCE_TYPE_LABELS[type];
}

export function getSourceSectionLabel(section: SourceSection) {
  return SOURCE_SECTION_LABELS[section];
}

export function formatDateTimeRange(start: Date, end?: Date | null, isAllDay = false) {
  const startDate = formatCommunityDate(start, { weekday: "short", month: "short", day: "numeric" });
  if (isAllDay) {
    if (!end || getCommunityDateKey(start) === getCommunityDateKey(end)) return `${startDate} · All day`;
    return `${startDate} - ${formatCommunityDate(end, { weekday: "short", month: "short", day: "numeric" })} · All day`;
  }
  const startTime = formatCommunityDate(start, { hour: "numeric", minute: "2-digit" });

  if (!end || end.getTime() <= start.getTime()) {
    return `${startDate} at ${startTime}`;
  }

  const sameDay = getCommunityDateKey(start) === getCommunityDateKey(end);

  if (sameDay) {
    return `${startDate}, ${startTime} - ${formatCommunityDate(end, { hour: "numeric", minute: "2-digit" })}`;
  }

  return `${startDate}, ${startTime} - ${formatCommunityDate(end, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export function formatFriendlyDate(value: Date, isAllDay = false, now = new Date()) {
  if (getCommunityDateKey(value) === getCommunityDateKey(now)) {
    return isAllDay ? "Today · All day" : `Today, ${formatCommunityDate(value, { hour: "numeric", minute: "2-digit" })}`;
  }

  if (getCommunityDateKey(value) === getTomorrowCommunityDateKey(now)) {
    return isAllDay ? "Tomorrow · All day" : `Tomorrow, ${formatCommunityDate(value, { hour: "numeric", minute: "2-digit" })}`;
  }

  const date = formatCommunityDate(value, { weekday: "long", month: "short", day: "numeric" });
  return isAllDay ? `${date} · All day` : date;
}

export function formatTimestamp(value: Date | null | undefined) {
  if (!value) {
    return "Update pending";
  }

  const date = formatCommunityDate(value, { month: "short", day: "numeric", year: "numeric" });
  const time = formatCommunityDate(value, { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

export function parseStoredList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) return [];
    return normalizeStoredList(parsed.map((entry) => String(entry)));
  } catch {
    return normalizeStoredList(
      value
      .split(",")
      .map((entry) => entry),
    );
  }
}

function normalizeStoredList(entries: string[]) {
  const seen = new Set<string>();
  return entries
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter((entry) => {
      if (!entry) return false;
      const key = entry.toLocaleLowerCase("en-US");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function formatMoneyText(
  value: string | null | undefined,
  isFree?: boolean,
) {
  if (isFree) {
    return "Free";
  }

  return value?.trim() || "Check source for pricing";
}

export function createCalendarUrl(input: {
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date | null;
  isAllDay?: boolean;
}) {
  const start = input.isAllDay
    ? getCommunityDateKey(input.start).replace(/-/g, "")
    : compactUtcDateTime(input.start);
  // Calendar providers expect a real interval. Source feeds frequently omit an
  // end time (or repeat the start time), so use a conservative one-hour default.
  const providedEnd = input.end;
  const effectiveEnd = providedEnd && providedEnd.getTime() > input.start.getTime()
    ? providedEnd
    : new Date(input.start.getTime() + 60 * 60 * 1000);
  const end = input.isAllDay
    ? (providedEnd && getCommunityDateKey(providedEnd) > getCommunityDateKey(input.start)
      ? getCommunityDateKey(providedEnd)
      : getTomorrowCommunityDateKey(input.start)).replace(/-/g, "")
    : compactUtcDateTime(effectiveEnd);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.description || "",
    location: input.location || "",
    dates: `${start}/${end}`,
    ctz: COMMUNITY_TIME_ZONE,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
