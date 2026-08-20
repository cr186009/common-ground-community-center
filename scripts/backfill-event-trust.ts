import { prisma } from "../src/lib/prisma";
import { classifyLegacyEventTrust } from "../src/lib/event-trust-backfill";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply-source-listed");
const expectedArg = process.argv.find((arg) => arg.startsWith("--expected-candidates="));
const expectedCandidates = expectedArg ? Number(expectedArg.split("=")[1]) : null;
const SOURCE_LISTED_REASON =
  "Legacy record has a valid source-listed schedule and original listing; retained independent confirmation evidence is unavailable.";

async function main() {
  if (apply && (!Number.isInteger(expectedCandidates) || expectedCandidates! < 0)) {
    throw new Error("Apply mode requires --expected-candidates=<dry-run count>.");
  }

  const events = await prisma.event.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { dateVerificationStatus: "MISSING_EVIDENCE" },
        { timeVerificationStatus: "MISSING_EVIDENCE" },
      ],
    },
    orderBy: [{ sourceName: "asc" }, { startDateTime: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      sourcePublishedText: true,
      sourceName: true,
      sourceUrl: true,
      originalUrl: true,
      startDateTime: true,
      endDateTime: true,
      timeZone: true,
      dateVerificationStatus: true,
      timeVerificationStatus: true,
    },
  });

  const candidates = [] as Array<{
    id: string;
    sourceName: string;
    updateDate: boolean;
    updateTime: boolean;
  }>;
  const heldByReason = new Map<string, number>();

  for (const event of events) {
    const decision = classifyLegacyEventTrust(event);
    if (decision.eligible) {
      candidates.push({
        id: event.id,
        sourceName: event.sourceName,
        updateDate: decision.updateDate,
        updateTime: decision.updateTime,
      });
      continue;
    }
    for (const reason of decision.reasons) heldByReason.set(reason, (heldByReason.get(reason) ?? 0) + 1);
  }

  const bySource = Object.fromEntries(
    [...new Set(candidates.map((candidate) => candidate.sourceName))]
      .sort()
      .map((sourceName) => [sourceName, candidates.filter((candidate) => candidate.sourceName === sourceName).length]),
  );

  console.info(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    approvedMissingEvidenceRecords: events.length,
    sourceListedCandidates: candidates.length,
    heldForReview: events.length - candidates.length,
    heldByReason: Object.fromEntries([...heldByReason.entries()].sort()),
    candidatesBySource: bySource,
  }, null, 2));

  if (!apply) {
    console.info(`\nNo changes made. After reviewing this report, apply exactly this set with:\n` +
      `npm run events:backfill-trust -- --apply-source-listed --expected-candidates=${candidates.length}`);
    return;
  }

  if (candidates.length !== expectedCandidates) {
    throw new Error(`Candidate count changed: expected ${expectedCandidates}, found ${candidates.length}. Run a new dry-run.`);
  }

  const dateIds = candidates.filter((candidate) => candidate.updateDate).map((candidate) => candidate.id);
  const timeIds = candidates.filter((candidate) => candidate.updateTime).map((candidate) => candidate.id);
  const updated = await prisma.$transaction(async (tx) => {
    const dateResult = dateIds.length === 0 ? { count: 0 } : await tx.event.updateMany({
      where: { id: { in: dateIds }, dateVerificationStatus: "MISSING_EVIDENCE" },
      data: {
          dateVerificationStatus: "SOURCE_LISTED",
          dateVerificationReason: SOURCE_LISTED_REASON,
      },
    });
    const timeResult = timeIds.length === 0 ? { count: 0 } : await tx.event.updateMany({
      where: { id: { in: timeIds }, timeVerificationStatus: "MISSING_EVIDENCE" },
      data: {
          timeVerificationStatus: "SOURCE_LISTED",
          timeVerificationReason: SOURCE_LISTED_REASON,
      },
    });
    if (dateResult.count !== dateIds.length || timeResult.count !== timeIds.length) {
      throw new Error("Candidate records changed during apply; the transaction was rolled back. Run a new dry-run.");
    }
    return new Set([...dateIds, ...timeIds]).size;
  });

  console.info(`Applied SOURCE_LISTED trust to ${updated} approved events atomically. No events were deleted or marked VERIFIED.`);
}

main()
  .catch((error) => {
    console.error("Event trust backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
