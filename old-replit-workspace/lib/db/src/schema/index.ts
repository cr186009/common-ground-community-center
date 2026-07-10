import { pgTable, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const categoryEnum = pgEnum("category", [
  "FAMILY", "PARKS_RECREATION", "FESTIVAL", "MUSIC", "TRIVIA",
  "KARAOKE", "FOOD_DRINK", "SPORTS", "LIBRARY", "SCHOOL",
  "VOLUNTEER", "GOVERNMENT_MEETING", "OTHER",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "APPROVED", "PENDING", "REJECTED", "ARCHIVED",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "ROAD_CLOSURE", "TRAFFIC", "SEVERE_WEATHER", "MISSING_PERSON",
  "PUBLIC_SAFETY", "UTILITY_OUTAGE", "BOIL_WATER_ADVISORY",
  "SCHOOL_CLOSURE", "SCAM_WARNING", "EMERGENCY_NOTICE", "OTHER",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "LOW", "MEDIUM", "HIGH", "EMERGENCY",
]);

export const alertStatusEnum = pgEnum("alert_status", ["ACTIVE", "EXPIRED"]);

export const meetingTypeEnum = pgEnum("meeting_type", [
  "CITY_COUNCIL", "COUNTY_COMMISSION", "SCHOOL_BOARD",
  "PLANNING_ZONING", "PUBLIC_HEARING", "PARKS_BOARD", "OTHER",
]);

export const meetingStatusEnum = pgEnum("meeting_status", [
  "UPCOMING", "COMPLETED", "CANCELLED", "ARCHIVED",
]);

export const volunteerStatusEnum = pgEnum("volunteer_status", [
  "OPEN", "FILLED", "CANCELLED",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "WEBSITE", "CALENDAR", "FACEBOOK", "MANUAL", "GOVERNMENT",
  "RECREATION", "RESTAURANT", "MUSIC_VENUE", "POLICE", "SHERIFF",
]);

export const sourceSectionEnum = pgEnum("source_section", [
  "EVENTS", "ALERTS", "MEETINGS", "ACTIVITIES", "VOLUNTEER",
]);

export const submissionTypeEnum = pgEnum("submission_type", [
  "EVENT", "ACTIVITY", "VOLUNTEER", "COMMUNITY_NOTICE",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "PENDING", "APPROVED", "REJECTED",
]);

// ── Tables ─────────────────────────────────────────────────────────────────────

export const eventsTable = pgTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull().default("OTHER"),
  status: eventStatusEnum("status").notNull().default("APPROVED"),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time"),
  locationName: text("location_name"),
  address: text("address"),
  city: text("city"),
  county: text("county"),
  cost: text("cost"),
  isFree: boolean("is_free").notNull().default(false),
  isKidFriendly: boolean("is_kid_friendly").notNull().default(false),
  isOutdoor: boolean("is_outdoor").notNull().default(false),
  tags: text("tags"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  originalUrl: text("original_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const alertsTable = pgTable("alerts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  alertType: alertTypeEnum("alert_type").notNull().default("OTHER"),
  severity: alertSeverityEnum("severity").notNull().default("LOW"),
  status: alertStatusEnum("status").notNull().default("ACTIVE"),
  city: text("city"),
  county: text("county"),
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const meetingsTable = pgTable("meetings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  governmentBody: text("government_body").notNull(),
  meetingType: meetingTypeEnum("meeting_type").notNull().default("OTHER"),
  status: meetingStatusEnum("status").notNull().default("UPCOMING"),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time"),
  locationName: text("location_name"),
  address: text("address"),
  city: text("city"),
  county: text("county"),
  agendaUrl: text("agenda_url"),
  minutesUrl: text("minutes_url"),
  videoUrl: text("video_url"),
  originalUrl: text("original_url"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  summary: text("summary"),
  plainEnglishSummary: text("plain_english_summary"),
  whyResidentsCare: text("why_residents_care"),
  keyTopics: text("key_topics"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const volunteerOpportunitiesTable = pgTable("volunteer_opportunities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  description: text("description"),
  dateTime: timestamp("date_time"),
  locationName: text("location_name"),
  city: text("city"),
  county: text("county"),
  status: volunteerStatusEnum("status").notNull().default("OPEN"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sourcesTable = pgTable("sources", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: sourceTypeEnum("type").notNull().default("WEBSITE"),
  section: sourceSectionEnum("section").notNull().default("EVENTS"),
  county: text("county"),
  city: text("city"),
  active: boolean("active").notNull().default(true),
  lastScrapedAt: timestamp("last_scraped_at"),
  scrapeFrequency: text("scrape_frequency"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const submittedEventsTable = pgTable("submitted_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  submissionType: submissionTypeEnum("submission_type").notNull().default("EVENT"),
  category: categoryEnum("category").notNull().default("OTHER"),
  title: text("title").notNull(),
  description: text("description"),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time"),
  locationName: text("location_name"),
  address: text("address"),
  city: text("city").notNull(),
  county: text("county").notNull(),
  cost: text("cost"),
  tags: text("tags"),
  sourceUrl: text("source_url"),
  isFree: boolean("is_free").notNull().default(false),
  isKidFriendly: boolean("is_kid_friendly").notNull().default(false),
  isOutdoor: boolean("is_outdoor").notNull().default(false),
  status: submissionStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscribersTable = pgTable("subscribers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  city: text("city"),
  county: text("county"),
  interests: text("interests"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Insert schemas ─────────────────────────────────────────────────────────────

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVolunteerSchema = createInsertSchema(volunteerOpportunitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSourceSchema = createInsertSchema(sourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubmittedEventSchema = createInsertSchema(submittedEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Event = typeof eventsTable.$inferSelect;
export type Alert = typeof alertsTable.$inferSelect;
export type Meeting = typeof meetingsTable.$inferSelect;
export type VolunteerOpportunity = typeof volunteerOpportunitiesTable.$inferSelect;
export type Source = typeof sourcesTable.$inferSelect;
export type SubmittedEvent = typeof submittedEventsTable.$inferSelect;
export type Subscriber = typeof subscribersTable.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type InsertSubmittedEvent = z.infer<typeof insertSubmittedEventSchema>;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
