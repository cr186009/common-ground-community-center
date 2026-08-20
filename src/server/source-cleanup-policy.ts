import {
  HELD_SOURCE_NAMES,
  MANAGED_AUTOMATED_SOURCE_NAMES,
} from "@/config/source-registry";
function normalizeSourceName(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
}

export type CleanupSource = {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  counts: {
    alerts: number;
    events: number;
    meetings: number;
    logs: number;
    volunteer: number;
  };
};

export type SourceCleanupAction =
  | { action: "keep"; sourceId: string; sourceName: string; canonicalName?: string; reason: string }
  | { action: "retire"; sourceId: string; sourceName: string; reason: string }
  | { action: "delete"; sourceId: string; sourceName: string; reason: string }
  | {
      action: "merge";
      sourceId: string;
      sourceName: string;
      targetId: string;
      targetName: string;
      reason: string;
    };

const managedNames = new Map(
  MANAGED_AUTOMATED_SOURCE_NAMES.map((name) => [normalizeSourceName(name), name]),
);
const heldNames = new Set(HELD_SOURCE_NAMES.map(normalizeSourceName));

export function getSourceRecordCount(source: CleanupSource) {
  return Object.values(source.counts).reduce((sum, count) => sum + count, 0);
}

export function getOwnedContentCount(source: CleanupSource) {
  return source.counts.alerts + source.counts.events + source.counts.meetings + source.counts.volunteer;
}

function selectDuplicateWinner(sources: CleanupSource[]) {
  const canonicalName = managedNames.get(normalizeSourceName(sources[0].name));
  return [...sources].sort((left, right) => {
    const activeDifference = Number(right.active) - Number(left.active);
    if (activeDifference !== 0) return activeDifference;
    const leftCanonical = left.name === canonicalName ? 1 : 0;
    const rightCanonical = right.name === canonicalName ? 1 : 0;
    if (leftCanonical !== rightCanonical) return rightCanonical - leftCanonical;
    const countDifference = getSourceRecordCount(right) - getSourceRecordCount(left);
    if (countDifference !== 0) return countDifference;
    return left.createdAt.getTime() - right.createdAt.getTime();
  })[0];
}

export function planSourceCleanup(sources: CleanupSource[]): SourceCleanupAction[] {
  const groups = new Map<string, CleanupSource[]>();
  for (const source of sources) {
    const key = normalizeSourceName(source.name);
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }

  const actions: SourceCleanupAction[] = [];
  for (const [normalizedName, group] of groups) {
    const winner = selectDuplicateWinner(group);
    for (const duplicate of group) {
      if (duplicate.id === winner.id) continue;
      actions.push({
        action: "merge",
        sourceId: duplicate.id,
        sourceName: duplicate.name,
        targetId: winner.id,
        targetName: winner.name,
        reason: "Case/spacing duplicate; transfer its content and scrape history to the retained record.",
      });
    }

    const canonicalName = managedNames.get(normalizedName);
    if (canonicalName) {
      actions.push({
        action: "keep",
        sourceId: winner.id,
        sourceName: winner.name,
        ...(winner.name === canonicalName ? {} : { canonicalName }),
        reason: `Managed automated source${winner.name === canonicalName ? "" : ` (canonical name: ${canonicalName})`}.`,
      });
    } else if (heldNames.has(normalizedName)) {
      actions.push({
        action: "retire",
        sourceId: winner.id,
        sourceName: winner.name,
        reason: "Explicit hold: access/robots restrictions prevent safe automated collection.",
      });
    } else if (getOwnedContentCount(winner) > 0) {
      actions.push({
        action: "retire",
        sourceId: winner.id,
        sourceName: winner.name,
        reason: "Unmanaged legacy/discovery source with owned content; preserve records and disable collection.",
      });
    } else {
      actions.push({
        action: "delete",
        sourceId: winner.id,
        sourceName: winner.name,
        reason: winner.counts.logs > 0
          ? "Unmanaged legacy/discovery source with no owned content; detach its audit logs and remove the source record."
          : "Unused unmanaged legacy/discovery source with no content or scrape history.",
      });
    }
  }

  return actions.sort((left, right) => left.sourceName.localeCompare(right.sourceName));
}
