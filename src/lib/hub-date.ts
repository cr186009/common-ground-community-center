export const COMMUNITY_TIME_ZONE = "America/New_York";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const dateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: COMMUNITY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getCommunityParts(value: Date): DateParts {
  const parts = Object.fromEntries(
    dateTimePartsFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(parts: Pick<DateParts, "year" | "month" | "day">) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function shiftDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function timeZoneOffsetMilliseconds(value: Date) {
  const parts = getCommunityParts(value);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return representedAsUtc - Math.floor(value.getTime() / 1000) * 1000;
}

/** Parse an HTML datetime-local value as local civil time in metro Atlanta. */
export function parseCommunityDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    throw new Error(`Invalid local date and time: ${value}`);
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  const civilAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const initial = new Date(civilAsUtc);
  const firstPass = new Date(civilAsUtc - timeZoneOffsetMilliseconds(initial));
  const result = new Date(civilAsUtc - timeZoneOffsetMilliseconds(firstPass));

  const resultParts = getCommunityParts(result);
  if (
    dateKey(resultParts) !== `${year}-${month}-${day}` ||
    resultParts.hour !== Number(hour) ||
    resultParts.minute !== Number(minute) ||
    resultParts.second !== Number(second)
  ) {
    throw new Error(`Invalid local date and time: ${value}`);
  }

  return result;
}

/** Parse source-supplied calendar fields that represent Eastern civil time. */
export function parseCommunityCivilDateTime(
  date: string,
  time = "00:00",
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) {
    throw new Error(`Invalid community civil date/time: ${date} ${time}`);
  }

  return parseCommunityDateTime(`${date}T${time}`);
}

/** Parse ISO-like source values, treating values without an offset as Eastern civil time. */
export function parseCommunitySourceDateTime(value: string) {
  const normalized = value.trim();
  const local = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?$/.exec(normalized);
  if (local) {
    return parseCommunityCivilDateTime(local[1], `${local[2] ?? "00:00"}:${local[3] ?? "00"}`);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid source date and time: ${value}`);
  }
  return parsed;
}

export function getCommunityDateKey(value: Date) {
  return dateKey(getCommunityParts(value));
}

export function startOfCommunityDay(value = new Date()) {
  return parseCommunityDateTime(`${getCommunityDateKey(value)}T00:00`);
}

export function endOfCommunityDay(value = new Date()) {
  const tomorrow = shiftDateKey(getCommunityDateKey(value), 1);
  return new Date(parseCommunityDateTime(`${tomorrow}T00:00`).getTime() - 1);
}

export function getCommunityWeekendRange(value = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: COMMUNITY_TIME_ZONE,
    weekday: "short",
  }).format(value);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const daysSinceFriday = (weekdayIndex + 2) % 7;
  const friday = shiftDateKey(getCommunityDateKey(value), -daysSinceFriday);
  const nextFriday = shiftDateKey(friday, 7);

  return {
    start: parseCommunityDateTime(`${friday}T00:00`),
    end: new Date(parseCommunityDateTime(`${nextFriday}T00:00`).getTime() - 1),
  };
}

export function formatCommunityDate(
  value: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: COMMUNITY_TIME_ZONE,
  }).format(value);
}

export function compactUtcDateTime(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function getTomorrowCommunityDateKey(value = new Date()) {
  return shiftDateKey(getCommunityDateKey(value), 1);
}
