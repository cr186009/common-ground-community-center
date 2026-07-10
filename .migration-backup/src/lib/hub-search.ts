import type { AlertType, Category, MeetingType, SourceType } from "@prisma/client";

const CATEGORY_VALUES = new Set([
  "FAMILY",
  "PARKS_RECREATION",
  "FESTIVAL",
  "MUSIC",
  "TRIVIA",
  "KARAOKE",
  "FOOD_DRINK",
  "SPORTS",
  "LIBRARY",
  "GOVERNMENT_MEETING",
  "VOLUNTEER",
  "SCHOOL",
  "OTHER",
]);

const ALERT_TYPE_VALUES = new Set([
  "ROAD_CLOSURE",
  "TRAFFIC",
  "SEVERE_WEATHER",
  "MISSING_PERSON",
  "PUBLIC_SAFETY",
  "UTILITY_OUTAGE",
  "BOIL_WATER_ADVISORY",
  "SCHOOL_CLOSURE",
  "SCAM_WARNING",
  "EMERGENCY_NOTICE",
  "OTHER",
]);

const MEETING_TYPE_VALUES = new Set([
  "CITY_COUNCIL",
  "COUNTY_COMMISSION",
  "SCHOOL_BOARD",
  "PLANNING_ZONING",
  "PUBLIC_HEARING",
  "PARKS_BOARD",
  "OTHER",
]);

const SOURCE_TYPE_VALUES = new Set([
  "WEBSITE",
  "CALENDAR",
  "FACEBOOK",
  "MANUAL",
  "GOVERNMENT",
  "RECREATION",
  "RESTAURANT",
  "MUSIC_VENUE",
  "POLICE",
  "SHERIFF",
]);

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type PublicEventFilters = {
  city?: string;
  county?: string;
  category?: Category;
  query?: string;
  isFree?: boolean;
  isKidFriendly?: boolean;
  isOutdoor?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: "asc" | "desc";
};

export type AlertFilters = {
  city?: string;
  county?: string;
  alertType?: AlertType;
};

export type MeetingFilters = {
  city?: string;
  county?: string;
  governmentBody?: string;
  meetingType?: MeetingType;
};

export type GlobalSearchFilters = {
  query?: string;
  city?: string;
  county?: string;
  sourceType?: SourceType;
  dateFrom?: Date;
  dateTo?: Date;
  category?: Category;
  isFree?: boolean;
  isKidFriendly?: boolean;
};

export function readSearchParam(params: SearchParamsRecord, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseBoolean(value: string | undefined) {
  return value === "1" || value === "true" ? true : undefined;
}

function parseCategory(value: string | undefined) {
  return value && CATEGORY_VALUES.has(value) ? (value as Category) : undefined;
}

function parseAlertType(value: string | undefined) {
  return value && ALERT_TYPE_VALUES.has(value) ? (value as AlertType) : undefined;
}

function parseMeetingType(value: string | undefined) {
  return value && MEETING_TYPE_VALUES.has(value) ? (value as MeetingType) : undefined;
}

function parseSourceType(value: string | undefined) {
  return value && SOURCE_TYPE_VALUES.has(value) ? (value as SourceType) : undefined;
}

export function parsePublicFilters(params: SearchParamsRecord): PublicEventFilters {
  return {
    city: readSearchParam(params, "city") || undefined,
    county: readSearchParam(params, "county") || undefined,
    category: parseCategory(readSearchParam(params, "category")),
    query: readSearchParam(params, "query") || undefined,
    isFree: parseBoolean(readSearchParam(params, "free")),
    isKidFriendly: parseBoolean(readSearchParam(params, "kids")),
    isOutdoor: parseBoolean(readSearchParam(params, "outdoor")),
    dateFrom: parseDate(readSearchParam(params, "from")),
    dateTo: parseDate(readSearchParam(params, "to")),
    sort: readSearchParam(params, "sort") === "desc" ? "desc" : "asc",
  };
}

export function parseAlertFilters(params: SearchParamsRecord): AlertFilters {
  return {
    city: readSearchParam(params, "city") || undefined,
    county: readSearchParam(params, "county") || undefined,
    alertType: parseAlertType(readSearchParam(params, "type")),
  };
}

export function parseMeetingFilters(params: SearchParamsRecord): MeetingFilters {
  return {
    city: readSearchParam(params, "city") || undefined,
    county: readSearchParam(params, "county") || undefined,
    governmentBody: readSearchParam(params, "body") || undefined,
    meetingType: parseMeetingType(readSearchParam(params, "type")),
  };
}

export function parseGlobalSearchFilters(params: SearchParamsRecord): GlobalSearchFilters {
  return {
    query: readSearchParam(params, "query") || undefined,
    city: readSearchParam(params, "city") || undefined,
    county: readSearchParam(params, "county") || undefined,
    sourceType: parseSourceType(readSearchParam(params, "sourceType")),
    dateFrom: parseDate(readSearchParam(params, "from")),
    dateTo: parseDate(readSearchParam(params, "to")),
    category: parseCategory(readSearchParam(params, "category")),
    isFree: parseBoolean(readSearchParam(params, "free")),
    isKidFriendly: parseBoolean(readSearchParam(params, "kids")),
  };
}
