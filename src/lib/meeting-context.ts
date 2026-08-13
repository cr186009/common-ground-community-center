import type { Meeting } from "@prisma/client";
import { getMeetingTypeLabel } from "@/lib/hub-format";

type MeetingContext = Pick<Meeting, "governmentBody" | "meetingType" | "plainEnglishSummary" | "summary" | "whyResidentsCare">;

export function getMeetingContext(meeting: MeetingContext) {
  const supplied = meeting.plainEnglishSummary?.trim() || meeting.summary?.trim();
  if (supplied) return supplied;

  const type = getMeetingTypeLabel(meeting.meetingType).toLocaleLowerCase("en-US");
  return `${meeting.governmentBody} will hold a ${type}. Open the meeting details or official source for agenda items, participation instructions, and any schedule updates.`;
}

export function getMeetingWhyItMatters(meeting: MeetingContext) {
  return meeting.whyResidentsCare?.trim() ||
    "This public meeting may affect local services, budgets, development, infrastructure, schools, parks, or other community decisions.";
}
