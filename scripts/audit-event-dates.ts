import { prisma } from "../src/lib/prisma";
import { auditEventDate } from "../src/lib/event-date-audit";

async function main() {
  const events = await prisma.event.findMany({
    where: { status: { in: ["APPROVED", "PENDING"] } },
    orderBy: [{ startDateTime: "asc" }, { title: "asc" }],
    select: {
      id: true, title: true, description: true, startDateTime: true,
      timeZone: true, status: true, sourceName: true, originalUrl: true,
    },
  });
  const results = events.map((event) => ({ ...event, audit: auditEventDate(event) }));
  const discrepancies = results.filter(({ audit }) => audit.status === "CONFLICT" || audit.status === "AMBIGUOUS");
  const summary = results.reduce<Record<string, number>>((counts, { audit }) => {
    counts[audit.status] = (counts[audit.status] ?? 0) + 1;
    return counts;
  }, {});

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    totalEvents: events.length,
    summary,
    discrepancyCount: discrepancies.length,
    discrepancies,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
