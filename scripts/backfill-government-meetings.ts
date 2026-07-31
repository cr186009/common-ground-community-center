import { prisma } from "../src/lib/prisma";
import {
  eventToMeeting,
  getMeetingStatus,
} from "../src/server/hub-scrapers/content-classifier";
import { completeElapsedMeetings } from "../src/server/meetings/lifecycle";

const apply = process.argv.includes("--apply");

async function main() {
  const events = await prisma.event.findMany({
    where: { category: "GOVERNMENT_MEETING" },
    orderBy: { startDateTime: "asc" },
  });

  console.log(
    `${apply ? "Migrating" : "Would migrate"} ${events.length} government meeting event(s).`,
  );

  if (!apply) {
    for (const event of events) {
      console.log(`- ${event.startDateTime.toISOString()} ${event.title}`);
    }
    console.log("\nDry run only. Re-run with --apply to migrate records atomically.");
    return;
  }

  let migrated = 0;
  for (const event of events) {
    const meeting = eventToMeeting(event);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.meeting.findFirst({
        where: {
          title: meeting.title,
          startDateTime: meeting.startDateTime,
          sourceName: meeting.sourceName,
        },
      });
      const data = {
        title: meeting.title,
        governmentBody: meeting.governmentBody,
        meetingType: meeting.meetingType,
        startDateTime: meeting.startDateTime,
        endDateTime: meeting.endDateTime,
        locationName: meeting.locationName,
        address: meeting.address,
        city: meeting.city,
        county: meeting.county,
        sourceName: meeting.sourceName,
        sourceUrl: meeting.sourceUrl,
        originalUrl: meeting.originalUrl,
        status: getMeetingStatus(meeting.startDateTime, meeting.endDateTime),
        summary: meeting.summary,
        createdAt: event.createdAt,
        lastSeenAt: event.lastSeenAt,
        sourceId: event.sourceId,
      };

      if (existing) {
        await tx.meeting.update({ where: { id: existing.id }, data });
      } else {
        await tx.meeting.create({ data });
      }
      await tx.event.delete({ where: { id: event.id } });
    });
    migrated += 1;
  }

  const completed = await completeElapsedMeetings();
  console.log(
    `Migrated ${migrated} event(s); completed ${completed.count} elapsed meeting(s).`,
  );
}

main()
  .catch((error) => {
    console.error("Meeting backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
