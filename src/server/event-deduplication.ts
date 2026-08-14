import type { Event, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type DuplicateCandidate = Event;

export function normalizeDuplicateText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getExactDuplicateKey(
  event: Pick<Event, "title" | "startDateTime" | "city" | "county">,
) {
  return [
    normalizeDuplicateText(event.title),
    event.startDateTime.toISOString(),
    normalizeDuplicateText(event.city),
    normalizeDuplicateText(event.county),
  ].join("::");
}

export function groupExactDuplicateEvents<T extends Pick<Event, "title" | "startDateTime" | "city" | "county" | "locationName" | "address">>(
  events: T[],
) {
  const grouped = new Map<string, T[]>();
  for (const event of events) {
    const key = getExactDuplicateKey(event);
    const group = grouped.get(key) ?? [];
    group.push(event);
    grouped.set(key, group);
  }
  return [...grouped.values()].filter((group) => {
    if (group.length < 2) return false;
    // Distinct known venues or addresses are evidence of separate events, even
    // when a generic title happens to collide at the same time.
    for (const field of ["locationName", "address"] as const) {
      const knownValues = new Set(
        group.map((event) => event[field]).filter(Boolean).map((value) => normalizeDuplicateText(value!)),
      );
      if (knownValues.size > 1) return false;
    }
    return true;
  });
}

const verificationRank = {
  VERIFIED: 5,
  MANUALLY_VERIFIED: 4,
  AMBIGUOUS: 3,
  MISSING_EVIDENCE: 2,
  CONFLICT: 1,
} as const;

function populatedFieldCount(event: DuplicateCandidate) {
  const values = [
    event.description,
    event.endDateTime,
    event.locationName,
    event.address,
    event.cost,
    event.originalUrl,
    event.imageUrl,
    event.imageAlt,
    event.sourcePublishedText,
    event.sourceId,
  ];
  return values.filter(Boolean).length;
}

export function selectCanonicalEvent(events: DuplicateCandidate[]) {
  if (events.length === 0) throw new Error("Cannot select a canonical event from an empty group.");
  return [...events].sort((a, b) => {
    const verificationDifference =
      verificationRank[b.dateVerificationStatus] + verificationRank[b.timeVerificationStatus] -
      verificationRank[a.dateVerificationStatus] - verificationRank[a.timeVerificationStatus];
    if (verificationDifference) return verificationDifference;
    const completenessDifference = populatedFieldCount(b) - populatedFieldCount(a);
    if (completenessDifference) return completenessDifference;
    const confidenceDifference = (b.confidenceScore ?? -1) - (a.confidenceScore ?? -1);
    if (confidenceDifference) return confidenceDifference;
    const createdDifference = a.createdAt.getTime() - b.createdAt.getTime();
    return createdDifference || a.id.localeCompare(b.id);
  })[0];
}

function longest(events: DuplicateCandidate[], field: keyof DuplicateCandidate) {
  const values = events
    .map((event) => event[field])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return values.sort((a, b) => b.length - a.length)[0] ?? null;
}

function mergeJsonArrays(values: string[]) {
  const merged: unknown[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        const key = JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
    } catch {
      // Invalid legacy evidence should not prevent a safe duplicate cleanup.
    }
  }
  return JSON.stringify(merged);
}

function strongestVerification(events: DuplicateCandidate[], prefix: "date" | "time") {
  return [...events].sort((a, b) => {
    const aStatus = prefix === "date" ? a.dateVerificationStatus : a.timeVerificationStatus;
    const bStatus = prefix === "date" ? b.dateVerificationStatus : b.timeVerificationStatus;
    return verificationRank[bStatus] - verificationRank[aStatus];
  })[0];
}

export function buildMergedEventData(events: DuplicateCandidate[]): Prisma.EventUpdateInput {
  const canonical = selectCanonicalEvent(events);
  const dateWinner = strongestVerification(events, "date");
  const timeWinner = strongestVerification(events, "time");
  const imageWinner = events.find((event) => event.imageUrl && !event.imageIsFallback)
    ?? events.find((event) => event.imageUrl)
    ?? canonical;
  const sourceWinner = canonical.sourceId ? canonical : events.find((event) => event.sourceId) ?? canonical;
  const confidenceScores = events
    .map((event) => event.confidenceScore)
    .filter((score): score is number => score !== null);

  return {
    description: longest(events, "description"),
    endDateTime: events.map((event) => event.endDateTime).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null,
    locationName: longest(events, "locationName"),
    address: longest(events, "address"),
    cost: longest(events, "cost"),
    tags: mergeJsonArrays(events.map((event) => event.tags)),
    isFree: events.some((event) => event.isFree),
    isKidFriendly: events.some((event) => event.isKidFriendly),
    isOutdoor: events.some((event) => event.isOutdoor),
    originalUrl: canonical.originalUrl ?? events.find((event) => event.originalUrl)?.originalUrl ?? null,
    imageUrl: imageWinner.imageUrl,
    imageSource: imageWinner.imageSource,
    imageCredit: imageWinner.imageCredit,
    imageCreditUrl: imageWinner.imageCreditUrl,
    imageAlt: imageWinner.imageAlt,
    imageIsFallback: imageWinner.imageIsFallback,
    dateVerificationStatus: dateWinner.dateVerificationStatus,
    dateVerificationReason: dateWinner.dateVerificationReason,
    dateEvidence: mergeJsonArrays(events.map((event) => event.dateEvidence)),
    dateVerifiedAt: dateWinner.dateVerifiedAt,
    timeVerificationStatus: timeWinner.timeVerificationStatus,
    timeVerificationReason: timeWinner.timeVerificationReason,
    timeEvidence: mergeJsonArrays(events.map((event) => event.timeEvidence)),
    timeVerifiedAt: timeWinner.timeVerifiedAt,
    sourcePublishedText: longest(events, "sourcePublishedText"),
    confidenceScore: confidenceScores.length > 0 ? Math.max(...confidenceScores) : null,
    lastSeenAt: new Date(Math.max(...events.map((event) => event.lastSeenAt.getTime()))),
    source: sourceWinner.sourceId ? { connect: { id: sourceWinner.sourceId } } : { disconnect: true },
  };
}

export async function cleanExactEventDuplicates() {
  return prisma.$transaction(async (tx) => {
    const events = await tx.event.findMany({
      where: { status: "APPROVED", startDateTime: { gte: new Date() } },
      orderBy: [{ startDateTime: "asc" }, { createdAt: "asc" }],
    });
    const groups = groupExactDuplicateEvents(events);
    const auditGroups: Array<{ canonicalId: string; removedIds: string[]; sources: Array<{ id: string | null; name: string }> }> = [];

    for (const group of groups) {
      const canonical = selectCanonicalEvent(group);
      const removedIds = group.filter((event) => event.id !== canonical.id).map((event) => event.id);
      await tx.event.update({ where: { id: canonical.id }, data: buildMergedEventData(group) });
      const interests = await tx.eventInterest.findMany({ where: { eventId: { in: removedIds } } });
      for (const interest of interests) {
        await tx.eventInterest.upsert({
          where: { eventId_email: { eventId: canonical.id, email: interest.email } },
          update: {
            displayName: interest.displayName,
            showNamePublicly: interest.showNamePublicly,
          },
          create: {
            eventId: canonical.id,
            email: interest.email,
            displayName: interest.displayName,
            showNamePublicly: interest.showNamePublicly,
          },
        });
      }
      await tx.event.deleteMany({ where: { id: { in: removedIds } } });
      auditGroups.push({
        canonicalId: canonical.id,
        removedIds,
        sources: group.map((event) => ({ id: event.sourceId, name: event.sourceName })),
      });
    }

    const removedCount = auditGroups.reduce((total, group) => total + group.removedIds.length, 0);
    await tx.scrapeLog.create({
      data: {
        sourceName: "Admin duplicate cleanup",
        status: "SUCCESS",
        message: `Merged ${groups.length} exact duplicate group(s) and removed ${removedCount} redundant event record(s).`,
        details: JSON.stringify({ criteria: "normalized title + exact start timestamp + normalized city/county + no conflicting known venue/address", groups: auditGroups }),
        itemsFound: events.length,
        itemsUpdated: groups.length,
      },
    });
    return { groupCount: groups.length, removedCount };
  });
}
