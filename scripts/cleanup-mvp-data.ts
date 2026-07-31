import { PrismaClient } from "@prisma/client";

import { startOfCommunityDay } from "../src/lib/hub-date";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const syntheticVolunteerEmails = [
  "volunteer@example.org",
  "animals@example.org",
  "woodstock@example.org",
  "marietta@example.org",
];

async function main() {
  const today = startOfCommunityDay();
  const [syntheticRecords, expiredOpenRecords] = await Promise.all([
    prisma.volunteerOpportunity.findMany({
      where: { contactEmail: { in: syntheticVolunteerEmails } },
      select: { id: true, title: true, contactEmail: true },
    }),
    prisma.volunteerOpportunity.findMany({
      where: {
        status: "OPEN",
        dateTime: { lt: today },
        NOT: { contactEmail: { in: syntheticVolunteerEmails } },
      },
      select: { id: true, title: true, dateTime: true },
    }),
  ]);

  console.info(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        syntheticRecordsToDelete: syntheticRecords,
        expiredRecordsToArchive: expiredOpenRecords,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.info("No changes made. Re-run with --apply after reviewing this output.");
    return;
  }

  const [deleted, archived] = await prisma.$transaction([
    prisma.volunteerOpportunity.deleteMany({
      where: { contactEmail: { in: syntheticVolunteerEmails } },
    }),
    prisma.volunteerOpportunity.updateMany({
      where: {
        status: "OPEN",
        dateTime: { lt: today },
        NOT: { contactEmail: { in: syntheticVolunteerEmails } },
      },
      data: { status: "ARCHIVED" },
    }),
  ]);

  console.info(`Deleted ${deleted.count} synthetic records and archived ${archived.count} expired records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
