import type { DateVerificationStatus } from "@prisma/client";

import { getCommunityDateKey } from "@/lib/hub-date";
import type { NormalizedScrapedEvent } from "@/server/hub-scrapers/types";

export type DateEvidenceKind =
  | "listing"
  | "structured"
  | "title"
  | "description"
  | "status";

export type DateEvidence = {
  kind: DateEvidenceKind;
  raw: string;
  date: string | null;
  issue?: string;
};

export type DateVerificationResult = {
  status: DateVerificationStatus;
  reason: string | null;
  evidence: DateEvidence[];
  verifiedAt: Date | null;
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
const DATE_PATTERN = /\b(?:(Sunday|Sun|Monday|Mon|Tuesday|Tue(?:s)?|Wednesday|Wed|Thursday|Thu(?:rs?)?|Friday|Fri|Saturday|Sat),?\s+)?(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sept?|October|Oct|November|Nov|December|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/gi;
const EVENT_STATUS_PATTERN = /\b(cancelled|canceled|postponed|rescheduled)\b/gi;

function dateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function sourceDateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") {
    const civilDate = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value);
    if (civilDate && !value.includes("T")) return civilDate[1];
  }
  const parsed = parseExplicitDate(value);
  return parsed ? getCommunityDateKey(parsed) : null;
}

function parseExplicitDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function textEvidence(kind: "title" | "description", text: string, reference: Date) {
  const results: DateEvidence[] = [];
  for (const match of text.matchAll(DATE_PATTERN)) {
    const month = MONTHS[match[2].toLowerCase()];
    const year = match[4] ? Number(match[4]) : reference.getUTCFullYear();
    const parsed = new Date(Date.UTC(year, month, Number(match[3])));
    let issue: string | undefined;
    if (parsed.getUTCMonth() !== month || parsed.getUTCDate() !== Number(match[3])) {
      issue = `Invalid calendar date: ${match[0]}`;
    } else if (match[1] && parsed.getUTCDay() !== WEEKDAYS[match[1].toLowerCase()]) {
      issue = `Weekday does not match calendar date: ${match[0]}`;
    }
    results.push({ kind, raw: match[0], date: issue ? null : dateOnly(parsed), issue });
  }
  return results;
}

function statusEvidence(text: string) {
  const evidence: DateEvidence[] = [];
  for (const match of text.matchAll(EVENT_STATUS_PATTERN)) {
    const signal = match[0].toLocaleLowerCase("en-US");
    evidence.push({
      kind: "status",
      raw: match[0],
      date: null,
      issue: `Source content indicates the event was ${signal}.`,
    });
  }
  return evidence;
}

/** Conservatively compares the normalized start date with independent source signals. */
export function verifyEventDate(event: NormalizedScrapedEvent): DateVerificationResult {
  const expected = getCommunityDateKey(event.startDateTime);
  const evidence: DateEvidence[] = [];
  const listing = parseExplicitDate(event.dateEvidence?.listingDate);
  const structured = parseExplicitDate(event.dateEvidence?.structuredDate);
  if (event.dateEvidence?.listingDate) evidence.push({ kind: "listing", raw: String(event.dateEvidence.listingDate), date: sourceDateKey(event.dateEvidence.listingDate), ...(!listing && { issue: "Invalid listing date" }) });
  if (event.dateEvidence?.structuredDate) evidence.push({ kind: "structured", raw: String(event.dateEvidence.structuredDate), date: sourceDateKey(event.dateEvidence.structuredDate), ...(!structured && { issue: "Invalid structured date" }) });
  evidence.push(...textEvidence("title", event.title, event.startDateTime));
  if (event.description) evidence.push(...textEvidence("description", event.description, event.startDateTime));
  if (event.dateEvidence?.sourcePublishedText) evidence.push(...textEvidence("description", event.dateEvidence.sourcePublishedText, event.startDateTime));
  evidence.push(...statusEvidence(event.title));
  if (event.description) evidence.push(...statusEvidence(event.description));
  if (event.dateEvidence?.sourcePublishedText) {
    evidence.push(...statusEvidence(event.dateEvidence.sourcePublishedText));
  }

  const issues = evidence.filter((item) => item.issue);
  const dates = [...new Set(evidence.flatMap((item) => item.date ? [item.date] : []))];
  let status: DateVerificationStatus;
  let reason: string | null;
  if (issues.length) {
    status = "CONFLICT";
    reason = issues.map((item) => item.issue).join("; ");
  } else if (dates.length === 0) {
    status = "MISSING_EVIDENCE";
    reason = "No independent date evidence was found in the source content.";
  } else if (dates.length > 1) {
    status = "AMBIGUOUS";
    reason = `Source content contains multiple dates: ${dates.join(", ")}.`;
  } else if (dates[0] !== expected) {
    status = "CONFLICT";
    reason = `Stored start date ${expected} conflicts with source date ${dates[0]}.`;
  } else {
    status = "VERIFIED";
    reason = null;
  }
  return { status, reason, evidence, verifiedAt: status === "VERIFIED" ? new Date() : null, sourcePublishedText: event.dateEvidence?.sourcePublishedText ?? null };
}
