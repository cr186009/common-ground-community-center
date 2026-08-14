import { PrismaClient } from "@prisma/client";

import { planSourceCleanup } from "../src/server/source-cleanup-policy";
import { retireSource } from "../src/server/source-lifecycle";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function loadSources() {
  const sources = await prisma.source.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { alerts: true, events: true, meetings: true, logs: true, volunteer: true } },
    },
  });

  return sources.map(({ _count, ...source }) => ({ ...source, counts: _count }));
}

async function main() {
  const sources = await loadSources();
  const actions = planSourceCleanup(sources);
  const summary = Object.fromEntries(
    ["keep", "merge", "retire", "delete"].map((kind) => [
      kind,
      actions.filter((entry) => entry.action === kind).length,
    ]),
  );

  console.info(JSON.stringify({ mode: apply ? "apply" : "dry-run", sourceCount: sources.length, summary, actions }, null, 2));
  if (!apply) {
    console.error("No changes made. Review this report, then re-run with --apply.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const action of actions.filter((entry) => entry.action === "merge")) {
      await Promise.all([
        tx.alert.updateMany({ where: { sourceId: action.sourceId }, data: { sourceId: action.targetId, sourceName: action.targetName } }),
        tx.event.updateMany({ where: { sourceId: action.sourceId }, data: { sourceId: action.targetId, sourceName: action.targetName } }),
        tx.meeting.updateMany({ where: { sourceId: action.sourceId }, data: { sourceId: action.targetId, sourceName: action.targetName } }),
        tx.scrapeLog.updateMany({ where: { sourceId: action.sourceId }, data: { sourceId: action.targetId, sourceName: action.targetName } }),
        tx.volunteerOpportunity.updateMany({ where: { sourceId: action.sourceId }, data: { sourceId: action.targetId, sourceName: action.targetName } }),
      ]);
      await tx.source.delete({ where: { id: action.sourceId } });
    }

    for (const action of actions) {
      if (action.action === "keep" && action.canonicalName) {
        await tx.source.update({ where: { id: action.sourceId }, data: { name: action.canonicalName } });
      } else if (action.action === "retire") {
        const source = await tx.source.findUnique({ where: { id: action.sourceId }, select: { active: true, notes: true } });
        if (source) await tx.source.update({ where: { id: action.sourceId }, data: retireSource(source) });
      } else if (action.action === "delete") {
        await tx.scrapeLog.updateMany({ where: { sourceId: action.sourceId }, data: { sourceId: null } });
        await tx.source.delete({ where: { id: action.sourceId } });
      }
    }
  });

  console.info("Source cleanup applied successfully.");
}

main()
  .catch((error) => {
    console.error("Source cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
