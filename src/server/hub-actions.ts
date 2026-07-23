"use server";

import {
  type AlertSeverity,
  type AlertType,
  type Category,
  type MeetingStatus,
  type MeetingType,
  type SourceSection,
  type SourceType,
  type SubmissionType,
} from "@prisma/client";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  clearAdminSession,
  createAdminSession,
  getAdminPassword,
  isAdminAuthenticated,
} from "@/server/hub-auth";
import {
  scrapeAllSupportedSources,
  scrapeSingleSourceById,
} from "@/server/hub-scrapers";
import { generateMeetingPlainEnglishSummary } from "@/services/meeting-summary-service";

const CATEGORY_VALUES = [
  "FAMILY",
  "PARKS_RECREATION",
  "FESTIVAL",
  "MUSIC",
  "TRIVIA",
  "KARAOKE",
  "FOOD_DRINK",
  "SPORTS",
  "LIBRARY",
  "GOVERNMENT_MEETING",
  "VOLUNTEER",
  "SCHOOL",
  "OTHER",
] as const;

const ALERT_TYPE_VALUES = [
  "ROAD_CLOSURE",
  "TRAFFIC",
  "SEVERE_WEATHER",
  "MISSING_PERSON",
  "PUBLIC_SAFETY",
  "UTILITY_OUTAGE",
  "BOIL_WATER_ADVISORY",
  "SCHOOL_CLOSURE",
  "SCAM_WARNING",
  "EMERGENCY_NOTICE",
  "OTHER",
] as const;

const ALERT_SEVERITY_VALUES = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"] as const;
const MEETING_TYPE_VALUES = [
  "CITY_COUNCIL",
  "COUNTY_COMMISSION",
  "SCHOOL_BOARD",
  "PLANNING_ZONING",
  "PUBLIC_HEARING",
  "PARKS_BOARD",
  "OTHER",
] as const;
const SOURCE_TYPE_VALUES = [
  "WEBSITE",
  "CALENDAR",
  "FACEBOOK",
  "MANUAL",
  "GOVERNMENT",
  "RECREATION",
  "RESTAURANT",
  "MUSIC_VENUE",
  "POLICE",
  "SHERIFF",
] as const;
const SOURCE_SECTION_VALUES = ["EVENTS", "ALERTS", "MEETINGS", "ACTIVITIES", "VOLUNTEER"] as const;
const SUBMISSION_TYPE_VALUES = ["EVENT", "ACTIVITY", "VOLUNTEER", "COMMUNITY_NOTICE"] as const;

const eventFormSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startDateTime: z.string().min(1),
  endDateTime: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(2),
  county: z.string().min(2),
  category: z.enum(CATEGORY_VALUES),
  cost: z.string().optional(),
  tags: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const alertFormSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  alertType: z.enum(ALERT_TYPE_VALUES),
  severity: z.enum(ALERT_SEVERITY_VALUES),
  city: z.string().optional(),
  county: z.string().min(2),
  locationName: z.string().optional(),
  address: z.string().optional(),
  sourceUrl: z.string().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

const meetingFormSchema = z.object({
  title: z.string().min(3),
  governmentBody: z.string().min(3),
  meetingType: z.enum(MEETING_TYPE_VALUES),
  startDateTime: z.string().min(1),
  endDateTime: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  county: z.string().min(2),
  agendaUrl: z.string().optional(),
  minutesUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  summary: z.string().optional(),
  plainEnglishSummary: z.string().optional(),
  keyTopics: z.string().optional(),
  whyResidentsCare: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const volunteerFormSchema = z.object({
  title: z.string().min(3),
  organization: z.string().min(2),
  description: z.string().optional(),
  dateTime: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  county: z.string().min(2),
  category: z.string().min(2),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const sourceFormSchema = z.object({
  name: z.string().min(3),
  url: z.string().url(),
  type: z.enum(SOURCE_TYPE_VALUES),
  section: z.enum(SOURCE_SECTION_VALUES),
  city: z.string().optional(),
  county: z.string().min(2),
  scrapeFrequency: z.string().optional(),
  notes: z.string().optional(),
});

const subscriberSchema = z.object({
  email: z.string().email(),
  city: z.string().optional(),
  county: z.string().optional(),
});

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true" || formData.get(key) === "1";
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed;
}

function parseList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseEventPayload(formData: FormData) {
  const parsed = eventFormSchema.parse({
    title: getString(formData, "title"),
    description: getString(formData, "description") || undefined,
    startDateTime: getString(formData, "startDateTime"),
    endDateTime: getString(formData, "endDateTime") || undefined,
    locationName: getString(formData, "locationName") || undefined,
    address: getString(formData, "address") || undefined,
    city: getString(formData, "city"),
    county: getString(formData, "county"),
    category: getString(formData, "category") as Category,
    cost: getString(formData, "cost") || undefined,
    tags: getString(formData, "tags") || undefined,
    sourceUrl: getString(formData, "sourceUrl") || undefined,
  });

  return {
    ...parsed,
    startDateTime: parseDate(parsed.startDateTime)!,
    endDateTime: parseDate(parsed.endDateTime),
    tagList: parseList(parsed.tags),
    isFree: getBoolean(formData, "isFree"),
    isKidFriendly: getBoolean(formData, "isKidFriendly"),
    isOutdoor: getBoolean(formData, "isOutdoor"),
  };
}

function parseAlertPayload(formData: FormData) {
  const parsed = alertFormSchema.parse({
    title: getString(formData, "title"),
    description: getString(formData, "description") || undefined,
    alertType: getString(formData, "alertType") as AlertType,
    severity: getString(formData, "severity") as AlertSeverity,
    city: getString(formData, "city") || undefined,
    county: getString(formData, "county"),
    locationName: getString(formData, "locationName") || undefined,
    address: getString(formData, "address") || undefined,
    sourceUrl: getString(formData, "sourceUrl") || undefined,
    startsAt: getString(formData, "startsAt") || undefined,
    expiresAt: getString(formData, "expiresAt") || undefined,
  });

  return {
    ...parsed,
    startsAt: parseDate(parsed.startsAt),
    expiresAt: parseDate(parsed.expiresAt),
  };
}

function parseMeetingPayload(formData: FormData) {
  const parsed = meetingFormSchema.parse({
    title: getString(formData, "title"),
    governmentBody: getString(formData, "governmentBody"),
    meetingType: getString(formData, "meetingType") as MeetingType,
    startDateTime: getString(formData, "startDateTime"),
    endDateTime: getString(formData, "endDateTime") || undefined,
    locationName: getString(formData, "locationName") || undefined,
    address: getString(formData, "address") || undefined,
    city: getString(formData, "city") || undefined,
    county: getString(formData, "county"),
    agendaUrl: getString(formData, "agendaUrl") || undefined,
    minutesUrl: getString(formData, "minutesUrl") || undefined,
    videoUrl: getString(formData, "videoUrl") || undefined,
    summary: getString(formData, "summary") || undefined,
    plainEnglishSummary: getString(formData, "plainEnglishSummary") || undefined,
    keyTopics: getString(formData, "keyTopics") || undefined,
    whyResidentsCare: getString(formData, "whyResidentsCare") || undefined,
    sourceUrl: getString(formData, "sourceUrl") || undefined,
  });

  const startDateTime = parseDate(parsed.startDateTime)!;

  return {
    ...parsed,
    startDateTime,
    endDateTime: parseDate(parsed.endDateTime),
    keyTopicsList: parseList(parsed.keyTopics),
    status: (startDateTime > new Date() ? "UPCOMING" : "COMPLETED") as MeetingStatus,
  };
}

function parseVolunteerPayload(formData: FormData) {
  const parsed = volunteerFormSchema.parse({
    title: getString(formData, "title"),
    organization: getString(formData, "organization"),
    description: getString(formData, "description") || undefined,
    dateTime: getString(formData, "dateTime") || undefined,
    locationName: getString(formData, "locationName") || undefined,
    address: getString(formData, "address") || undefined,
    city: getString(formData, "city") || undefined,
    county: getString(formData, "county"),
    category: getString(formData, "category"),
    contactName: getString(formData, "contactName") || undefined,
    contactEmail: getString(formData, "contactEmail") || undefined,
    sourceUrl: getString(formData, "sourceUrl") || undefined,
  });

  return {
    ...parsed,
    dateTime: parseDate(parsed.dateTime),
  };
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin?error=auth");
  }
}

function revalidateAll() {
  [
    "/",
    "/events",
    "/alerts",
    "/meetings",
    "/activities",
    "/volunteer",
    "/search",
    "/sources",
    "/submit",
    "/about",
    "/admin",
  ].forEach((path) => revalidatePath(path));
}

export async function submitCommunityItemAction(formData: FormData) {
  const payload = parseEventPayload(formData);
  const submitterName = getString(formData, "submitterName");
  const submitterEmail = getString(formData, "submitterEmail");
  const submissionType = getString(formData, "submissionType") as SubmissionType;

  if (!submitterName || !submitterEmail) {
    throw new Error("Submitter information is required.");
  }

  await prisma.submittedEvent.create({
    data: {
      submitterName,
      submitterEmail,
      submissionType: submissionType as SubmissionType,
      title: payload.title,
      description: payload.description ?? null,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      locationName: payload.locationName ?? null,
      address: payload.address ?? null,
      city: payload.city,
      county: payload.county,
      category: payload.category,
      cost: payload.cost ?? null,
      sourceUrl: payload.sourceUrl || null,
    },
  });

  revalidatePath("/admin");
  redirect("/submit?success=1");
}

export async function subscribeDigestAction(formData: FormData) {
  const base = subscriberSchema.parse({
    email: getString(formData, "email"),
    city: getString(formData, "city") || undefined,
    county: getString(formData, "county") || undefined,
  });
  const interests = formData.getAll("interests").map((entry) => String(entry));

  await prisma.subscriber.upsert({
    where: { email: base.email },
    update: {
      city: base.city ?? null,
      county: base.county ?? null,
      interests: JSON.stringify(interests),
      active: true,
    },
    create: {
      email: base.email,
      city: base.city ?? null,
      county: base.county ?? null,
      interests: JSON.stringify(interests),
      active: true,
    },
  });

  revalidatePath("/");
  redirect("/?subscribed=1");
}

export async function adminLoginAction(formData: FormData) {
  const password = getString(formData, "password");

  if (password !== getAdminPassword()) {
    redirect("/admin?error=bad-password");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin");
}

export async function approveSubmittedEventAction(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "submittedEventId");
  const submission = await prisma.submittedEvent.findUnique({ where: { id } });

  if (!submission) {
    redirect("/admin?error=missing-submission");
  }

  if (submission.submissionType === "VOLUNTEER") {
    await prisma.$transaction([
      prisma.volunteerOpportunity.create({
        data: {
          title: submission.title,
          organization: "Resident submission",
          description: submission.description,
          dateTime: submission.startDateTime,
          locationName: submission.locationName,
          address: submission.address,
          city: submission.city,
          county: submission.county,
          category: "Community help",
          contactName: submission.submitterName,
          contactEmail: submission.submitterEmail,
          sourceName: "Resident submission",
          sourceUrl: submission.sourceUrl || "/submit",
          status: "OPEN",
        },
      }),
      prisma.submittedEvent.update({
        where: { id },
        data: { status: "APPROVED" },
      }),
    ]);
  } else if (submission.submissionType === "COMMUNITY_NOTICE") {
    await prisma.$transaction([
      prisma.alert.create({
        data: {
          title: submission.title,
          description: submission.description,
          alertType: "OTHER",
          severity: "LOW",
          city: submission.city,
          county: submission.county,
          locationName: submission.locationName,
          address: submission.address,
          sourceName: "Resident submission",
          sourceUrl: submission.sourceUrl || "/submit",
          originalUrl: submission.sourceUrl || "/submit",
          startsAt: submission.startDateTime,
          expiresAt: submission.endDateTime || addDays(submission.startDateTime, 7),
          status: "ACTIVE",
        },
      }),
      prisma.submittedEvent.update({
        where: { id },
        data: { status: "APPROVED" },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.event.create({
        data: {
          title: submission.title,
          description: submission.description,
          startDateTime: submission.startDateTime,
          endDateTime: submission.endDateTime,
          locationName: submission.locationName,
          address: submission.address,
          city: submission.city,
          county: submission.county,
          category: submission.category,
          tags: JSON.stringify(submission.submissionType === "ACTIVITY" ? ["activity"] : []),
          cost: submission.cost,
          isFree: submission.cost?.toLowerCase() === "free" || !submission.cost,
          isKidFriendly: submission.category === "FAMILY" || submission.category === "LIBRARY",
          isOutdoor: false,
          sourceName: "Resident submission",
          sourceUrl: submission.sourceUrl || "/submit",
          originalUrl: submission.sourceUrl || "/submit",
          status: "APPROVED",
          confidenceScore: 0.9,
        },
      }),
      prisma.submittedEvent.update({
        where: { id },
        data: { status: "APPROVED" },
      }),
    ]);
  }

  revalidateAll();
  redirect("/admin?approved=1");
}

export async function rejectSubmittedEventAction(formData: FormData) {
  await requireAdmin();

  await prisma.submittedEvent.update({
    where: { id: getString(formData, "submittedEventId") },
    data: { status: "REJECTED" },
  });

  revalidatePath("/admin");
  redirect("/admin?rejected=1");
}

export async function createManualEventAction(formData: FormData) {
  await requireAdmin();
  const payload = parseEventPayload(formData);

  await prisma.event.create({
    data: {
      title: payload.title,
      description: payload.description ?? null,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      locationName: payload.locationName ?? null,
      address: payload.address ?? null,
      city: payload.city,
      county: payload.county,
      category: payload.category,
      tags: JSON.stringify(payload.tagList),
      cost: payload.cost ?? null,
      isFree: payload.isFree,
      isKidFriendly: payload.isKidFriendly,
      isOutdoor: payload.isOutdoor,
      sourceName: "Manual admin entry",
      sourceUrl: payload.sourceUrl || "/admin",
      originalUrl: payload.sourceUrl || "/admin",
      status: "APPROVED",
      confidenceScore: 1,
    },
  });

  revalidateAll();
  redirect("/admin?created=1");
}

export async function updateEventAction(formData: FormData) {
  await requireAdmin();
  const payload = parseEventPayload(formData);
  const eventId = getString(formData, "eventId");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title: payload.title,
      description: payload.description ?? null,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      locationName: payload.locationName ?? null,
      address: payload.address ?? null,
      city: payload.city,
      county: payload.county,
      category: payload.category,
      tags: JSON.stringify(payload.tagList),
      cost: payload.cost ?? null,
      isFree: payload.isFree,
      isKidFriendly: payload.isKidFriendly,
      isOutdoor: payload.isOutdoor,
      sourceUrl: payload.sourceUrl || "/admin",
      originalUrl: payload.sourceUrl || "/admin",
    },
  });

  revalidateAll();
  redirect("/admin?updated=1");
}

export async function archiveEventAction(formData: FormData) {
  await requireAdmin();

  await prisma.event.update({
    where: { id: getString(formData, "eventId") },
    data: { status: "ARCHIVED" },
  });

  revalidateAll();
  redirect("/admin?archived=1");
}

export async function createManualAlertAction(formData: FormData) {
  await requireAdmin();
  const payload = parseAlertPayload(formData);

  await prisma.alert.create({
    data: {
      title: payload.title,
      description: payload.description ?? null,
      alertType: payload.alertType,
      severity: payload.severity,
      city: payload.city ?? null,
      county: payload.county,
      locationName: payload.locationName ?? null,
      address: payload.address ?? null,
      sourceName: "Manual admin entry",
      sourceUrl: payload.sourceUrl || "/admin",
      originalUrl: payload.sourceUrl || "/admin",
      startsAt: payload.startsAt,
      expiresAt: payload.expiresAt,
      status:
        payload.expiresAt && payload.expiresAt < new Date()
          ? "EXPIRED"
          : "ACTIVE",
    },
  });

  revalidateAll();
  redirect("/admin?alertCreated=1");
}

export async function createManualMeetingAction(formData: FormData) {
  await requireAdmin();
  const payload = parseMeetingPayload(formData);

  await prisma.meeting.create({
    data: {
      title: payload.title,
      governmentBody: payload.governmentBody,
      meetingType: payload.meetingType,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      locationName: payload.locationName ?? null,
      address: payload.address ?? null,
      city: payload.city ?? null,
      county: payload.county,
      agendaUrl: payload.agendaUrl ?? null,
      minutesUrl: payload.minutesUrl ?? null,
      videoUrl: payload.videoUrl ?? null,
      sourceName: "Manual admin entry",
      sourceUrl: payload.sourceUrl || "/admin",
      originalUrl: payload.sourceUrl || "/admin",
      status: payload.status,
      summary: payload.summary ?? null,
      plainEnglishSummary: payload.plainEnglishSummary ?? null,
      keyTopics: JSON.stringify(payload.keyTopicsList),
      whyResidentsCare: payload.whyResidentsCare ?? null,
    },
  });

  revalidateAll();
  redirect("/admin?meetingCreated=1");
}

export async function createVolunteerOpportunityAction(formData: FormData) {
  await requireAdmin();
  const payload = parseVolunteerPayload(formData);

  await prisma.volunteerOpportunity.create({
    data: {
      title: payload.title,
      organization: payload.organization,
      description: payload.description ?? null,
      dateTime: payload.dateTime,
      locationName: payload.locationName ?? null,
      address: payload.address ?? null,
      city: payload.city ?? null,
      county: payload.county,
      category: payload.category,
      contactName: payload.contactName ?? null,
      contactEmail: payload.contactEmail ?? null,
      sourceName: "Manual admin entry",
      sourceUrl: payload.sourceUrl || "/admin",
      status: "OPEN",
    },
  });

  revalidateAll();
  redirect("/admin?volunteerCreated=1");
}

export async function createSourceAction(formData: FormData) {
  await requireAdmin();
  const payload = sourceFormSchema.parse({
    name: getString(formData, "name"),
    url: getString(formData, "url"),
    type: getString(formData, "type") as SourceType,
    section: getString(formData, "section") as SourceSection,
    city: getString(formData, "city") || undefined,
    county: getString(formData, "county"),
    scrapeFrequency: getString(formData, "scrapeFrequency") || undefined,
    notes: getString(formData, "notes") || undefined,
  });

  await prisma.source.upsert({
    where: {
      name: payload.name,
    },
    update: {
      url: payload.url,
      active: true,
      type: payload.type,
      section: payload.section,
      county: payload.county,
      city: payload.city,
      scrapeFrequency: payload.scrapeFrequency,
      notes: payload.notes,
    },
    create: {
      name: payload.name,
      url: payload.url,
      active: true,
      type: payload.type,
      section: payload.section,
      county: payload.county,
      city: payload.city,
      scrapeFrequency: payload.scrapeFrequency,
      notes: payload.notes,
    },
  });

  revalidateAll();
  redirect("/admin?sourceCreated=1");
}

export async function toggleSourceActiveAction(formData: FormData) {
  await requireAdmin();

  const sourceId = getString(formData, "sourceId");
  const nextActive = getString(formData, "nextActive") === "true";

  await prisma.source.update({
    where: { id: sourceId },
    data: { active: nextActive },
  });

  revalidateAll();
  redirect("/admin?sourceUpdated=1");
}

export async function deactivateAllSourcesAction() {
  await requireAdmin();

  const result = await prisma.source.updateMany({
    where: { active: true },
    data: { active: false },
  });

  revalidateAll();
  redirect(`/admin?sourcesDeactivated=${result.count}`);
}

export async function runScrapersNowAction() {
  await requireAdmin();
  await scrapeAllSupportedSources();
  revalidateAll();
  redirect("/admin?scraped=1");
}

export async function runSingleScraperAction(formData: FormData) {
  await requireAdmin();
  await scrapeSingleSourceById(getString(formData, "sourceId"));
  revalidateAll();
  redirect("/admin?scraped=1");
}

export async function generateMeetingSummaryAction(formData: FormData) {
  await requireAdmin();

  const meeting = await prisma.meeting.findUnique({
    where: { id: getString(formData, "meetingId") },
  });

  if (!meeting) {
    redirect("/admin?error=missing-meeting");
  }

  const summary = await generateMeetingPlainEnglishSummary(meeting);
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: summary,
  });

  revalidateAll();
  redirect("/admin?summaryGenerated=1");
}
