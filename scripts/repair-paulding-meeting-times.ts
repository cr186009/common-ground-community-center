import { PrismaClient } from "@prisma/client";

import { planPauldingMeetingTimeRepair } from "../src/lib/paulding-meeting-time-repair";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const expected = (name: string) => {
  const value = process.argv.find((argument) => argument.startsWith(`--expected-${name}=`));
  return value ? Number(value.split("=", 2)[1]) : null;
};

async function main() {
  const records = await prisma.meeting.findMany({
    where: {
      county: "Paulding",
      sourceName: { equals: "Paulding County public calendar", mode: "insensitive" },
      startDateTime: { gte: new Date() },
      originalUrl: { contains: "EID=", mode: "insensitive" },
    },
    select: { id: true, title: true, startDateTime: true, endDateTime: true, originalUrl: true, lastSeenAt: true },
  });
  const actions = planPauldingMeetingTimeRepair(records, new Date("2026-08-20T00:00:00Z"));
  const deletes = actions.filter((action) => action.action === "delete-duplicate");
  const updates = actions.filter((action) => action.action === "correct-time");
  console.info(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned: records.length, deleteDuplicateCount: deletes.length, correctTimeCount: updates.length, actions }, null, 2));

  if (!apply) {
    console.error(`No changes made. Apply only after review with --apply --expected-deletes=${deletes.length} --expected-updates=${updates.length}.`);
    return;
  }
  if (expected("deletes") !== deletes.length || expected("updates") !== updates.length) {
    throw new Error("Refusing to apply because the reviewed delete/update counts no longer match.");
  }
  await prisma.$transaction(async (tx) => {
    for (const action of deletes) await tx.meeting.delete({ where: { id: action.id } });
    for (const action of updates) await tx.meeting.update({ where: { id: action.id }, data: { startDateTime: action.startDateTime, endDateTime: action.endDateTime } });
  });
  console.info(`Applied Paulding meeting repair: deleted ${deletes.length} stale duplicates and corrected ${updates.length} unmatched times.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
