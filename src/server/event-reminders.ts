import { formatDateTimeRange } from "@/lib/hub-format";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/notifications";

export function reminderWindow(now = new Date()) {
  return {
    start: new Date(now.getTime() + 18 * 60 * 60 * 1000),
    end: new Date(now.getTime() + 30 * 60 * 60 * 1000),
  };
}

export async function sendDueEventReminders(now = new Date()) {
  const window = reminderWindow(now);
  const due = await prisma.eventInterest.findMany({
    where: {
      reminderRequested: true,
      reminderSentAt: null,
      OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: new Date(now.getTime() - 30 * 60 * 1000) } }],
      event: { status: "APPROVED", startDateTime: { gte: window.start, lte: window.end } },
    },
    include: { event: true },
    take: 250,
  });

  let sent = 0;
  let failed = 0;
  for (const interest of due) {
    const claimed = await prisma.eventInterest.updateMany({
      where: { id: interest.id, reminderSentAt: null, OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: new Date(now.getTime() - 30 * 60 * 1000) } }] },
      data: { reminderClaimedAt: now, reminderFailure: null },
    });
    if (claimed.count !== 1) continue;

    try {
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/u, "");
      const result = await sendEmail({
        to: interest.email,
        subject: `Reminder: ${interest.event.title}`,
        text: [
          `You asked Common Ground to remind you about ${interest.event.title}.`,
          `When: ${formatDateTimeRange(interest.event.startDateTime, interest.event.endDateTime, interest.event.isAllDay)}`,
          `Where: ${[interest.event.locationName, interest.event.address, interest.event.city].filter(Boolean).join(", ")}`,
          baseUrl ? `Details: ${baseUrl}/events/${interest.event.id}` : `Official source: ${interest.event.originalUrl || interest.event.sourceUrl}`,
          "Please confirm final details with the official event source before leaving.",
        ].join("\n\n"),
      });
      if (!result.sent) throw new Error("Email provider is not configured.");
      await prisma.eventInterest.update({ where: { id: interest.id }, data: { reminderSentAt: new Date(), reminderClaimedAt: null } });
      sent += 1;
    } catch (error) {
      await prisma.eventInterest.update({
        where: { id: interest.id },
        data: { reminderClaimedAt: null, reminderFailure: error instanceof Error ? error.message.slice(0, 500) : "Unknown reminder error" },
      });
      failed += 1;
    }
  }
  return { found: due.length, sent, failed };
}
