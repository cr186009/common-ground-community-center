import { formatInTimeZone } from "date-fns-tz";

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10,
  oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

export type DateEvidence = {
  date: string;
  text: string;
  field: "title" | "description";
};

export type EventDateAuditResult = {
  status: "MATCH" | "CONFLICT" | "AMBIGUOUS" | "NO_EVIDENCE";
  storedDate: string;
  evidence: DateEvidence[];
  reasons: string[];
};

function validDateKey(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractDateEvidence(
  text: string | null | undefined,
  field: DateEvidence["field"],
  defaultYear: number,
): DateEvidence[] {
  if (!text) return [];
  const found: DateEvidence[] = [];
  const named = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*,?\s*(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/gi;
  const numeric = /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/g;

  for (const match of text.matchAll(named)) {
    const year = match[3] ? Number(match[3]) : defaultYear;
    const date = validDateKey(year, MONTHS[match[1].toLowerCase()], Number(match[2]));
    if (date) found.push({ date, text: match[0].trim(), field });
  }
  for (const match of text.matchAll(numeric)) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const date = validDateKey(year, Number(match[1]), Number(match[2]));
    if (date) found.push({ date, text: match[0], field });
  }
  return found.filter((item, index) =>
    found.findIndex((candidate) => candidate.date === item.date && candidate.field === item.field) === index,
  );
}

export function auditEventDate(input: {
  title: string;
  description?: string | null;
  startDateTime: Date;
  timeZone?: string | null;
}): EventDateAuditResult {
  const timeZone = input.timeZone || "America/New_York";
  const storedDate = formatInTimeZone(input.startDateTime, timeZone, "yyyy-MM-dd");
  const storedYear = Number(storedDate.slice(0, 4));
  const evidence = [
    ...extractDateEvidence(input.title, "title", storedYear),
    ...extractDateEvidence(input.description, "description", storedYear),
  ];
  const dates = [...new Set(evidence.map((item) => item.date))];
  if (dates.length === 0) return { status: "NO_EVIDENCE", storedDate, evidence, reasons: ["No explicit calendar date found in title or description."] };
  if (!dates.includes(storedDate)) return { status: "CONFLICT", storedDate, evidence, reasons: [`Stored date ${storedDate} does not match text date${dates.length > 1 ? "s" : ""} ${dates.join(", ")}.`] };
  if (dates.length > 1) return { status: "AMBIGUOUS", storedDate, evidence, reasons: [`Text contains multiple dates (${dates.join(", ")}); one matches the stored date.`] };
  return { status: "MATCH", storedDate, evidence, reasons: [] };
}
