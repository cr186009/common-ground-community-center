export type RangeRecord = {
  startDateTime: Date;
  endDateTime: Date | null;
  dateVerificationStatus?: string;
  timeVerificationStatus?: string;
};

export type DuplicateSafetyRecord = {
  category: string;
  isAllDay: boolean;
  endDateTime: Date | null;
  dateVerificationStatus: string;
  timeVerificationStatus: string;
};

const REVIEW_ONLY_STATUSES = new Set([
  "AMBIGUOUS",
  "CONFLICT",
  "MANUALLY_VERIFIED",
  "VERIFIED",
]);

export function classifyInvalidRange(record: RangeRecord) {
  if (!record.endDateTime || record.endDateTime > record.startDateTime) {
    return { action: "none" as const };
  }

  const protectedStatus = [record.dateVerificationStatus, record.timeVerificationStatus]
    .find((status) => status && REVIEW_ONLY_STATUSES.has(status));
  if (protectedStatus) {
    return {
      action: "hold" as const,
      reason: `Invalid end time has protected ${protectedStatus} evidence`,
    };
  }

  return {
    action: "clear-end" as const,
    reason: "End date is not after start date; retain the start and clear only the invalid end",
  };
}

export function classifyDuplicateGroup(records: DuplicateSafetyRecord[]) {
  if (records.length < 2) return { action: "none" as const };

  if (records.some((record) =>
    ["AMBIGUOUS", "CONFLICT"].includes(record.dateVerificationStatus)
    || ["AMBIGUOUS", "CONFLICT"].includes(record.timeVerificationStatus)
  )) {
    return { action: "hold" as const, reason: "Group contains ambiguous or conflicting verification evidence" };
  }

  if (new Set(records.map((record) => record.category)).size > 1) {
    return { action: "hold" as const, reason: "Group has conflicting categories" };
  }
  if (new Set(records.map((record) => record.isAllDay)).size > 1) {
    return { action: "hold" as const, reason: "Group disagrees about whether the event is all-day" };
  }

  const distinctEnds = new Set(
    records.flatMap((record) => record.endDateTime ? [record.endDateTime.toISOString()] : []),
  );
  if (distinctEnds.size > 1) {
    return { action: "hold" as const, reason: "Group has conflicting end times" };
  }

  return { action: "merge" as const };
}
