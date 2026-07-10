import type { Alert, Event, Meeting, Subscriber, VolunteerOpportunity } from "@prisma/client";

import { parseStoredList } from "@/lib/hub-format";

export type DigestPayload = {
  subscriber: Subscriber | null;
  intro: string;
  featuredEvents: Event[];
  alerts: Alert[];
  meetings: Meeting[];
  volunteer: VolunteerOpportunity[];
};

export function buildWeeklyDigestPreview(input: {
  subscriber: Subscriber | null;
  events: Event[];
  alerts: Alert[];
  meetings: Meeting[];
  volunteer: VolunteerOpportunity[];
}): DigestPayload {
  const interests = input.subscriber ? parseStoredList(input.subscriber.interests) : [];
  const location = [input.subscriber?.city, input.subscriber?.county].filter(Boolean).join(", ");
  const intro =
    input.subscriber && interests.length > 0
      ? `A sample weekly digest for ${input.subscriber.email} focused on ${interests.join(", ")}${location ? ` in ${location}` : ""}.`
      : "A sample weekly digest blending events, alerts, meetings, and volunteer updates for the week ahead.";

  return {
    subscriber: input.subscriber,
    intro,
    featuredEvents: input.events.slice(0, 5),
    alerts: input.alerts.slice(0, 3),
    meetings: input.meetings.slice(0, 4),
    volunteer: input.volunteer.slice(0, 4),
  };
}
