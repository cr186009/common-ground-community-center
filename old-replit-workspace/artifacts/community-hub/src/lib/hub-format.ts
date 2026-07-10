import type { AlertSeverity, AlertType, Category, MeetingType, SourceSection, SourceType } from "@/types/hub";
import { format, isToday, isTomorrow } from "date-fns";

import {
  ALERT_SEVERITY_OPTIONS,
  ALERT_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  MEETING_TYPE_OPTIONS,
  SOURCE_SECTION_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/hub-constants";

// Accept `string` so generated API types (which are plain string) are compatible
export function getCategoryLabel(category: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? "Other";
}

export function getAlertTypeLabel(type: string) {
  return ALERT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Other";
}

export function getAlertSeverityLabel(severity: string) {
  return ALERT_SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ?? "Low";
}

export function getMeetingTypeLabel(type: string) {
  return MEETING_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Other";
}

export function getSourceTypeLabel(type: SourceType | string) {
  return SOURCE_TYPE_LABELS[type as SourceType] ?? type;
}

export function getSourceSectionLabel(section: SourceSection | string) {
  return SOURCE_SECTION_LABELS[section as SourceSection] ?? section;
}

// Accept string (ISO) or Date for API compatibility
export function formatDateTimeRange(start: string | Date, end?: string | Date | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const startDateStr = format(startDate, "EEE, MMM d");
  const startTime = format(startDate, "h:mm a");

  if (!endDate) {
    return `${startDateStr} at ${startTime}`;
  }

  const sameDay = format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");

  if (sameDay) {
    return `${startDateStr}, ${startTime} - ${format(endDate, "h:mm a")}`;
  }

  return `${startDateStr}, ${startTime} - ${format(endDate, "EEE, MMM d, h:mm a")}`;
}

export function formatFriendlyDate(value: string | Date) {
  const date = new Date(value);
  if (isToday(date)) {
    return `Today, ${format(date, "h:mm a")}`;
  }

  if (isTomorrow(date)) {
    return `Tomorrow, ${format(date, "h:mm a")}`;
  }

  return format(date, "EEEE, MMM d");
}

export function formatTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return "Not yet updated";
  }

  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
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
  start: string | Date;
  end?: string | Date | null;
}) {
  const startDate = new Date(input.start);
  const endDate = input.end ? new Date(input.end) : null;

  const start = format(startDate, "yyyyMMdd'T'HHmmss");
  const end = format(endDate ?? startDate, "yyyyMMdd'T'HHmmss");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.description || "",
    location: input.location || "",
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
