import type { Meeting } from "@prisma/client";

import { parseStoredList } from "@/lib/hub-format";

export async function generateMeetingPlainEnglishSummary(meeting: Meeting) {
  const keyTopics = parseStoredList(meeting.keyTopics);
  const topicsText = keyTopics.length > 0 ? keyTopics.join(", ") : "local government business";
  const summary = `${meeting.governmentBody} is scheduled to discuss ${topicsText}. This placeholder summary can be replaced by an AI-generated version later.`;
  const residentImpact =
    meeting.whyResidentsCare ||
    "Residents may care because these decisions can affect neighborhood services, budgets, development, and day-to-day community planning.";

  return {
    plainEnglishSummary: summary,
    whyResidentsCare: residentImpact,
  };
}
