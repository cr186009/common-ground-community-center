import type { AlertSeverity, AlertType, Category, MeetingType, SourceSection, SourceType } from "@prisma/client";
import { format, isToday, isTomorrow } from "date-fns";

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
  const startDate = format(start, "EEE, MMM d");
  const startTime = format(start, "h:mm a");

  if (!end) {
    return `${startDate} at ${startTime}`;
  }

  const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");

  if (sameDay) {
    return `${startDate}, ${startTime} - ${format(end, "h:mm a")}`;
  }

  return `${startDate}, ${startTime} - ${format(end, "EEE, MMM d, h:mm a")}`;
}

export function formatFriendlyDate(value: Date) {
  if (isToday(value)) {
    return `Today, ${format(value, "h:mm a")}`;
  }

  if (isTomorrow(value)) {
    return `Tomorrow, ${format(value, "h:mm a")}`;
  }

  return format(value, "EEEE, MMM d");
}

export function formatTimestamp(value: Date | null | undefined) {
  if (!value) {
    return "Not yet updated";
  }

  return format(value, "MMM d, yyyy 'at' h:mm a");
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
  const start = format(input.start, "yyyyMMdd'T'HHmmss");
  const end = format(input.end ?? input.start, "yyyyMMdd'T'HHmmss");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.description || "",
    location: input.location || "",
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
