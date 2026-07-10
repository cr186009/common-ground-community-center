import { Router } from "express";
import { db } from "@workspace/db";
import {
  alertsTable,
  eventsTable,
  meetingsTable,
  submittedEventsTable,
  subscribersTable,
  sourcesTable,
  volunteerOpportunitiesTable,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gte, ilike, lte, or, sql, count } from "drizzle-orm";
// Native date helpers (no date-fns in api-server)
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(val: unknown): string | undefined {
  return typeof val === "string" && val.trim() ? val.trim() : undefined;
}

function bool(val: unknown): boolean | undefined {
  return val === "1" || val === "true" ? true : undefined;
}

function buildEventFilters(query: Record<string, unknown>) {
  const conditions = [eq(eventsTable.status, "APPROVED")];
  const q = str(query.query);
  if (q) {
    conditions.push(
      or(
        ilike(eventsTable.title, `%${q}%`),
        ilike(eventsTable.description, `%${q}%`),
        ilike(eventsTable.tags, `%${q}%`),
        ilike(eventsTable.locationName, `%${q}%`),
      )!,
    );
  }
  if (str(query.city)) conditions.push(eq(eventsTable.city, query.city as string));
  if (str(query.county)) conditions.push(eq(eventsTable.county, query.county as string));
  if (str(query.category)) conditions.push(eq(eventsTable.category, query.category as any));
  if (bool(query.free) === true) conditions.push(eq(eventsTable.isFree, true));
  if (bool(query.kids) === true) conditions.push(eq(eventsTable.isKidFriendly, true));
  if (bool(query.outdoor) === true) conditions.push(eq(eventsTable.isOutdoor, true));
  if (str(query.from)) conditions.push(gte(eventsTable.startDateTime, new Date(query.from as string)));
  if (str(query.to)) conditions.push(lte(eventsTable.startDateTime, new Date(query.to as string)));
  return and(...conditions);
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

router.get("/homepage", async (_req, res) => {
  try {
    const now = new Date();
    const weekEnd = addDays(now, 7);
    const weekend = [6, 0]; // Sat/Sun (day of week for JS)

    const [
      upcomingEvents,
      allAlerts,
      upcomingMeetings,
      volunteerOpportunities,
      [{ pendingCount }],
      [{ subCount }],
    ] = await Promise.all([
      db
        .select()
        .from(eventsTable)
        .where(and(eq(eventsTable.status, "APPROVED"), gte(eventsTable.startDateTime, now)))
        .orderBy(asc(eventsTable.startDateTime))
        .limit(8),
      db.select().from(alertsTable).where(eq(alertsTable.status, "ACTIVE")).orderBy(desc(alertsTable.startsAt)).limit(5),
      db
        .select()
        .from(meetingsTable)
        .where(and(eq(meetingsTable.status, "UPCOMING"), gte(meetingsTable.startDateTime, now)))
        .orderBy(asc(meetingsTable.startDateTime))
        .limit(5),
      db.select().from(volunteerOpportunitiesTable).where(eq(volunteerOpportunitiesTable.status, "OPEN")).limit(4),
      db.select({ pendingCount: count() }).from(submittedEventsTable).where(eq(submittedEventsTable.status, "PENDING")),
      db.select({ subCount: count() }).from(subscribersTable).where(eq(subscribersTable.active, true)),
    ]);

    const topAlert = allAlerts[0] ?? null;

    const weekendEvents = upcomingEvents.filter((e) => {
      const d = e.startDateTime.getDay();
      return e.startDateTime <= weekEnd && weekend.includes(d);
    });
    const freeEvents = upcomingEvents.filter((e) => e.isFree);
    const kidFriendlyEvents = upcomingEvents.filter((e) => e.isKidFriendly);

    const lastScraped = await db
      .select({ updatedAt: eventsTable.updatedAt })
      .from(eventsTable)
      .orderBy(desc(eventsTable.updatedAt))
      .limit(1);

    res.json({
      topAlert: topAlert ? serializeAlert(topAlert) : null,
      upcomingEvents: upcomingEvents.map(serializeEvent),
      weekendEvents: weekendEvents.map(serializeEvent),
      freeEvents: freeEvents.map(serializeEvent),
      kidFriendlyEvents: kidFriendlyEvents.map(serializeEvent),
      upcomingMeetings: upcomingMeetings.map(serializeMeeting),
      volunteerOpportunities: volunteerOpportunities.map(serializeVolunteer),
      pendingSubmissions: Number(pendingCount),
      activeSubscriberCount: Number(subCount),
      lastUpdatedAt: lastScraped[0]?.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[hub] /homepage error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events", async (req, res) => {
  try {
    const now = new Date();
    const where = and(buildEventFilters(req.query), gte(eventsTable.startDateTime, now));
    const rows = await db.select().from(eventsTable).where(where).orderBy(asc(eventsTable.startDateTime)).limit(100);
    res.json(rows.map(serializeEvent));
  } catch (err) {
    console.error("[hub] /events error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, req.params.id));
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(serializeEvent(event));
  } catch (err) {
    console.error("[hub] /events/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const ACTIVITY_CATEGORIES = ["TRIVIA", "KARAOKE", "MUSIC", "FOOD_DRINK", "FAMILY", "PARKS_RECREATION", "LIBRARY"];

router.get("/activities", async (req, res) => {
  try {
    const now = new Date();
    const baseFilters = buildEventFilters(req.query);
    const activityFilter = sql`${eventsTable.category} IN (${sql.raw(ACTIVITY_CATEGORIES.map((c) => `'${c}'`).join(","))})`;
    const where = and(baseFilters, activityFilter, gte(eventsTable.startDateTime, now));
    const rows = await db.select().from(eventsTable).where(where).orderBy(asc(eventsTable.startDateTime)).limit(100);
    res.json(rows.map(serializeEvent));
  } catch (err) {
    console.error("[hub] /activities error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calendar-events", async (req, res) => {
  try {
    const monthStr = (typeof req.query.month === "string" && req.query.month) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const monthDate = new Date(`${monthStr}-01T00:00:00`);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const isActivity = req.query.activity === "1";
    const conditions = [
      eq(eventsTable.status, "APPROVED"),
      gte(eventsTable.startDateTime, monthStart),
      lte(eventsTable.startDateTime, monthEnd),
    ];
    if (isActivity) {
      conditions.push(sql`${eventsTable.category} IN (${sql.raw(ACTIVITY_CATEGORIES.map((c) => `'${c}'`).join(","))})`);
    }
    if (str(req.query.city as string)) conditions.push(eq(eventsTable.city, req.query.city as string));
    if (str(req.query.county as string)) conditions.push(eq(eventsTable.county, req.query.county as string));

    const rows = await db.select().from(eventsTable).where(and(...conditions)).orderBy(asc(eventsTable.startDateTime));
    res.json(rows.map(serializeEvent));
  } catch (err) {
    console.error("[hub] /calendar-events error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/alerts", async (req, res) => {
  try {
    const conditions: ReturnType<typeof eq>[] = [];
    if (str(req.query.city as string)) conditions.push(eq(alertsTable.city, req.query.city as string));
    if (str(req.query.county as string)) conditions.push(eq(alertsTable.county, req.query.county as string));
    if (str(req.query.type as string)) conditions.push(eq(alertsTable.alertType, req.query.type as any));

    const activeAlerts = await db
      .select()
      .from(alertsTable)
      .where(and(eq(alertsTable.status, "ACTIVE"), conditions.length ? and(...conditions) : undefined))
      .orderBy(desc(alertsTable.startsAt));

    const expiredAlerts = await db
      .select()
      .from(alertsTable)
      .where(and(eq(alertsTable.status, "EXPIRED"), conditions.length ? and(...conditions) : undefined))
      .orderBy(desc(alertsTable.startsAt))
      .limit(20);

    res.json({ activeAlerts: activeAlerts.map(serializeAlert), expiredAlerts: expiredAlerts.map(serializeAlert) });
  } catch (err) {
    console.error("[hub] /alerts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/meetings", async (req, res) => {
  try {
    const conditions: any[] = [];
    if (str(req.query.city as string)) conditions.push(eq(meetingsTable.city, req.query.city as string));
    if (str(req.query.county as string)) conditions.push(eq(meetingsTable.county, req.query.county as string));
    if (str(req.query.body as string)) conditions.push(ilike(meetingsTable.governmentBody, `%${req.query.body}%`));
    if (str(req.query.type as string)) conditions.push(eq(meetingsTable.meetingType, req.query.type as any));

    const now = new Date();
    const baseWhere = conditions.length ? and(...conditions) : undefined;

    const [upcomingMeetings, completedMeetings] = await Promise.all([
      db.select().from(meetingsTable).where(and(eq(meetingsTable.status, "UPCOMING"), gte(meetingsTable.startDateTime, now), baseWhere)).orderBy(asc(meetingsTable.startDateTime)).limit(40),
      db.select().from(meetingsTable).where(and(eq(meetingsTable.status, "COMPLETED"), baseWhere)).orderBy(desc(meetingsTable.startDateTime)).limit(20),
    ]);

    const bodies = [...new Set([...upcomingMeetings, ...completedMeetings].map((m) => m.governmentBody))];

    res.json({
      upcomingMeetings: upcomingMeetings.map(serializeMeeting),
      completedMeetings: completedMeetings.map(serializeMeeting),
      governmentBodies: bodies,
    });
  } catch (err) {
    console.error("[hub] /meetings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/meetings/:id", async (req, res) => {
  try {
    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, req.params.id));
    if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }
    res.json(serializeMeeting(meeting));
  } catch (err) {
    console.error("[hub] /meetings/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/volunteer", async (req, res) => {
  try {
    const conditions = [eq(volunteerOpportunitiesTable.status, "OPEN")];
    if (str(req.query.city as string)) conditions.push(eq(volunteerOpportunitiesTable.city, req.query.city as string));
    if (str(req.query.county as string)) conditions.push(eq(volunteerOpportunitiesTable.county, req.query.county as string));
    const rows = await db.select().from(volunteerOpportunitiesTable).where(and(...conditions)).orderBy(desc(volunteerOpportunitiesTable.createdAt)).limit(40);
    res.json(rows.map(serializeVolunteer));
  } catch (err) {
    console.error("[hub] /volunteer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sources", async (_req, res) => {
  try {
    const rows = await db.select().from(sourcesTable).where(eq(sourcesTable.active, true)).orderBy(sourcesTable.name);
    const result = rows.map((s) => ({
      ...s,
      lastScrapedAt: s.lastScrapedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      eventCount: 0,
      alertCount: 0,
      meetingCount: 0,
      volunteerCount: 0,
    }));
    res.json(result);
  } catch (err) {
    console.error("[hub] /sources error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = str(req.query.query as string);
    const city = str(req.query.city as string);
    const county = str(req.query.county as string);

    const buildCond = (table: any, titleCol: any, descCol?: any) => {
      const parts: any[] = [];
      if (q) {
        const like = [ilike(titleCol, `%${q}%`)];
        if (descCol) like.push(ilike(descCol, `%${q}%`));
        parts.push(or(...like));
      }
      if (city && table.city) parts.push(eq(table.city, city));
      if (county && table.county) parts.push(eq(table.county, county));
      return parts.length ? and(...parts) : undefined;
    };

    const now = new Date();
    const [events, alerts, meetings, volunteer] = await Promise.all([
      db.select().from(eventsTable).where(and(eq(eventsTable.status, "APPROVED"), gte(eventsTable.startDateTime, now), buildCond(eventsTable, eventsTable.title, eventsTable.description))).orderBy(asc(eventsTable.startDateTime)).limit(20),
      db.select().from(alertsTable).where(and(eq(alertsTable.status, "ACTIVE"), buildCond(alertsTable, alertsTable.title, alertsTable.description))).orderBy(desc(alertsTable.startsAt)).limit(10),
      db.select().from(meetingsTable).where(and(eq(meetingsTable.status, "UPCOMING"), buildCond(meetingsTable, meetingsTable.title, meetingsTable.plainEnglishSummary))).orderBy(asc(meetingsTable.startDateTime)).limit(10),
      db.select().from(volunteerOpportunitiesTable).where(and(eq(volunteerOpportunitiesTable.status, "OPEN"), buildCond(volunteerOpportunitiesTable, volunteerOpportunitiesTable.title, volunteerOpportunitiesTable.description))).limit(10),
    ]);

    res.json({
      events: events.map(serializeEvent),
      alerts: alerts.map(serializeAlert),
      meetings: meetings.map(serializeMeeting),
      volunteer: volunteer.map(serializeVolunteer),
    });
  } catch (err) {
    console.error("[hub] /search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/submit", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const startDt = new Date(body.startDateTime as string);
    if (Number.isNaN(startDt.getTime())) {
      res.status(400).json({ error: "Invalid startDateTime" }); return;
    }
    await db.insert(submittedEventsTable).values({
      submitterName: String(body.submitterName || ""),
      submitterEmail: String(body.submitterEmail || ""),
      submissionType: (body.submissionType as any) || "EVENT",
      category: (body.category as any) || "OTHER",
      title: String(body.title || ""),
      description: body.description ? String(body.description) : null,
      startDateTime: startDt,
      endDateTime: body.endDateTime ? new Date(body.endDateTime as string) : null,
      locationName: body.locationName ? String(body.locationName) : null,
      address: body.address ? String(body.address) : null,
      city: String(body.city || ""),
      county: String(body.county || ""),
      cost: body.cost ? String(body.cost) : null,
      tags: body.tags ? String(body.tags) : null,
      sourceUrl: body.sourceUrl ? String(body.sourceUrl) : null,
      isFree: Boolean(body.isFree),
      isKidFriendly: Boolean(body.isKidFriendly),
      isOutdoor: Boolean(body.isOutdoor),
    });
    res.json({ success: true, message: "Your submission is in the moderation queue." });
  } catch (err) {
    console.error("[hub] /submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subscribe", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = String(body.email || "").trim();
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    await db
      .insert(subscribersTable)
      .values({
        email,
        city: body.city ? String(body.city) : null,
        county: body.county ? String(body.county) : null,
        interests: body.interests ? String(body.interests) : null,
        active: true,
      })
      .onConflictDoUpdate({
        target: subscribersTable.email,
        set: {
          city: body.city ? String(body.city) : null,
          county: body.county ? String(body.county) : null,
          interests: body.interests ? String(body.interests) : null,
          active: true,
        },
      });
    res.json({ success: true, message: "Your digest preferences were saved." });
  } catch (err) {
    console.error("[hub] /subscribe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simple admin login (stateless check — production would use sessions)
router.post("/admin/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Not configured — treat as "no admin access in this environment"
    res.status(401).json({ error: "ADMIN_PASSWORD is not configured. Set it in environment secrets to enable admin access." }); return;
  }
  if (password === adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Bad password" });
  }
});

// ── Serializers ───────────────────────────────────────────────────────────────

function serializeEvent(e: typeof eventsTable.$inferSelect) {
  return {
    ...e,
    startDateTime: e.startDateTime.toISOString(),
    endDateTime: e.endDateTime?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function serializeAlert(a: typeof alertsTable.$inferSelect) {
  return {
    ...a,
    startsAt: a.startsAt.toISOString(),
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function serializeMeeting(m: typeof meetingsTable.$inferSelect) {
  return {
    ...m,
    startDateTime: m.startDateTime.toISOString(),
    endDateTime: m.endDateTime?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function serializeVolunteer(v: typeof volunteerOpportunitiesTable.$inferSelect) {
  return {
    ...v,
    dateTime: v.dateTime?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export default router;
