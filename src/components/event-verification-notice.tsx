import { formatTimestamp } from "@/lib/hub-format";

type VerificationStatus =
  | "VERIFIED"
  | "MANUALLY_VERIFIED"
  | "CONFLICT"
  | "AMBIGUOUS"
  | "MISSING_EVIDENCE"
  | "SOURCE_LISTED";

type Props = {
  dateStatus: VerificationStatus;
  timeStatus: VerificationStatus;
  sourceUrl: string;
  lastCheckedAt: Date | null;
  compact?: boolean;
};

function isSafeToDisplayWithoutWarning(status: VerificationStatus) {
  return status === "VERIFIED" || status === "MANUALLY_VERIFIED" || status === "SOURCE_LISTED";
}

export function getVerificationNoticeLabel(
  dateStatus: VerificationStatus,
  timeStatus: VerificationStatus,
) {
  const dateUnverified = !isSafeToDisplayWithoutWarning(dateStatus);
  const timeUnverified = !isSafeToDisplayWithoutWarning(timeStatus);
  if (dateUnverified && timeUnverified) {
    return "Date not yet verified. Time listed by source; not independently verified";
  }
  if (dateUnverified) return "Date not yet verified";
  if (timeUnverified) return "Time listed by source; not independently verified";
  return null;
}

export function EventVerificationNotice({
  dateStatus,
  timeStatus,
  sourceUrl,
  lastCheckedAt,
  compact = false,
}: Props) {
  const label = getVerificationNoticeLabel(dateStatus, timeStatus);
  if (!label) return null;

  if (compact) {
    return (
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        <p className="font-semibold">{label}</p>
        <p className="mt-1">
          Confirm with the organizer before attending. {" "}
          <a className="font-semibold underline" href={sourceUrl} target="_blank" rel="noreferrer">
            View original listing
          </a>
        </p>
      </div>
    );
  }

  return (
    <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-sm">
        These details may have changed. Confirm with the organizer before attending.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <a className="font-semibold underline" href={sourceUrl} target="_blank" rel="noreferrer">
          View original listing
        </a>
        <span>Last checked {formatTimestamp(lastCheckedAt)}</span>
      </div>
    </aside>
  );
}
