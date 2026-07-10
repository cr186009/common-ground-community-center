import type {
  AlertSeverity,
  AlertType,
  Category,
  MeetingType,
  SourceSection,
  SourceType,
  SubmissionType,
} from "@prisma/client";

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME || "Common Ground Digital Community Center";

export const SITE_TAGLINE =
  "Events, alerts, public meetings, activities, and community resources across our local Georgia communities.";

export const HOME_HEADLINE =
  "Everything happening nearby. All in one place.";

export const HOME_SUBHEADLINE =
  "Events, alerts, public meetings, activities, and community resources across our local Georgia communities.";

export const COUNTY_FILTERS = ["Paulding", "Polk", "Cobb", "Bartow", "Cherokee"] as const;

export const CITY_FILTERS = [
  "Dallas",
  "Hiram",
  "Rockmart",
  "Cedartown",
  "Woodstock",
  "Rome",
  "Canton",
  "Adairsville",
  "Marietta",
  "Acworth",
  "Kennesaw",
  "Smyrna",
  "Powder Springs",
] as const;

export const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: "FAMILY", label: "Family" },
  { value: "PARKS_RECREATION", label: "Parks & Recreation" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "MUSIC", label: "Music" },
  { value: "TRIVIA", label: "Trivia" },
  { value: "KARAOKE", label: "Karaoke" },
  { value: "FOOD_DRINK", label: "Food & Drink" },
  { value: "SPORTS", label: "Sports" },
  { value: "LIBRARY", label: "Library" },
  { value: "SCHOOL", label: "School" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "GOVERNMENT_MEETING", label: "Government Meeting" },
  { value: "OTHER", label: "Other" },
];

export const ALERT_TYPE_OPTIONS: Array<{ value: AlertType; label: string }> = [
  { value: "ROAD_CLOSURE", label: "Road Closure" },
  { value: "TRAFFIC", label: "Traffic" },
  { value: "SEVERE_WEATHER", label: "Severe Weather" },
  { value: "MISSING_PERSON", label: "Missing Person" },
  { value: "PUBLIC_SAFETY", label: "Public Safety" },
  { value: "UTILITY_OUTAGE", label: "Utility Outage" },
  { value: "BOIL_WATER_ADVISORY", label: "Boil Water Advisory" },
  { value: "SCHOOL_CLOSURE", label: "School Closure" },
  { value: "SCAM_WARNING", label: "Scam Warning" },
  { value: "EMERGENCY_NOTICE", label: "Emergency Notice" },
  { value: "OTHER", label: "Other" },
];

export const ALERT_SEVERITY_OPTIONS: Array<{ value: AlertSeverity; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "EMERGENCY", label: "Emergency" },
];

export const MEETING_TYPE_OPTIONS: Array<{ value: MeetingType; label: string }> = [
  { value: "CITY_COUNCIL", label: "City Council" },
  { value: "COUNTY_COMMISSION", label: "County Commission" },
  { value: "SCHOOL_BOARD", label: "School Board" },
  { value: "PLANNING_ZONING", label: "Planning & Zoning" },
  { value: "PUBLIC_HEARING", label: "Public Hearing" },
  { value: "PARKS_BOARD", label: "Parks Board" },
  { value: "OTHER", label: "Other" },
];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  WEBSITE: "Website",
  CALENDAR: "Calendar",
  FACEBOOK: "Facebook",
  MANUAL: "Manual",
  GOVERNMENT: "Government",
  RECREATION: "Recreation",
  RESTAURANT: "Restaurant",
  MUSIC_VENUE: "Music Venue",
  POLICE: "Police",
  SHERIFF: "Sheriff",
};

export const SOURCE_SECTION_LABELS: Record<SourceSection, string> = {
  EVENTS: "Events",
  ALERTS: "Alerts",
  MEETINGS: "Meetings",
  ACTIVITIES: "Activities",
  VOLUNTEER: "Volunteer",
};

export const SUBMISSION_TYPE_OPTIONS: Array<{ value: SubmissionType; label: string }> = [
  { value: "EVENT", label: "Event" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "VOLUNTEER", label: "Volunteer opportunity" },
  { value: "COMMUNITY_NOTICE", label: "Community notice" },
];

export const DIGEST_INTEREST_OPTIONS = [
  "Family",
  "Music",
  "Free Events",
  "Public Meetings",
  "Alerts",
  "Volunteer",
  "Food & Drink",
] as const;

export const ACTIVITY_CATEGORIES: Category[] = [
  "TRIVIA",
  "KARAOKE",
  "MUSIC",
  "FOOD_DRINK",
  "FAMILY",
  "PARKS_RECREATION",
  "LIBRARY",
];

export const ADMIN_COOKIE_NAME = "common-ground-community-center-admin";
