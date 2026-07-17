import {
  adminLoginAction,
  adminLogoutAction,
  approveSubmittedEventAction,
  archiveEventAction,
  createManualAlertAction,
  createManualEventAction,
  createManualMeetingAction,
  createSourceAction,
  createVolunteerOpportunityAction,
  generateMeetingSummaryAction,
  rejectSubmittedEventAction,
  runScrapersNowAction,
  runSingleScraperAction,
  toggleSourceActiveAction,
  updateEventAction,
} from "@/server/hub-actions";
import { isAdminAuthenticated } from "@/server/hub-auth";
import {
  getAdminDashboardData,
  getAdminOverviewCounts,
  getDigestPreview,
  getEventStatusCounts,
} from "@/server/hub-data";
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
  formatTimestamp,
  getSourceSectionLabel,
  getSourceTypeLabel,
} from "@/lib/hub-format";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

function Flash({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-[1.75rem] border border-[color:var(--forest)]/20 bg-[color:var(--forest-soft)] p-4 text-sm text-[color:var(--forest)]">
      {message}
    </div>
  );
}

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
  } | null;
}) {
  return (
    <form action={action} className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2">
      {event?.id ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <div className="md:col-span-2">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">{heading}</h2>
      </div>
      <input name="title" defaultValue={event?.title} placeholder="Title" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
      <textarea name="description" defaultValue={event?.description ?? ""} placeholder="Description" className="min-h-28 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
      <input name="startDateTime" type="datetime-local" defaultValue={event?.startDateTime ? new Date(event.startDateTime).toISOString().slice(0, 16) : ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
      <input name="endDateTime" type="datetime-local" defaultValue={event?.endDateTime ? new Date(event.endDateTime).toISOString().slice(0, 16) : ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
      <input name="locationName" defaultValue={event?.locationName ?? ""} placeholder="Location name" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
      <input name="address" defaultValue={event?.address ?? ""} placeholder="Address" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
      <input name="city" defaultValue={event?.city ?? ""} placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
      <select name="county" defaultValue={event?.county ?? COUNTY_FILTERS[0]} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required>
        {COUNTY_FILTERS.map((county) => (
          <option key={county} value={county}>
            {county}
          </option>
        ))}
      </select>
      <select name="category" defaultValue={event?.category ?? "OTHER"} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required>
        {CATEGORY_OPTIONS.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      <input name="cost" defaultValue={event?.cost ?? ""} placeholder="Cost" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
      <input name="tags" defaultValue={event?.tags ?? ""} placeholder="Tags, separated by commas" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
      <input name="sourceUrl" defaultValue={event?.sourceUrl ?? ""} placeholder="Source URL" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
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

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Admin access</p>
          <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Local moderation dashboard</h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Sign in with the password in `ADMIN_PASSWORD` to review submissions, manage sources, and run scrapers.
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
        <form action={adminLoginAction} className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input name="password" type="password" className="mt-2 w-full rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
          </label>
          <button type="submit" className="mt-4 btn btn-primary btn-md">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const editEventId = readSearchParam(params, "edit");
  const [dashboard, counts, statusCounts, digestPreview] = await Promise.all([
    getAdminDashboardData(editEventId),
    getAdminOverviewCounts(),
    getEventStatusCounts(),
    getDigestPreview(readSearchParam(params, "subscriber")),
  ]);

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
    scraped: "Scraper run completed.",
    summaryGenerated: "Meeting summary placeholder generated.",
  };
  const flashMessage = Object.entries(flashMap).find(([key]) => readSearchParam(params, key))?.[1];

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Admin dashboard</p>
            <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Moderation, sources, and community ops</h1>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Review pending submissions, add manual records, manage sources, run scrapers, and preview the weekly digest structure.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={runScrapersNowAction}>
              <button type="submit" className="btn btn-forest btn-md">
                Run all scrapers
              </button>
            </form>
            <form action={adminLogoutAction}>
              <button type="submit" className="btn btn-ghost btn-md">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </section>

      <Flash message={flashMessage} />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Approved events</p>
          <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{counts.approvedEvents}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Active alerts</p>
          <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{counts.activeAlerts}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Upcoming meetings</p>
          <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{counts.upcomingMeetings}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Open volunteer</p>
          <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{counts.openVolunteer}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Pending submissions</p>
          <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{counts.pendingSubmissions}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Active sources</p>
          <p className="mt-3 font-serif text-4xl text-[color:var(--navy)]">{counts.activeSources}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl text-[color:var(--navy)]">Pending community submissions</h2>
              <span className="text-sm text-slate-500">{dashboard.pendingSubmissions.length} shown</span>
            </div>
            <div className="mt-5 space-y-4">
              {dashboard.pendingSubmissions.length === 0 ? (
                <p className="text-sm text-slate-600">No pending submissions right now.</p>
              ) : (
                dashboard.pendingSubmissions.map((submission) => (
                  <article key={submission.id} className="rounded-2xl border border-[color:var(--line)] bg-stone-50 p-4">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span className="rounded-full bg-white px-3 py-1">{submission.submissionType.replaceAll("_", " ")}</span>
                      <span className="rounded-full bg-white px-3 py-1">{submission.category.replaceAll("_", " ")}</span>
                    </div>
                    <h3 className="mt-3 font-semibold text-[color:var(--navy)]">{submission.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {submission.city} · {submission.county} · {formatDateTimeRange(submission.startDateTime, submission.endDateTime)}
                    </p>
                    {submission.description ? <p className="mt-3 text-sm text-slate-700">{submission.description}</p> : null}
                    <p className="mt-3 text-sm text-slate-500">
                      Submitted by {submission.submitterName} · {submission.submitterEmail}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action={approveSubmittedEventAction}>
                        <input type="hidden" name="submittedEventId" value={submission.id} />
                        <button type="submit" className="btn btn-forest btn-sm">
                          Approve
                        </button>
                      </form>
                      <form action={rejectSubmittedEventAction}>
                        <input type="hidden" name="submittedEventId" value={submission.id} />
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Reject
                        </button>
                      </form>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <EventEditor
            action={dashboard.editEvent ? updateEventAction : createManualEventAction}
            heading={dashboard.editEvent ? "Edit selected event" : "Add a manual event"}
            submitLabel={dashboard.editEvent ? "Save changes" : "Create event"}
            event={
              dashboard.editEvent
                ? {
                    id: dashboard.editEvent.id,
                    title: dashboard.editEvent.title,
                    description: dashboard.editEvent.description,
                    startDateTime: dashboard.editEvent.startDateTime,
                    endDateTime: dashboard.editEvent.endDateTime,
                    locationName: dashboard.editEvent.locationName,
                    address: dashboard.editEvent.address,
                    city: dashboard.editEvent.city,
                    county: dashboard.editEvent.county,
                    category: dashboard.editEvent.category,
                    cost: dashboard.editEvent.cost,
                    tags: dashboard.editEvent.tags,
                    isFree: dashboard.editEvent.isFree,
                    isKidFriendly: dashboard.editEvent.isKidFriendly,
                    isOutdoor: dashboard.editEvent.isOutdoor,
                    sourceUrl: dashboard.editEvent.sourceUrl,
                  }
                : null
            }
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Event status counts</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="rounded-2xl bg-stone-50 p-4">
                  <p className="font-semibold text-slate-500">{status}</p>
                  <p className="mt-2 text-2xl font-serif text-[color:var(--navy)]">{count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Recent events</h2>
            <div className="mt-4 space-y-3">
              {dashboard.recentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[color:var(--navy)]">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{event.city} · {event.category.replaceAll("_", " ")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/admin?edit=${event.id}`} className="btn btn-ghost btn-xs">
                        Edit
                      </a>
                      <form action={archiveEventAction}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className="btn btn-ghost btn-xs">
                          Archive
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <form action={createManualAlertAction} className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a manual alert</h2>
          </div>
          <input name="title" placeholder="Alert title" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
          <textarea name="description" placeholder="Description" className="min-h-24 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
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
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
          <input name="startsAt" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <input name="expiresAt" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <input name="sourceUrl" placeholder="Source URL" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary btn-md">Create alert</button>
          </div>
        </form>

        <form action={createManualMeetingAction} className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a manual meeting</h2>
          </div>
          <input name="title" placeholder="Meeting title" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
          <input name="governmentBody" placeholder="Government body" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
          <select name="meetingType" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
            {MEETING_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input name="startDateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
          <input name="endDateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <input name="locationName" placeholder="Location" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <input name="address" placeholder="Address" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <input name="city" placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
            {COUNTY_FILTERS.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
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
        <form action={createVolunteerOpportunityAction} className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a volunteer opportunity</h2>
          </div>
          <input name="title" placeholder="Title" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
          <input name="organization" placeholder="Organization" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
          <input name="category" placeholder="Category" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
          <input name="dateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
            {COUNTY_FILTERS.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
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

        <form action={createSourceAction} className="grid gap-3 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Add a source</h2>
          </div>
          <input name="name" placeholder="Source name" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
          <input name="url" placeholder="https://example.com" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
          <select name="type" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
            {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select name="section" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
            {dashboard.sources
              .map((source) => source.section)
              .filter((value, index, array) => array.indexOf(value) === index)
              .map((section) => (
                <option key={section} value={section}>
                  {getSourceSectionLabel(section)}
                </option>
              ))}
          </select>
          <input name="city" placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
          <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
            {COUNTY_FILTERS.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
          <input name="scrapeFrequency" placeholder="daily / weekly / manual" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
          <textarea name="notes" placeholder="Notes" className="min-h-24 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary btn-md">Add source</button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Manage sources</h2>
          <div className="mt-4 space-y-3">
            {dashboard.sources.map((source) => (
              <div key={source.id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[color:var(--navy)]">{source.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {getSourceSectionLabel(source.section)} · {getSourceTypeLabel(source.type)} · {source.county}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Last scraped {formatTimestamp(source.lastScrapedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={runSingleScraperAction}>
                      <input type="hidden" name="sourceId" value={source.id} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Run one
                      </button>
                    </form>
                    <form action={toggleSourceActiveAction}>
                      <input type="hidden" name="sourceId" value={source.id} />
                      <input type="hidden" name="nextActive" value={String(!source.active)} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        {source.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl text-[color:var(--navy)]">Recent meetings</h2>
            </div>
            <div className="mt-4 space-y-3">
              {dashboard.meetings.map((meeting) => (
                <div key={meeting.id} className="rounded-2xl bg-stone-50 p-4">
                  <p className="font-semibold text-[color:var(--navy)]">{meeting.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{meeting.governmentBody}</p>
                  <form action={generateMeetingSummaryAction} className="mt-3">
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <button type="submit" className="btn btn-ghost btn-xs">
                      Generate plain-English summary
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Recent scrape logs</h2>
            <div className="mt-4 space-y-3">
              {dashboard.logs.map((log) => (
                <div key={log.id} className="rounded-2xl bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[color:var(--navy)]">{log.sourceName}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{log.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{log.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Found {log.itemsFound} · Created {log.itemsCreated} · Updated {log.itemsUpdated} · {formatTimestamp(log.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Weekly digest preview</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">{digestPreview.intro}</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Featured events</p>
              <div className="mt-2 space-y-2">
                {digestPreview.featuredEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-stone-50 p-3 text-sm text-slate-700">
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Alerts</p>
              <div className="mt-2 space-y-2">
                {digestPreview.alerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl bg-stone-50 p-3 text-sm text-slate-700">
                    {alert.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Subscribers</h2>
          <div className="mt-4 space-y-3">
            {dashboard.subscribers.map((subscriber) => (
              <a
                key={subscriber.id}
                href={`/admin?subscriber=${subscriber.id}`}
                className="block rounded-2xl bg-stone-50 p-4"
              >
                <p className="font-semibold text-[color:var(--navy)]">{subscriber.email}</p>
                <p className="mt-1 text-sm text-slate-600">{[subscriber.city, subscriber.county].filter(Boolean).join(" · ") || "No location preference"}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
