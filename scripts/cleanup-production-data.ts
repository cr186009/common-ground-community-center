import type { Event, EventInterest, Prisma } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { classifyDuplicateGroup, classifyInvalidRange } from "../src/lib/production-data-cleanup";
import {
  buildMergedEventData,
  groupExactDuplicateEvents,
  selectCanonicalEvent,
} from "../src/server/event-deduplication";

type Db = Prisma.TransactionClient;
type Counts = {
  eventRangeRepairs: number;
  eventRangeHolds: number;
  meetingRangeRepairs: number;
  duplicateGroups: number;
  duplicateRemovals: number;
  duplicateGroupsHeld: number;
};

const apply = process.argv.includes("--apply");

function integerArgument(name: string) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${prefix} must be a non-negative integer.`);
  return parsed;
}

function increment(counts: Record<string, number>, reason: string) {
  counts[reason] = (counts[reason] ?? 0) + 1;
}

async function makePlan(db: Db | typeof prisma, now: Date) {
  const [events, meetings] = await Promise.all([
    db.event.findMany({
      where: { status: "APPROVED", startDateTime: { gte: now } },
      orderBy: [{ startDateTime: "asc" }, { createdAt: "asc" }],
    }),
    db.meeting.findMany({
      where: { status: "UPCOMING" },
      orderBy: [{ startDateTime: "asc" }, { createdAt: "asc" }],
      select: { id: true, startDateTime: true, endDateTime: true },
    }),
  ]);

  const eventRangeRepairs: string[] = [];
  const eventRangeHolds: Record<string, number> = {};
  for (const event of events) {
    const decision = classifyInvalidRange(event);
    if (decision.action === "clear-end") eventRangeRepairs.push(event.id);
    if (decision.action === "hold") increment(eventRangeHolds, decision.reason);
  }

  const meetingRangeRepairs = meetings
    .filter((meeting) => classifyInvalidRange(meeting).action === "clear-end")
    .map((meeting) => meeting.id);

  const mergeGroups: Event[][] = [];
  const duplicateHolds: Record<string, number> = {};
  for (const group of groupExactDuplicateEvents(events)) {
    const decision = classifyDuplicateGroup(group);
    if (decision.action === "merge") mergeGroups.push(group);
    if (decision.action === "hold") increment(duplicateHolds, decision.reason);
  }

  return {
    eventRangeRepairs,
    eventRangeHolds,
    meetingRangeRepairs,
    mergeGroups,
    duplicateHolds,
    counts: {
      eventRangeRepairs: eventRangeRepairs.length,
      eventRangeHolds: Object.values(eventRangeHolds).reduce((sum, count) => sum + count, 0),
      meetingRangeRepairs: meetingRangeRepairs.length,
      duplicateGroups: mergeGroups.length,
      duplicateRemovals: mergeGroups.reduce((sum, group) => sum + group.length - 1, 0),
      duplicateGroupsHeld: Object.values(duplicateHolds).reduce((sum, count) => sum + count, 0),
    } satisfies Counts,
  };
}

function latestDate(values: Array<Date | null>) {
  const dates = values.filter((value): value is Date => value !== null);
  return dates.length ? new Date(Math.max(...dates.map((value) => value.getTime()))) : null;
}

async function preserveInterests(db: Db, canonicalId: string, groupIds: string[]) {
  const interests = await db.eventInterest.findMany({ where: { eventId: { in: groupIds } } });
  const byEmail = new Map<string, EventInterest[]>();
  for (const interest of interests) {
    const group = byEmail.get(interest.email) ?? [];
    group.push(interest);
    byEmail.set(interest.email, group);
  }

  for (const [email, records] of byEmail) {
    const displayRecord = records.find((record) => record.displayName) ?? records[0];
    const reminderSentAt = latestDate(records.map((record) => record.reminderSentAt));
    await db.eventInterest.upsert({
      where: { eventId_email: { eventId: canonicalId, email } },
      create: {
        eventId: canonicalId,
        email,
        displayName: displayRecord.displayName,
        showNamePublicly: records.some((record) => record.showNamePublicly),
        reminderRequested: records.some((record) => record.reminderRequested),
        reminderClaimedAt: latestDate(records.map((record) => record.reminderClaimedAt)),
        reminderSentAt,
        reminderFailure: reminderSentAt ? null : records.find((record) => record.reminderFailure)?.reminderFailure ?? null,
      },
      update: {
        displayName: displayRecord.displayName,
        showNamePublicly: records.some((record) => record.showNamePublicly),
        reminderRequested: records.some((record) => record.reminderRequested),
        reminderClaimedAt: latestDate(records.map((record) => record.reminderClaimedAt)),
        reminderSentAt,
        reminderFailure: reminderSentAt ? null : records.find((record) => record.reminderFailure)?.reminderFailure ?? null,
      },
    });
  }
}

function assertExpected(counts: Counts) {
  const expected = {
    eventRangeRepairs: integerArgument("expected-event-range-repairs"),
    meetingRangeRepairs: integerArgument("expected-meeting-range-repairs"),
    duplicateGroups: integerArgument("expected-duplicate-groups"),
    duplicateRemovals: integerArgument("expected-duplicate-removals"),
  };
  for (const [name, value] of Object.entries(expected)) {
    if (value === null) throw new Error(`Apply requires --expected-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}=<dry-run count>.`);
    if (counts[name as keyof typeof expected] !== value) {
      throw new Error(`Safety count changed for ${name}: expected ${value}, found ${counts[name as keyof typeof expected]}. Run a new dry-run.`);
    }
  }
}

async function main() {
  const cutoff = new Date();
  const initial = await makePlan(prisma, cutoff);
  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    scope: "Upcoming approved events and upcoming meetings only",
    ...initial.counts,
    eventRangeHoldsByReason: initial.eventRangeHolds,
    duplicateGroupsHeldByReason: initial.duplicateHolds,
  }, null, 2));

  if (!apply) {
    console.log("\nNo changes made. Apply only this reviewed set with:");
    console.log(`npm run cleanup:production -- --apply --expected-event-range-repairs=${initial.counts.eventRangeRepairs} --expected-meeting-range-repairs=${initial.counts.meetingRangeRepairs} --expected-duplicate-groups=${initial.counts.duplicateGroups} --expected-duplicate-removals=${initial.counts.duplicateRemovals}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const plan = await makePlan(tx, cutoff);
    assertExpected(plan.counts);

    if (plan.meetingRangeRepairs.length) {
      await tx.meeting.updateMany({ where: { id: { in: plan.meetingRangeRepairs } }, data: { endDateTime: null } });
    }

    for (const group of plan.mergeGroups) {
      const canonical = selectCanonicalEvent(group);
      const groupIds = group.map((event) => event.id);
      const removedIds = groupIds.filter((id) => id !== canonical.id);
      await tx.event.update({ where: { id: canonical.id }, data: buildMergedEventData(group) });
      await preserveInterests(tx, canonical.id, groupIds);
      await tx.event.deleteMany({ where: { id: { in: removedIds } } });
    }
    // Run this after duplicate merging because merged data is built from the
    // transaction's original snapshot and could otherwise restore a bad end.
    if (plan.eventRangeRepairs.length) {
      await tx.event.updateMany({ where: { id: { in: plan.eventRangeRepairs } }, data: { endDateTime: null } });
    }

    await tx.scrapeLog.create({
      data: {
        sourceName: "Production data cleanup",
        status: "SUCCESS",
        message: `Repaired ${plan.counts.eventRangeRepairs} event range(s), ${plan.counts.meetingRangeRepairs} meeting range(s), and merged ${plan.counts.duplicateGroups} exact duplicate group(s).`,
        details: JSON.stringify({ criteriaVersion: 1, ...plan.counts }),
        itemsFound: plan.counts.eventRangeRepairs + plan.counts.meetingRangeRepairs + plan.counts.duplicateRemovals,
        itemsUpdated: plan.counts.eventRangeRepairs + plan.counts.meetingRangeRepairs + plan.counts.duplicateGroups,
      },
    });
  }, { timeout: 60_000 });

  console.log("Cleanup applied atomically. Invalid ends were cleared, exact duplicates were conservatively merged, and subscriber/reminder state was retained.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
