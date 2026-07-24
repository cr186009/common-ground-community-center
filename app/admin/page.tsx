import { isAdminAuthenticated } from "@/server/hub-auth";
import {
  adminLoginAction,
  adminLogoutAction,
  createManualAlertAction,
  createManualEventAction,
  createManualMeetingAction,
  createSourceAction,
  createVolunteerOpportunityAction,
  deactivateAllSourcesAction,
  runScrapersNowAction,
  updateEventAction,
} from "@/server/hub-actions";
import { getAdminDashboardData } from "@/server/hub-data";
import {
  ALERT_SEVERITY_OPTIONS,
  ALERT_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  COUNTY_FILTERS,
  MEETING_TYPE_OPTIONS,
  SOURCE_TYPE_LABELS,
} from "@/lib/hub-constants";
import {
  formatDateTimeRange,
  getSourceSectionLabel,
} from "@/lib/hub-format";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";

import { OverviewSection } from "@/components/admin/overview-section";
import { SourcesSection } from "@/components/admin/sources-section";
import { EventsSection } from "@/components/admin/events-section";
import { ImagesSection } from "@/components/admin/images-section";
import { LogsSection } from "@/components/admin/logs-section";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

const SOURCE_SECTION_VALUES = ["EVENTS", "ALERTS", "MEETINGS", "ACTIVITIES", "VOLUNTEER"] as const;

// ---------------------------------------------------------------------------
// Flash message component
// ---------------------------------------------------------------------------

function Flash({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-[1.75rem] border border-[color:var(--forest)]/20 bg-[color:var(--forest-soft)] p-4 text-sm text-[color:var(--forest)]">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventEditor — used in the Events tab (edit mode) and Add Content tab
// ---------------------------------------------------------------------------

function EventEditor({
  action,
  heading,
  submitLabel,
  event,
}: {
  action: (formData: FormData) => Promise<void>;
  heading: string;
  submitLabel: string;
  event?: {
    id?: string;
    title?: string;
    description?: string | null;
    startDateTime?: Date;
    endDateTime?: Date | null;
    locationName?: string | null;
    address?: string | null;
    city?: string;
    county?: string;
    category?: string;
    cost?: string | null;
    tags?: string;
    isFree?: boolean;
    isKidFriendly?: boolean;
    isOutdoor?: boolean;
    sourceUrl?: string;
    imageUrl?: string | null;
  } | null;
}) {
  return (
    <form
      action={action}
      className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2"
    >
      {event?.id ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <div className="md:col-span-2">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">{heading}</h2>
      </div>
      <input
        name="title"
        defaultValue={event?.title}
        placeholder="Title"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
        required
      />
      <textarea
        name="description"
        defaultValue={event?.description ?? ""}
        placeholder="Description"
        className="min-h-28 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
      />
      <input
        name="startDateTime"
        type="datetime-local"
        defaultValue={
          event?.startDateTime ? new Date(event.startDateTime).toISOString().slice(0, 16) : ""
        }
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
        required
      />
      <input
        name="endDateTime"
        type="datetime-local"
        defaultValue={
          event?.endDateTime ? new Date(event.endDateTime).toISOString().slice(0, 16) : ""
        }
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
      />
      <input
        name="locationName"
        defaultValue={event?.locationName ?? ""}
        placeholder="Location name"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
      />
      <input
        name="address"
        defaultValue={event?.address ?? ""}
        placeholder="Address"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
      />
      <input
        name="city"
        defaultValue={event?.city ?? ""}
        placeholder="City"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
        required
      />
      <select
        name="county"
        defaultValue={event?.county ?? COUNTY_FILTERS[0]}
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
        required
      >
        {COUNTY_FILTERS.map((county) => (
          <option key={county} value={county}>
            {county}
          </option>
        ))}
      </select>
      <select
        name="category"
        defaultValue={event?.category ?? "OTHER"}
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
        required
      >
        {CATEGORY_OPTIONS.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      <input
        name="cost"
        defaultValue={event?.cost ?? ""}
        placeholder="Cost"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
      />
      <input
        name="tags"
        defaultValue={event?.tags ?? ""}
        placeholder="Tags, separated by commas"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
      />
      <input
        name="sourceUrl"
        defaultValue={event?.sourceUrl ?? ""}
        placeholder="Source URL"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
      />
      <input
        name="imageUrl"
        type="url"
        defaultValue={event?.imageUrl ?? ""}
        placeholder="Image URL (optional)"
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
      />
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
          <input type="checkbox" name="isFree" defaultChecked={event?.isFree} />
          Free
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
          <input type="checkbox" name="isKidFriendly" defaultChecked={event?.isKidFriendly} />
          Kid-friendly
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
          <input type="checkbox" name="isOutdoor" defaultChecked={event?.isOutdoor} />
          Outdoor
        </label>
      </div>
      <div className="md:col-span-2">
        <button type="submit" className="btn btn-primary btn-md">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Sources" },
  { id: "events", label: "Events" },
  { id: "images", label: "Images" },
  { id: "logs", label: "Scrape Logs" },
  { id: "add", label: "Add Content" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminNav({
  activeTab,
  params,
}: {
  activeTab: TabId;
  params: SearchParamsRecord;
}) {
  // Preserve non-tab search params that are tab-agnostic (e.g. edit=ID)
  return (
    <nav className="sticky top-0 z-10 -mx-4 bg-stone-50/90 px-4 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap gap-2 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-2">
        {TABS.map((tab) => (
          <a
            key={tab.id}
            href={`/admin?tab=${tab.id}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[color:var(--navy)] text-white"
                : "text-slate-600 hover:bg-stone-100"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Admin access</p>
          <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">
            Local moderation dashboard
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Sign in with the password in <code>ADMIN_PASSWORD</code> to review submissions, manage
            sources, and run scrapers.
          </p>
        </section>
        <Flash
          message={
            readSearchParam(params, "error") === "bad-password"
              ? "The password did not match the local admin configuration."
              : readSearchParam(params, "error") === "auth"
                ? "Please sign in to continue."
                : undefined
          }
        />
        <form
          action={adminLoginAction}
          className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6"
        >
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
              required
            />
          </label>
          <button type="submit" className="mt-4 btn btn-primary btn-md">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const editEventId = readSearchParam(params, "edit");
  const rawTab = readSearchParam(params, "tab");
  const activeTab: TabId =
    rawTab && TABS.some((t) => t.id === rawTab)
      ? (rawTab as TabId)
      : editEventId
        ? "events"
        : "overview";

  // Build flash message
  const n = (key: string) => readSearchParam(params, key);
  const flashMap: Record<string, string> = {
    approved: "Submission approved and published.",
    rejected: "Submission rejected.",
    created: "Manual event created.",
    updated: "Event updated.",
    archived: "Event archived.",
    alertCreated: "Manual alert created.",
    meetingCreated: "Manual meeting created.",
    volunteerCreated: "Volunteer opportunity created.",
    sourceCreated: "Source added.",
    sourceUpdated: "Source updated.",
    summaryGenerated: "Meeting summary generated.",
    scraped: "Scraper run completed.",
    sourcesDeactivated: `${n("sourcesDeactivated") ?? "0"} scraper sources deactivated.`,
  };
  const flashMessage = Object.entries(flashMap).find(([key]) => n(key))?.[1];

  // Parse section-specific params
  const subscriberId = n("subscriber");
  const editSourceId = n("editSource");
  const logSrc = n("logSrc");
  const logSta = n("logSta");

  // Load edit event data if needed
  let editEvent: Awaited<ReturnType<typeof getAdminDashboardData>>["editEvent"] = null;
  if (editEventId) {
    const dashboard = await getAdminDashboardData(editEventId);
    editEvent = dashboard.editEvent;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Admin</p>
            <h1 className="mt-2 font-serif text-4xl text-[color:var(--navy)]">
              Operations dashboard
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={runScrapersNowAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Run all scrapers
              </button>
            </form>
            <form action={deactivateAllSourcesAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Deactivate all
              </button>
            </form>
            <form action={adminLogoutAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </section>

      {flashMessage && <Flash message={flashMessage} />}

      {/* Tab navigation */}
      <AdminNav activeTab={activeTab} params={params} />

      {/* ── Overview tab ─────────────────────────────────────────────── */}
      {activeTab === "overview" && <OverviewSection subscriberId={subscriberId} />}

      {/* ── Sources tab ──────────────────────────────────────────────── */}
      {activeTab === "sources" && (
        <SourcesSection
          search={n("s") ?? undefined}
          section={n("sec") ?? undefined}
          county={n("cty") ?? undefined}
          active={n("act") ?? undefined}
          health={n("hlth") ?? undefined}
          editSourceId={editSourceId ?? undefined}
        />
      )}

      {/* ── Events tab ───────────────────────────────────────────────── */}
      {activeTab === "events" && (
        <div className="space-y-6">
          {editEvent && (
            <EventEditor
              action={updateEventAction}
              heading="Edit event"
              submitLabel="Save changes"
              event={{
                id: editEvent.id,
                title: editEvent.title,
                description: editEvent.description,
                startDateTime: editEvent.startDateTime,
                endDateTime: editEvent.endDateTime,
                locationName: editEvent.locationName,
                address: editEvent.address,
                city: editEvent.city,
                county: editEvent.county,
                category: editEvent.category,
                cost: editEvent.cost,
                tags: editEvent.tags,
                isFree: editEvent.isFree,
                isKidFriendly: editEvent.isKidFriendly,
                isOutdoor: editEvent.isOutdoor,
                sourceUrl: editEvent.sourceUrl,
                imageUrl: editEvent.imageUrl,
              }}
            />
          )}
          <EventsSection
            query={n("q") ?? undefined}
            sourceName={n("src") ?? undefined}
            city={n("city") ?? undefined}
            county={n("cty") ?? undefined}
            category={n("cat") ?? undefined}
            status={n("sta") ?? undefined}
            imgStatus={n("img") ?? undefined}
            upcoming={n("up") ?? undefined}
            page={n("pg") ? Number(n("pg")) : undefined}
          />
        </div>
      )}

      {/* ── Images tab ───────────────────────────────────────────────── */}
      {activeTab === "images" && (
        <ImagesSection
          bulkAssigned={n("bulkAssigned") ?? undefined}
          bulkSkipped={n("bulkSkipped") ?? undefined}
          bulkFailed={n("bulkFailed") ?? undefined}
          imageAssigned={n("imageAssigned") ?? undefined}
          imageReplaced={n("imageReplaced") ?? undefined}
          imageRemoved={n("imageRemoved") ?? undefined}
        />
      )}

      {/* ── Logs tab ─────────────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <LogsSection
          sourceName={logSrc ?? undefined}
          status={logSta ?? undefined}
          zeros={n("zeros") ?? undefined}
          created={n("created") ?? undefined}
          page={n("pg") ? Number(n("pg")) : undefined}
        />
      )}

      {/* ── Add Content tab ──────────────────────────────────────────── */}
      {activeTab === "add" && (
        <div className="space-y-6">
          {/* Create manual event */}
          <EventEditor
            action={createManualEventAction}
            heading="Add a manual event"
            submitLabel="Create event"
            event={null}
          />

          <section className="grid gap-6 xl:grid-cols-2">
            {/* Add a manual alert */}
            <form
              action={createManualAlertAction}
              className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a manual alert</h2>
              </div>
              <input
                name="title"
                placeholder="Alert title"
                className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
                required
              />
              <textarea
                name="description"
                placeholder="Description"
                className="min-h-24 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
              />
              <select name="alertType" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {ALERT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select name="severity" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {ALERT_SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input name="city" placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {COUNTY_FILTERS.map((county) => (
                  <option key={county} value={county}>{county}</option>
                ))}
                <option value="Georgia">Georgia / Statewide</option>
              </select>
              <input name="startsAt" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="expiresAt" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="sourceUrl" placeholder="Source URL" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <div className="md:col-span-2">
                <button type="submit" className="btn btn-primary btn-md">Create alert</button>
              </div>
            </form>

            {/* Add a manual meeting */}
            <form
              action={createManualMeetingAction}
              className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a manual meeting</h2>
              </div>
              <input name="title" placeholder="Meeting title" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
              <input name="governmentBody" placeholder="Government body" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
              <select name="meetingType" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {MEETING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input name="startDateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
              <input name="endDateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="locationName" placeholder="Location" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="address" placeholder="Address" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="city" placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {COUNTY_FILTERS.map((county) => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
              <input name="agendaUrl" placeholder="Agenda URL" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="minutesUrl" placeholder="Minutes URL" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="videoUrl" placeholder="Video URL" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <textarea name="plainEnglishSummary" placeholder="Plain-English summary" className="min-h-24 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <input name="keyTopics" placeholder="Key topics, separated by commas" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <textarea name="whyResidentsCare" placeholder="Why residents might care" className="min-h-20 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <div className="md:col-span-2">
                <button type="submit" className="btn btn-primary btn-md">Create meeting</button>
              </div>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            {/* Add volunteer opportunity */}
            <form
              action={createVolunteerOpportunityAction}
              className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a volunteer opportunity</h2>
              </div>
              <input name="title" placeholder="Title" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
              <input name="organization" placeholder="Organization" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
              <input name="category" placeholder="Category" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
              <input name="dateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {COUNTY_FILTERS.map((county) => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
              <input name="city" placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="contactName" placeholder="Contact name" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="contactEmail" placeholder="Contact email" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <textarea name="description" placeholder="Description" className="min-h-24 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <div className="md:col-span-2">
                <button type="submit" className="btn btn-primary btn-md">Create volunteer entry</button>
              </div>
            </form>

            {/* Add a source */}
            <form
              action={createSourceAction}
              className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a source</h2>
              </div>
              <input name="name" placeholder="Source name" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
              <input name="url" placeholder="https://example.com" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
              <select name="type" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="section" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {SOURCE_SECTION_VALUES.map((section) => (
                  <option key={section} value={section}>{getSourceSectionLabel(section)}</option>
                ))}
              </select>
              <input name="city" placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
                {COUNTY_FILTERS.map((county) => (
                  <option key={county} value={county}>{county}</option>
                ))}
                <option value="Georgia">Georgia / Statewide</option>
              </select>
              <input name="scrapeFrequency" placeholder="daily / weekly / manual" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <textarea name="notes" placeholder="Notes" className="min-h-24 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
              <div className="md:col-span-2">
                <button type="submit" className="btn btn-primary btn-md">Add source</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
