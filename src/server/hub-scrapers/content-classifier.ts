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

const MEETING_TITLE_PATTERN =
  /\b(?:board of commissioners|city council|county commission|planning (?:and|&) zoning|planning commission|zoning (?:board|hearing)|public hearing|work session|called meeting|regular meeting|special meeting|committee meeting|authority meeting)\b/i;

export function classifyEventContent(
  event: Pick<NormalizedScrapedEvent, "category" | "title" | "description">,
): CanonicalContentType {
  if (event.category === "GOVERNMENT_MEETING") {
    return "meeting";
  }

  const text = `${event.title} ${event.description ?? ""}`;
  return MEETING_TITLE_PATTERN.test(text) ? "meeting" : "event";
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
