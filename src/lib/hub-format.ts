import type {
  AlertSeverity,
  AlertType,
  Category,
  MeetingType,
  SourceSection,
  SourceType,
} from "@prisma/client";
import { isToday, isTomorrow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import {
  ALERT_SEVERITY_OPTIONS,
  ALERT_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  MEETING_TYPE_OPTIONS,
  SOURCE_SECTION_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/hub-constants";

const COMMUNITY_TIME_ZONE = "America/New_York";

function formatEastern(value: Date, pattern: string) {
  return formatInTimeZone(value, COMMUNITY_TIME_ZONE, pattern);
}

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

export function formatDateTimeRange(
  start: Date,
  end?: Date | null,
  isAllDay = false,
) {
  const startDate = formatEastern(start, "EEE, MMM d");

  if (isAllDay) {
    if (!end) {
      return `${startDate} · All day`;
    }

    const sameDay =
      formatEastern(start, "yyyy-MM-dd") === formatEastern(end, "yyyy-MM-dd");

    if (sameDay) {
      return `${startDate} · All day`;
    }

    return `${startDate} - ${formatEastern(end, "EEE, MMM d")} · All day`;
  }

  const startTime = formatEastern(start, "h:mm a");

  if (!end) {
    return `${startDate} at ${startTime}`;
  }

  const sameDay =
    formatEastern(start, "yyyy-MM-dd") === formatEastern(end, "yyyy-MM-dd");

  if (sameDay) {
    return `${startDate}, ${startTime} - ${formatEastern(end, "h:mm a")}`;
  }

  return `${startDate}, ${startTime} - ${formatEastern(
    end,
    "EEE, MMM d, h:mm a",
  )}`;
}

export function formatFriendlyDate(value: Date, isAllDay = false) {
  const easternDateString = formatEastern(value, "yyyy-MM-dd");
  const todayEasternString = formatEastern(new Date(), "yyyy-MM-dd");
  const tomorrowEasternString = formatEastern(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
    "yyyy-MM-dd",
  );

  if (easternDateString === todayEasternString) {
    return isAllDay
      ? "Today · All day"
      : `Today, ${formatEastern(value, "h:mm a")}`;
  }

  if (easternDateString === tomorrowEasternString) {
    return isAllDay
      ? "Tomorrow · All day"
      : `Tomorrow, ${formatEastern(value, "h:mm a")}`;
  }

  const formattedDate = formatEastern(value, "EEEE, MMM d");

  return isAllDay ? `${formattedDate} · All day` : formattedDate;
}

export function formatTimestamp(value: Date | null | undefined) {
  if (!value) {
    return "Update pending";
  }

  return formatEastern(value, "MMM d, yyyy 'at' h:mm a");
}

export function parseStoredList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
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
}) {
  const start = formatEastern(input.start, "yyyyMMdd'T'HHmmss");
  const end = formatEastern(input.end ?? input.start, "yyyyMMdd'T'HHmmss");

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
