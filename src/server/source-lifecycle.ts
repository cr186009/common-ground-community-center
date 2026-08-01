import { RETIRED_SOURCE_NOTE_MARKER } from "@/server/scrape-health";

export type SourceLifecycleState = {
  active: boolean;
  notes: string | null;
};

export type SourceRemovalImpactCounts = {
  events: number;
  meetings: number;
  alerts: number;
  volunteerOpportunities: number;
};

export type SourceRemovalImpactSummary = SourceRemovalImpactCounts & {
  totalOwnedContent: number;
  hasOwnedContent: boolean;
  warning: string | null;
};

const RETIRED_MARKER_PATTERN = /\[retired\]/gi;

function withoutRetiredMarkers(notes: string | null) {
  const remainingNotes = (notes ?? "")
    .replace(RETIRED_MARKER_PATTERN, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

  return remainingNotes || null;
}

/** Pause collection without changing the source's descriptive notes. */
export function pauseSource(state: SourceLifecycleState): SourceLifecycleState {
  return { active: false, notes: state.notes };
}

/**
 * Retire a source reversibly. Existing marker variants are normalized so the
 * canonical marker occurs exactly once, even after repeated retirement calls.
 */
export function retireSource(state: SourceLifecycleState): SourceLifecycleState {
  const notes = withoutRetiredMarkers(state.notes);

  return {
    active: false,
    notes: `${RETIRED_SOURCE_NOTE_MARKER}${notes ? ` ${notes}` : ""}`,
  };
}

/** Restore collection and remove only retirement markers from source notes. */
export function restoreSource(state: SourceLifecycleState): SourceLifecycleState {
  return {
    active: true,
    notes: withoutRetiredMarkers(state.notes),
  };
}

function assertCount(name: string, value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} count must be a non-negative integer.`);
  }
}

export function summarizeSourceRemovalImpact(
  counts: SourceRemovalImpactCounts,
): SourceRemovalImpactSummary {
  assertCount("Event", counts.events);
  assertCount("Meeting", counts.meetings);
  assertCount("Alert", counts.alerts);
  assertCount("Volunteer opportunity", counts.volunteerOpportunities);

  const totalOwnedContent =
    counts.events + counts.meetings + counts.alerts + counts.volunteerOpportunities;

  return {
    ...counts,
    totalOwnedContent,
    hasOwnedContent: totalOwnedContent > 0,
    warning:
      totalOwnedContent > 0
        ? `This source owns ${totalOwnedContent} public record${totalOwnedContent === 1 ? "" : "s"}. Retire it instead of permanently deleting it unless those records are handled first.`
        : null,
  };
}
