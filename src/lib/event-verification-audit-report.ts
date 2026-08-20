const DAY_MS = 24 * 60 * 60 * 1000;

export type AuditPriority = "PAST" | "WITHIN_24_HOURS" | "WITHIN_7_DAYS" | "WITHIN_30_DAYS" | "LATER";

export function assessImminence(startDateTime: Date, now: Date): {
  priority: AuditPriority;
  daysUntilEvent: number;
} {
  const difference = startDateTime.getTime() - now.getTime();
  const daysUntilEvent = Math.ceil(difference / DAY_MS);
  if (difference < 0) return { priority: "PAST", daysUntilEvent };
  if (difference <= DAY_MS) return { priority: "WITHIN_24_HOURS", daysUntilEvent };
  if (difference <= 7 * DAY_MS) return { priority: "WITHIN_7_DAYS", daysUntilEvent };
  if (difference <= 30 * DAY_MS) return { priority: "WITHIN_30_DAYS", daysUntilEvent };
  return { priority: "LATER", daysUntilEvent };
}

export function summarizeVerificationStatuses(
  rows: Array<{ dateVerification: { status: string }; timeVerification: { status: string } }>,
) {
  const count = (field: "dateVerification" | "timeVerification") =>
    rows.reduce<Record<string, number>>((summary, row) => {
      const status = row[field].status;
      summary[status] = (summary[status] ?? 0) + 1;
      return summary;
    }, {});
  return { date: count("dateVerification"), time: count("timeVerification") };
}

export function needsVerificationReview(status: string) {
  return status !== "VERIFIED" && status !== "MANUALLY_VERIFIED" && status !== "SOURCE_LISTED";
}

const PRIORITY_ORDER: Record<AuditPriority, number> = {
  WITHIN_24_HOURS: 0,
  WITHIN_7_DAYS: 1,
  WITHIN_30_DAYS: 2,
  LATER: 3,
  PAST: 4,
};

export function compareAuditPriority(
  left: { priority: AuditPriority; startDateTime: Date },
  right: { priority: AuditPriority; startDateTime: Date },
) {
  return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
    || left.startDateTime.getTime() - right.startDateTime.getTime();
}

export function parseEvidence(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
