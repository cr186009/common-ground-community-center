// Local type aliases matching the API response shapes.
// Dates are ISO strings (as returned from JSON). Optional fields use
// `string | null | undefined` to match the generated OpenAPI client types.

export type Category =
  | "FAMILY" | "PARKS_RECREATION" | "FESTIVAL" | "MUSIC" | "TRIVIA"
  | "KARAOKE" | "FOOD_DRINK" | "SPORTS" | "LIBRARY" | "SCHOOL"
  | "VOLUNTEER" | "GOVERNMENT_MEETING" | "OTHER";

export type EventStatus = "APPROVED" | "PENDING" | "REJECTED" | "ARCHIVED";

export type AlertType =
  | "ROAD_CLOSURE" | "TRAFFIC" | "SEVERE_WEATHER" | "MISSING_PERSON"
  | "PUBLIC_SAFETY" | "UTILITY_OUTAGE" | "BOIL_WATER_ADVISORY"
  | "SCHOOL_CLOSURE" | "SCAM_WARNING" | "EMERGENCY_NOTICE" | "OTHER";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
export type AlertStatus = "ACTIVE" | "EXPIRED";

export type MeetingType =
  | "CITY_COUNCIL" | "COUNTY_COMMISSION" | "SCHOOL_BOARD"
  | "PLANNING_ZONING" | "PUBLIC_HEARING" | "PARKS_BOARD" | "OTHER";

export type MeetingStatus = "UPCOMING" | "COMPLETED" | "CANCELLED" | "ARCHIVED";

export type VolunteerStatus = "OPEN" | "FILLED" | "CANCELLED";

export type SourceType =
  | "WEBSITE" | "CALENDAR" | "FACEBOOK" | "MANUAL" | "GOVERNMENT"
  | "RECREATION" | "RESTAURANT" | "MUSIC_VENUE" | "POLICE" | "SHERIFF";

export type SourceSection = "EVENTS" | "ALERTS" | "MEETINGS" | "ACTIVITIES" | "VOLUNTEER";
export type SubmissionType = "EVENT" | "ACTIVITY" | "VOLUNTEER" | "COMMUNITY_NOTICE";

// API shapes — dates are ISO strings as returned by JSON.
// Optional fields use `| undefined` to be compatible with the generated OpenAPI client types.
export interface HubEvent {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  startDateTime: string;
  endDateTime?: string | null;
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
  county?: string | null;
  cost?: string | null;
  isFree: boolean;
  isKidFriendly: boolean;
  isOutdoor: boolean;
  tags?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  originalUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubAlert {
  id: string;
  title: string;
  description?: string | null;
  alertType: string;
  severity: string;
  status: string;
  city?: string | null;
  county?: string | null;
  startsAt: string;
  expiresAt?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubMeeting {
  id: string;
  title: string;
  governmentBody: string;
  meetingType: string;
  status: string;
  startDateTime: string;
  endDateTime?: string | null;
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
  county?: string | null;
  agendaUrl?: string | null;
  minutesUrl?: string | null;
  videoUrl?: string | null;
  originalUrl?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  summary?: string | null;
  plainEnglishSummary?: string | null;
  whyResidentsCare?: string | null;
  keyTopics?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubVolunteerOpportunity {
  id: string;
  title: string;
  organization: string;
  description?: string | null;
  dateTime?: string | null;
  locationName?: string | null;
  city?: string | null;
  county?: string | null;
  status: string;
  contactName?: string | null;
  contactEmail?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubSource {
  id: string;
  name: string;
  url: string;
  type: string;
  section: string;
  county?: string | null;
  city?: string | null;
  active: boolean;
  lastScrapedAt?: string | null;
  notes?: string | null;
  eventCount: number;
  alertCount: number;
  meetingCount: number;
  volunteerCount: number;
}

export interface HomepageData {
  topAlert?: HubAlert | null;
  upcomingEvents: HubEvent[];
  weekendEvents: HubEvent[];
  freeEvents: HubEvent[];
  kidFriendlyEvents: HubEvent[];
  upcomingMeetings: HubMeeting[];
  volunteerOpportunities: HubVolunteerOpportunity[];
  pendingSubmissions: number;
  activeSubscriberCount: number;
  lastUpdatedAt?: string | null;
}

export interface AlertsResult {
  activeAlerts: HubAlert[];
  expiredAlerts: HubAlert[];
}

export interface MeetingsResult {
  upcomingMeetings: HubMeeting[];
  completedMeetings: HubMeeting[];
  governmentBodies: string[];
}

export interface SearchResults {
  events: HubEvent[];
  alerts: HubAlert[];
  meetings: HubMeeting[];
  volunteer: HubVolunteerOpportunity[];
}
