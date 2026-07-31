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

export function getCategoryLabel(category: Category) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? "Other";
}

export function getAlertTypeLabel(type: AlertType) {
  return ALERT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Other";
}

export function getAlertSeverityLabel(severity: AlertSeverity) {
  return ALERT_SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ?? "Low";
}

export function getMeetingTypeLabel(type: MeetingType) {
  return MEETING_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Other";
}

export function getSourceTypeLabel(type: SourceType) {
  return SOURCE_TYPE_LABELS[type];
}

export function getSourceSectionLabel(section: SourceSection) {
  return SOURCE_SECTION_LABELS[section];
}

export function formatDateTimeRange(start: Date, end?: Date | null) {
  const startDate = formatCommunityDate(start, { weekday: "short", month: "short", day: "numeric" });
  const startTime = formatCommunityDate(start, { hour: "numeric", minute: "2-digit" });

  if (!end) {
    return `${startDate} at ${startTime}`;
  }

  const sameDay = getCommunityDateKey(start) === getCommunityDateKey(end);

  if (sameDay) {
    return `${startDate}, ${startTime} - ${formatCommunityDate(end, { hour: "numeric", minute: "2-digit" })}`;
  }

  return `${startDate}, ${startTime} - ${formatCommunityDate(end, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export function formatFriendlyDate(value: Date, now = new Date()) {
  if (getCommunityDateKey(value) === getCommunityDateKey(now)) {
    return `Today, ${formatCommunityDate(value, { hour: "numeric", minute: "2-digit" })}`;
  }

  if (getCommunityDateKey(value) === getTomorrowCommunityDateKey(now)) {
    return `Tomorrow, ${formatCommunityDate(value, { hour: "numeric", minute: "2-digit" })}`;
  }

  return formatCommunityDate(value, { weekday: "long", month: "short", day: "numeric" });
}

export function formatTimestamp(value: Date | null | undefined) {
  if (!value) {
    return "Not yet updated";
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
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}

export function formatMoneyText(value: string | null | undefined, isFree?: boolean) {
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
  const start = compactUtcDateTime(input.start);
  const end = compactUtcDateTime(input.end ?? input.start);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.description || "",
    location: input.location || "",
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
