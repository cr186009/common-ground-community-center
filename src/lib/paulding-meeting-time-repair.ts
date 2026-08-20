import { parseCommunityCivilDateTime } from "@/lib/hub-date";
import { getSourceItemIdentity } from "@/server/hub-scrapers/source-item-identity";

export type PauldingMeetingRepairRecord = {
  id: string;
  title: string;
  startDateTime: Date;
  endDateTime: Date | null;
  originalUrl: string | null;
  lastSeenAt: Date;
};

export type PauldingMeetingRepairAction =
  | { action: "delete-duplicate"; id: string; retainedId: string }
  | { action: "correct-time"; id: string; startDateTime: Date; endDateTime: Date | null };

function reinterpretUtcClockAsEastern(value: Date) {
  const date = [value.getUTCFullYear(), String(value.getUTCMonth() + 1).padStart(2, "0"), String(value.getUTCDate()).padStart(2, "0")].join("-");
  const time = [String(value.getUTCHours()).padStart(2, "0"), String(value.getUTCMinutes()).padStart(2, "0"), String(value.getUTCSeconds()).padStart(2, "0")].join(":");
  return parseCommunityCivilDateTime(date, time);
}

export function planPauldingMeetingTimeRepair(
  records: PauldingMeetingRepairRecord[],
  correctedParserDeployedAt: Date,
) {
  const actions: PauldingMeetingRepairAction[] = [];
  for (const record of records) {
    if (record.lastSeenAt >= correctedParserDeployedAt) continue;
    const identity = getSourceItemIdentity(record.originalUrl);
    if (!identity) continue;

    const correctedStart = reinterpretUtcClockAsEastern(record.startDateTime);
    const correctedEnd = record.endDateTime
      ? reinterpretUtcClockAsEastern(record.endDateTime)
      : null;
    const counterpart = records.find(
      (candidate) =>
        candidate.id !== record.id &&
        candidate.title.toLocaleLowerCase("en-US") === record.title.toLocaleLowerCase("en-US") &&
        getSourceItemIdentity(candidate.originalUrl) === identity &&
        candidate.startDateTime.getTime() === correctedStart.getTime() &&
        candidate.lastSeenAt >= correctedParserDeployedAt,
    );

    actions.push(counterpart
      ? { action: "delete-duplicate", id: record.id, retainedId: counterpart.id }
      : { action: "correct-time", id: record.id, startDateTime: correctedStart, endDateTime: correctedEnd });
  }
  return actions;
}
