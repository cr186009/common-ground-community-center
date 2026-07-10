import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  Category,
  EventStatus,
  MeetingStatus,
  MeetingType,
  Source,
  VolunteerStatus,
} from "@prisma/client";

export type NormalizedScrapedEvent = {
  title: string;
  description?: string | null;
  startDateTime: Date;
  endDateTime?: Date | null;
  locationName?: string | null;
  address?: string | null;
  city: string;
  county: string;
  category: Category;
  tags?: string[];
  cost?: string | null;
  isFree?: boolean;
  isKidFriendly?: boolean;
  isOutdoor?: boolean;
  sourceName: string;
  sourceUrl: string;
  originalUrl?: string | null;
  imageUrl?: string | null;
  status?: EventStatus;
  confidenceScore?: number | null;
};

export type NormalizedScrapedAlert = {
  title: string;
  description?: string | null;
  alertType: AlertType;
  severity: AlertSeverity;
  city?: string | null;
  county: string;
  locationName?: string | null;
  address?: string | null;
  sourceName: string;
  sourceUrl: string;
  originalUrl?: string | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  status?: AlertStatus;
};

export type NormalizedScrapedMeeting = {
  title: string;
  governmentBody: string;
  meetingType: MeetingType;
  startDateTime: Date;
  endDateTime?: Date | null;
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
  county: string;
  agendaUrl?: string | null;
  minutesUrl?: string | null;
  videoUrl?: string | null;
  sourceName: string;
  sourceUrl: string;
  originalUrl?: string | null;
  status?: MeetingStatus;
  summary?: string | null;
  plainEnglishSummary?: string | null;
  keyTopics?: string[];
  whyResidentsCare?: string | null;
};

export type NormalizedVolunteerOpportunity = {
  title: string;
  organization: string;
  description?: string | null;
  dateTime?: Date | null;
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
  county: string;
  category: string;
  contactName?: string | null;
  contactEmail?: string | null;
  sourceName: string;
  sourceUrl: string;
  status?: VolunteerStatus;
};

export type ScrapeOutput = {
  events?: NormalizedScrapedEvent[];
  alerts?: NormalizedScrapedAlert[];
  meetings?: NormalizedScrapedMeeting[];
  volunteer?: NormalizedVolunteerOpportunity[];
  status?: "SUCCESS" | "PARTIAL";
  message?: string;
};

export type SourceScraper = {
  sourceName: string;
  scrape: (source: Source) => Promise<ScrapeOutput>;
};
