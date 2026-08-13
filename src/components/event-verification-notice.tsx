import { formatTimestamp } from "@/lib/hub-format";

type VerificationStatus =
  | "VERIFIED"
  | "MANUALLY_VERIFIED"
  | "CONFLICT"
  | "AMBIGUOUS"
  | "MISSING_EVIDENCE";

type Props = {
  dateStatus: VerificationStatus;
  timeStatus: VerificationStatus;
  sourceUrl: string;
  lastCheckedAt: Date | null;
  compact?: boolean;
};

function isVerified(status: VerificationStatus) {
  return status === "VERIFIED" || status === "MANUALLY_VERIFIED";
}

export function getVerificationNoticeLabel(
  dateStatus: VerificationStatus,
  timeStatus: VerificationStatus,
) {
  const dateUnverified = !isVerified(dateStatus);
  const timeUnverified = !isVerified(timeStatus);
  if (dateUnverified && timeUnverified) return "Date and time not yet verified";
  if (dateUnverified) return "Date not yet verified";
  if (timeUnverified) return "Time not yet verified";
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
            Check official source
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
          Check official source
        </a>
        <span>Last checked {formatTimestamp(lastCheckedAt)}</span>
      </div>
    </aside>
  );
}
