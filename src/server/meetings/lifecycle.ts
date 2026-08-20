import { prisma } from "@/lib/prisma";

export async function completeElapsedMeetings(now = new Date()) {
  return prisma.meeting.updateMany({
    where: {
      status: "UPCOMING",
      OR: [
        { endDateTime: { lt: now } },
        { endDateTime: null, startDateTime: { lt: now } },
      ],
    },
    data: { status: "COMPLETED" },
  });
}
