import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyEventContent,
  eventToMeeting,
  getMeetingStatus,
  inferMeetingType,
} from "./content-classifier";

test("explicit government meeting category routes to meetings", () => {
  assert.equal(
    classifyEventContent({
      category: "GOVERNMENT_MEETING",
      title: "Monthly session",
      description: null,
    }),
    "meeting",
  );
});

test("strong civic titles route without relying on scraper category", () => {
  assert.equal(
    classifyEventContent({
      category: "OTHER",
      title: "Board of Commissioners Work Session",
      description: null,
    }),
    "meeting",
  );
  assert.equal(
    classifyEventContent({
      category: "OTHER",
      title: "Community board game night",
      description: null,
    }),
    "event",
  );
});

test("meeting types are inferred from canonical government terms", () => {
  assert.equal(inferMeetingType("Dallas City Council"), "CITY_COUNCIL");
  assert.equal(
    inferMeetingType("Paulding Board of Commissioners"),
    "COUNTY_COMMISSION",
  );
  assert.equal(inferMeetingType("Planning & Zoning"), "PLANNING_ZONING");
});

test("meeting status uses the end time when available", () => {
  const now = new Date("2026-07-31T16:00:00Z");
  assert.equal(
    getMeetingStatus(
      new Date("2026-07-31T15:00:00Z"),
      new Date("2026-07-31T17:00:00Z"),
      now,
    ),
    "UPCOMING",
  );
  assert.equal(
    getMeetingStatus(new Date("2026-07-31T15:00:00Z"), null, now),
    "COMPLETED",
  );
});

test("event conversion preserves meeting documents and source fields", () => {
  const meeting = eventToMeeting(
    {
      title: "City Council Regular Meeting",
      description: "Monthly business meeting",
      startDateTime: new Date("2026-08-01T22:00:00Z"),
      city: "Dallas",
      county: "Paulding",
      category: "GOVERNMENT_MEETING",
      sourceName: "City calendar",
      sourceUrl: "https://example.gov/calendar",
      originalUrl: "https://example.gov/meeting/1",
      meetingDetails: {
        agendaUrl: "https://example.gov/agenda/1.pdf",
        minutesUrl: "https://example.gov/minutes/1.pdf",
      },
    },
    new Date("2026-07-31T16:00:00Z"),
  );

  assert.equal(meeting.governmentBody, "City of Dallas");
  assert.equal(meeting.meetingType, "CITY_COUNCIL");
  assert.equal(meeting.agendaUrl, "https://example.gov/agenda/1.pdf");
  assert.equal(meeting.minutesUrl, "https://example.gov/minutes/1.pdf");
  assert.equal(meeting.originalUrl, "https://example.gov/meeting/1");
});
