import type { MeetingStatus, MeetingType } from "@prisma/client";

import type {
  NormalizedScrapedEvent,
  NormalizedScrapedMeeting,
} from "@/server/hub-scrapers/types";

export type CanonicalContentType =
  | "event"
  | "meeting"
  | "alert"
  | "volunteer";

const PUBLIC_BODY_TITLE_PATTERN =
  /\b(?:board of commissioners|county commission(?:ers)?|city council|mayor and council|school board|board of education|planning (?:and|&) zoning|planning commission|zoning (?:board|hearing)|public hearing|(?:development|housing|airport|water(?: and sewer)?) authority meeting)\b/i;

const EXPLICIT_MEETING_TITLE_PATTERN =
  /\b(?:meeting|work session|public hearing)\b/i;

const GOVERNMENT_MEETING_SOURCE_PATTERN =
  /\b(?:public meetings?|city council|county commission(?:ers)?|board of (?:commissioners|education)|county government|planning (?:and|&) zoning)\b/i;

export function classifyEventContent(
  event: Pick<
    NormalizedScrapedEvent,
    "category" | "title" | "description" | "meetingDetails"
  > & Partial<Pick<NormalizedScrapedEvent, "sourceName">>,
): CanonicalContentType {
  // A scraper can explicitly declare a normalized meeting either by assigning
  // the canonical category or by supplying structured meeting metadata.
  if (event.category === "GOVERNMENT_MEETING" || event.meetingDetails) {
    return "meeting";
  }

  // Fall back only for titles that name a recognized public body/proceeding.
  // Descriptions are deliberately excluded: community listings routinely use
  // words such as board, commission, and meeting in unrelated senses.
  if (PUBLIC_BODY_TITLE_PATTERN.test(event.title)) {
    return "meeting";
  }

  const hasMeetingTitle = EXPLICIT_MEETING_TITLE_PATTERN.test(event.title);
  const hasGovernmentSource = GOVERNMENT_MEETING_SOURCE_PATTERN.test(
    event.sourceName ?? "",
  );
  return hasMeetingTitle && hasGovernmentSource ? "meeting" : "event";
}

export function inferMeetingType(text: string): MeetingType {
  if (/\b(?:board of commissioners|county commission)\b/i.test(text)) {
    return "COUNTY_COMMISSION";
  }
  if (/\b(?:city council|mayor and council)\b/i.test(text)) {
    return "CITY_COUNCIL";
  }
  if (/\b(?:school board|board of education)\b/i.test(text)) {
    return "SCHOOL_BOARD";
  }
  if (/\b(?:planning|zoning)\b/i.test(text)) {
    return "PLANNING_ZONING";
  }
  if (/\bpublic hearing\b/i.test(text)) {
    return "PUBLIC_HEARING";
  }
  return "OTHER";
}

export function getMeetingStatus(
  startDateTime: Date,
  endDateTime?: Date | null,
  now = new Date(),
): MeetingStatus {
  return (endDateTime ?? startDateTime).getTime() < now.getTime()
    ? "COMPLETED"
    : "UPCOMING";
}

function inferGovernmentBody(event: NormalizedScrapedEvent) {
  const text = `${event.title} ${event.description ?? ""}`;
  if (/\bboard of commissioners\b/i.test(text)) {
    return `${event.county} Board of Commissioners`;
  }
  if (/\b(?:city council|mayor and council)\b/i.test(text)) {
    return event.city ? `City of ${event.city}` : event.sourceName;
  }
  if (/\b(?:planning|zoning)\b/i.test(text)) {
    return event.city
      ? `${event.city} Planning and Zoning`
      : `${event.county} Planning and Zoning`;
  }
  return event.sourceName;
}

export function eventToMeeting(
  event: NormalizedScrapedEvent,
  now = new Date(),
): NormalizedScrapedMeeting {
  const text = `${event.title} ${event.description ?? ""}`;
  return {
    title: event.title,
    governmentBody:
      event.meetingDetails?.governmentBody ?? inferGovernmentBody(event),
    meetingType:
      event.meetingDetails?.meetingType ?? inferMeetingType(text),
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    locationName: event.locationName,
    address: event.address,
    city: event.city,
    county: event.county,
    agendaUrl: event.meetingDetails?.agendaUrl,
    minutesUrl: event.meetingDetails?.minutesUrl,
    videoUrl: event.meetingDetails?.videoUrl,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    originalUrl: event.originalUrl,
    status: getMeetingStatus(event.startDateTime, event.endDateTime, now),
    summary: event.description,
  };
}
