export type LegacyEventTrustInput = {
  title: string;
  description: string | null;
  sourcePublishedText: string | null;
  sourceName: string;
  sourceUrl: string;
  originalUrl: string | null;
  startDateTime: Date;
  endDateTime: Date | null;
  timeZone: string;
  dateVerificationStatus: string;
  timeVerificationStatus: string;
};

export type LegacyEventTrustDecision = {
  eligible: boolean;
  reasons: string[];
  updateDate: boolean;
  updateTime: boolean;
};

const CHANGE_WARNING = /\b(cancel(?:led|ed|lation)?|postpon(?:ed|ement)|reschedul(?:ed|ing))\b/i;

function isHttpUrl(value: string | null) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function classifyLegacyEventTrust(event: LegacyEventTrustInput): LegacyEventTrustDecision {
  const reasons: string[] = [];
  const updateDate = event.dateVerificationStatus === "MISSING_EVIDENCE";
  const updateTime = event.timeVerificationStatus === "MISSING_EVIDENCE";
  const scheduleText = [event.title, event.description, event.sourcePublishedText].filter(Boolean).join(" ");

  if (!updateDate && !updateTime) reasons.push("No missing-evidence fields remain");
  if (!event.sourceName.trim()) reasons.push("Source name is missing");
  if (!isHttpUrl(event.originalUrl) && !isHttpUrl(event.sourceUrl)) reasons.push("Original source URL is missing or invalid");
  if (!Number.isFinite(event.startDateTime.getTime())) reasons.push("Start date is invalid");
  if (event.endDateTime && event.endDateTime <= event.startDateTime) reasons.push("End date is not after start date");
  if (event.timeZone !== "America/New_York") reasons.push("Time zone is not America/New_York");
  if (CHANGE_WARNING.test(scheduleText)) reasons.push("Listing contains cancellation, postponement, or rescheduling language");

  return { eligible: reasons.length === 0, reasons, updateDate, updateTime };
}
