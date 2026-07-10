import type { AlertType, Category, MeetingType, SourceType } from "@/types/hub";

const CATEGORY_VALUES = new Set([
  "FAMILY", "PARKS_RECREATION", "FESTIVAL", "MUSIC", "TRIVIA", "KARAOKE",
  "FOOD_DRINK", "SPORTS", "LIBRARY", "GOVERNMENT_MEETING", "VOLUNTEER", "SCHOOL", "OTHER",
]);

const ALERT_TYPE_VALUES = new Set([
  "ROAD_CLOSURE", "TRAFFIC", "SEVERE_WEATHER", "MISSING_PERSON", "PUBLIC_SAFETY",
  "UTILITY_OUTAGE", "BOIL_WATER_ADVISORY", "SCHOOL_CLOSURE", "SCAM_WARNING",
  "EMERGENCY_NOTICE", "OTHER",
]);

const MEETING_TYPE_VALUES = new Set([
  "CITY_COUNCIL", "COUNTY_COMMISSION", "SCHOOL_BOARD", "PLANNING_ZONING",
  "PUBLIC_HEARING", "PARKS_BOARD", "OTHER",
]);

const SOURCE_TYPE_VALUES = new Set([
  "WEBSITE", "CALENDAR", "FACEBOOK", "MANUAL", "GOVERNMENT",
  "RECREATION", "RESTAURANT", "MUSIC_VENUE", "POLICE", "SHERIFF",
]);

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

// Build URL search params from filter objects for use with the API
export function eventFiltersToParams(filters: PublicEventFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.city) params.set("city", filters.city);
  if (filters.county) params.set("county", filters.county);
  if (filters.category) params.set("category", filters.category);
  if (filters.isFree) params.set("free", "1");
  if (filters.isKidFriendly) params.set("kids", "1");
  if (filters.isOutdoor) params.set("outdoor", "1");
  if (filters.dateFrom) params.set("from", filters.dateFrom.toISOString());
  if (filters.dateTo) params.set("to", filters.dateTo.toISOString());
  if (filters.sort) params.set("sort", filters.sort);
  return params;
}

export function alertFiltersToParams(filters: AlertFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.county) params.set("county", filters.county);
  if (filters.alertType) params.set("type", filters.alertType);
  return params;
}

export function meetingFiltersToParams(filters: MeetingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.county) params.set("county", filters.county);
  if (filters.governmentBody) params.set("body", filters.governmentBody);
  if (filters.meetingType) params.set("type", filters.meetingType);
  return params;
}

// Parse URL search params from the browser URL
function getParam(params: URLSearchParams, key: string): string | undefined {
  return params.get(key) ?? undefined;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
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

export function parsePublicFiltersFromUrl(search: string): PublicEventFilters {
  const params = new URLSearchParams(search);
  return {
    city: getParam(params, "city"),
    county: getParam(params, "county"),
    category: parseCategory(getParam(params, "category")),
    query: getParam(params, "query"),
    isFree: parseBoolean(getParam(params, "free")),
    isKidFriendly: parseBoolean(getParam(params, "kids")),
    isOutdoor: parseBoolean(getParam(params, "outdoor")),
    dateFrom: parseDate(getParam(params, "from")),
    dateTo: parseDate(getParam(params, "to")),
    sort: getParam(params, "sort") === "desc" ? "desc" : "asc",
  };
}

export function parseAlertFiltersFromUrl(search: string): AlertFilters {
  const params = new URLSearchParams(search);
  return {
    city: getParam(params, "city"),
    county: getParam(params, "county"),
    alertType: parseAlertType(getParam(params, "type")),
  };
}

export function parseMeetingFiltersFromUrl(search: string): MeetingFilters {
  const params = new URLSearchParams(search);
  return {
    city: getParam(params, "city"),
    county: getParam(params, "county"),
    governmentBody: getParam(params, "body"),
    meetingType: parseMeetingType(getParam(params, "type")),
  };
}

export function parseGlobalSearchFiltersFromUrl(search: string): GlobalSearchFilters {
  const params = new URLSearchParams(search);
  return {
    query: getParam(params, "query"),
    city: getParam(params, "city"),
    county: getParam(params, "county"),
    sourceType: parseSourceType(getParam(params, "sourceType")),
    dateFrom: parseDate(getParam(params, "from")),
    dateTo: parseDate(getParam(params, "to")),
    category: parseCategory(getParam(params, "category")),
    isFree: parseBoolean(getParam(params, "free")),
    isKidFriendly: parseBoolean(getParam(params, "kids")),
  };
}

export function getUpcomingMonthOptions() {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() + index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, date };
  });
}
