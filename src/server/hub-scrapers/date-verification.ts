import type { DateVerificationStatus } from "@prisma/client";

import { getCommunityDateKey } from "@/lib/hub-date";
import type { NormalizedScrapedEvent } from "@/server/hub-scrapers/types";

export type VerificationEvidenceKind =
  | "listing"
  | "structured"
  | "url"
  | "title"
  | "description"
  | "recurrence"
  | "status";

export type VerificationEvidence = {
  kind: VerificationEvidenceKind;
  raw: string;
  value: string | null;
  issue?: string;
};

export type FieldVerificationResult = {
  status: DateVerificationStatus;
  reason: string | null;
  evidence: VerificationEvidence[];
  verifiedAt: Date | null;
};

export type EventDateTimeVerificationResult = {
  date: FieldVerificationResult;
  time: FieldVerificationResult;
  hardConflict: boolean;
  sourcePublishedText: string | null;
};

/** Compatibility shape for callers that only inspect dates. */
export type DateVerificationResult = FieldVerificationResult & {
  sourcePublishedText: string | null;
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9,
  oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};
const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};
const MONTH = "January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sept?|October|Oct|November|Nov|December|Dec";
const WEEKDAY = "Sunday|Sun|Monday|Mon|Tuesday|Tue(?:s)?|Wednesday|Wed|Thursday|Thu(?:rs?)?|Friday|Fri|Saturday|Sat";
const DATE_PATTERN = new RegExp(`\\b(?:(${WEEKDAY}),?\\s+)?(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "gi");
const MONTH_LIST_PATTERN = new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{1,2}(?!\\d)(?:st|nd|rd|th)?(?:\\s*,\\s*\\d{1,2}(?!\\d)(?:st|nd|rd|th)?)+(?:\\s*(?:,|and)\\s*\\d{1,2}(?!\\d)(?:st|nd|rd|th)?)?)(?:,?\\s+(\\d{4}))?`, "gi");
const RANGE_PATTERN = new RegExp(`\\b(?:every\\s+)?(${WEEKDAY})s?\\b[^.\\n]{0,50}?\\b(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|—|through|thru|to)\\s*(?:(${MONTH})\\.?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, "gi");
const TIME_PATTERN = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/gi;
const TIME_RANGE_PATTERN = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to|until)\s*(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/gi;
const EVENT_STATUS_PATTERN = /\b(cancelled|canceled|postponed|rescheduled)\b/gi;
const INCIDENTAL_DATE_CONTEXT = /\b(register|registration|deadline|tickets? (?:go|went) on sale|applications? due|album|release[sd]?)\b/i;

function dateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function parseExplicitDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sourceDateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = parseExplicitDate(value);
  return parsed ? getCommunityDateKey(parsed) : null;
}

function localTimeKey(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(value);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  return hour && minute ? `${hour}:${minute}` : null;
}

function explicitTimeKey(value: Date | string | null | undefined, timeZone: string) {
  const parsed = parseExplicitDate(value);
  return parsed ? localTimeKey(parsed, timeZone) : null;
}

function calendarDate(month: number, day: number, year: number) {
  const parsed = new Date(Date.UTC(year, month, day));
  return parsed.getUTCMonth() === month && parsed.getUTCDate() === day ? parsed : null;
}

function isIncidental(text: string, index: number) {
  return INCIDENTAL_DATE_CONTEXT.test(text.slice(Math.max(0, index - 18), index));
}

function textDateEvidence(kind: "title" | "description", text: string, reference: Date) {
  const results: VerificationEvidence[] = [];
  const covered = new Set<string>();
  for (const match of text.matchAll(MONTH_LIST_PATTERN)) {
    if (isIncidental(text, match.index)) continue;
    const month = MONTHS[match[1].toLowerCase()];
    const year = match[3] ? Number(match[3]) : reference.getUTCFullYear();
    for (const rawDay of match[2].match(/\d{1,2}/g) ?? []) {
      const parsed = calendarDate(month, Number(rawDay), year);
      results.push({ kind, raw: match[0], value: parsed ? dateOnly(parsed) : null, ...(!parsed && { issue: `Invalid calendar date: ${match[0]}` }) });
    }
    covered.add(`${match.index}:${match[0].length}`);
  }
  for (const match of text.matchAll(DATE_PATTERN)) {
    if (isIncidental(text, match.index)) continue;
    if ([...covered].some((span) => { const [start, length] = span.split(":").map(Number); return match.index >= start && match.index < start + length; })) continue;
    const month = MONTHS[match[2].toLowerCase()];
    const year = match[4] ? Number(match[4]) : reference.getUTCFullYear();
    const parsed = calendarDate(month, Number(match[3]), year);
    let issue: string | undefined;
    if (!parsed) issue = `Invalid calendar date: ${match[0]}`;
    else if (match[1] && parsed.getUTCDay() !== WEEKDAYS[match[1].toLowerCase()]) issue = `Weekday does not match calendar date: ${match[0]}`;
    results.push({ kind, raw: match[0], value: issue || !parsed ? null : dateOnly(parsed), issue });
  }
  return results;
}

function recurrenceEvidence(text: string, expected: string) {
  const results: VerificationEvidence[] = [];
  for (const match of text.matchAll(RANGE_PATTERN)) {
    const year = match[6] ? Number(match[6]) : Number(expected.slice(0, 4));
    const startMonth = MONTHS[match[2].toLowerCase()];
    const endMonth = match[4] ? MONTHS[match[4].toLowerCase()] : startMonth;
    const start = calendarDate(startMonth, Number(match[3]), year);
    const end = calendarDate(endMonth, Number(match[5]), year);
    const target = new Date(`${expected}T00:00:00Z`);
    const weekday = WEEKDAYS[match[1].toLowerCase()];
    const matches = start && end && target >= start && target <= end && target.getUTCDay() === weekday;
    results.push({ kind: "recurrence", raw: match[0], value: matches ? expected : null, ...(!matches && { issue: `Stored date does not fit recurring schedule: ${match[0]}` }) });
  }
  return results;
}

function urlDateEvidence(url: string | null | undefined) {
  if (!url) return [];
  const results: VerificationEvidence[] = [];
  for (const match of url.matchAll(/(?:^|[^\d])(20\d{2})[-_/](0?[1-9]|1[0-2])[-_/]([0-2]?\d|3[01])(?:[^\d]|$)/g)) {
    const parsed = calendarDate(Number(match[2]) - 1, Number(match[3]), Number(match[1]));
    results.push({ kind: "url", raw: match[0], value: parsed ? dateOnly(parsed) : null, ...(!parsed && { issue: "Invalid occurrence date in URL" }) });
  }
  return results;
}

function textTimeEvidence(kind: "title" | "description", text: string) {
  const results: VerificationEvidence[] = [];
  for (const match of text.matchAll(TIME_RANGE_PATTERN)) {
    const firstMeridiem = match[3] ?? match[6];
    for (const [hourText, minute, meridiem] of [[match[1], match[2], firstMeridiem], [match[4], match[5], match[6]]]) {
      let hour = Number(hourText) % 12;
      if (meridiem.toLowerCase().startsWith("p")) hour += 12;
      results.push({ kind, raw: match[0], value: `${String(hour).padStart(2, "0")}:${minute ?? "00"}` });
    }
  }
  for (const match of text.matchAll(TIME_PATTERN)) {
    let hour = Number(match[1]) % 12;
    if (match[3].toLowerCase().startsWith("p")) hour += 12;
    results.push({ kind, raw: match[0], value: `${String(hour).padStart(2, "0")}:${match[2] ?? "00"}` });
  }
  return results;
}

function statusEvidence(text: string) {
  return [...text.matchAll(EVENT_STATUS_PATTERN)].map<VerificationEvidence>((match) => ({
    kind: "status", raw: match[0], value: null,
    issue: `Source content indicates the event was ${match[0].toLowerCase()}.`,
  }));
}

function resolve(expected: string, evidence: VerificationEvidence[], label: string): FieldVerificationResult {
  const issues = evidence.filter((item) => item.issue);
  const hardIssues = issues.filter((item) => item.kind === "status");
  const values = [...new Set(evidence.flatMap((item) => item.value ? [item.value] : []))];
  let status: DateVerificationStatus;
  let reason: string | null;
  if (hardIssues.length) {
    status = "CONFLICT";
    reason = hardIssues.map((item) => item.issue).join("; ");
  } else if (issues.length) {
    status = "CONFLICT";
    reason = issues.map((item) => item.issue).join("; ");
  } else if (values.length === 0) {
    status = "MISSING_EVIDENCE";
    reason = `No independent ${label} evidence was found in the source content.`;
  } else if (values.includes(expected)) {
    status = "VERIFIED";
    reason = null;
  } else if (values.length > 1) {
    status = "AMBIGUOUS";
    reason = `Source content contains multiple ${label}s: ${values.join(", ")}.`;
  } else {
    status = "CONFLICT";
    reason = `Stored ${label} ${expected} conflicts with source ${label} ${values[0]}.`;
  }
  return { status, reason, evidence, verifiedAt: status === "VERIFIED" ? new Date() : null };
}

export function verifyEventDateTime(event: NormalizedScrapedEvent): EventDateTimeVerificationResult {
  const expectedDate = getCommunityDateKey(event.startDateTime);
  const timeZone = event.timeZone ?? "America/New_York";
  const expectedTime = localTimeKey(event.startDateTime, timeZone) ?? "";
  const dateEvidence: VerificationEvidence[] = [];
  const timeEvidence: VerificationEvidence[] = [];
  const structuredValues = [
    ["listing", event.dateEvidence?.listingDate],
    ["structured", event.dateEvidence?.structuredDate],
  ] as const;
  for (const [kind, value] of structuredValues) {
    if (!value) continue;
    const parsed = parseExplicitDate(value);
    dateEvidence.push({ kind, raw: String(value), value: sourceDateKey(value), ...(!parsed && { issue: `Invalid ${kind} date` }) });
    if (parsed && (value instanceof Date || String(value).includes("T"))) timeEvidence.push({ kind, raw: String(value), value: explicitTimeKey(value, timeZone) });
  }
  dateEvidence.push(...urlDateEvidence(event.originalUrl), ...urlDateEvidence(event.sourceUrl));
  const texts = [["title", event.title], ["description", event.description], ["description", event.dateEvidence?.sourcePublishedText]] as const;
  for (const [kind, text] of texts) {
    if (!text) continue;
    dateEvidence.push(...textDateEvidence(kind, text, event.startDateTime), ...recurrenceEvidence(text, expectedDate), ...statusEvidence(text));
    timeEvidence.push(...textTimeEvidence(kind, text), ...statusEvidence(text));
  }
  const date = resolve(expectedDate, dateEvidence, "date");
  const time = event.isAllDay
    ? { status: "VERIFIED" as const, reason: null, evidence: timeEvidence, verifiedAt: new Date() }
    : resolve(expectedTime, timeEvidence, "time");
  return { date, time, hardConflict: dateEvidence.some((item) => item.kind === "status") || timeEvidence.some((item) => item.kind === "status"), sourcePublishedText: event.dateEvidence?.sourcePublishedText ?? null };
}

export function verifyEventDate(event: NormalizedScrapedEvent): DateVerificationResult {
  const result = verifyEventDateTime(event);
  return { ...result.date, sourcePublishedText: result.sourcePublishedText };
}
