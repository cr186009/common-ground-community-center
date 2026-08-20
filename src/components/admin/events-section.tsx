import {
  getAdminEventManagement,
  getAdminPossibleDuplicates,
  getAdminExactDuplicateSummary,
  getEventStatusCounts,
  getAdminDateReviewQueue,
  type AdminEventFilters,
} from "@/server/hub-data";
import {
  approveEventAction,
  archiveEventAction,
  manuallyVerifyEventDetailsAction,
  rejectEventDateAction,
  rescrapeEventSourceAction,
  unpublishEventAction,
  assignFallbackImageAction,
  removeFallbackImageAction,
  replaceFallbackImageAction,
  cleanExactEventDuplicatesAction,
} from "@/server/hub-actions";
import { CATEGORY_OPTIONS, COUNTY_FILTERS } from "@/lib/hub-constants";
import { formatDateTimeRange, formatTimestamp } from "@/lib/hub-format";

type Props = {
  query?: string;
  sourceName?: string;
  city?: string;
  county?: string;
  category?: string;
  status?: string;
  imgStatus?: string;
  upcoming?: string;
  page?: number;
};

const IMG_STATUS_LABELS: Record<string, string> = {
  missing: "Missing",
  fallback: "Pexels fallback",
  real: "Source or manual",
};

function getImgStatusLabel(
  imageUrl: string | null,
  imageIsFallback: boolean,
  imageSource: string | null,
) {
  if (!imageUrl) return { label: "Missing", className: "text-amber-600" };
  if (imageIsFallback)
    return { label: "Pexels fallback", className: "text-sky-600" };
  if (imageSource)
    return { label: "Source image", className: "text-emerald-600" };
  return { label: "Manual image", className: "text-slate-600" };
}

export async function EventsSection({
  query,
  sourceName,
  city,
  county,
  category,
  status,
  imgStatus,
  upcoming,
  page,
}: Props) {
  const filters: AdminEventFilters = {
    query,
    sourceName,
    city,
    county,
    category,
    status,
    imgStatus,
    upcoming: upcoming === "1",
    page: page ?? 1,
  };

  const [
    { events, total, page: currentPage, totalPages },
    statusCounts,
    duplicateGroups,
    dateReviewQueue,
    exactDuplicateSummary,
  ] = await Promise.all([
    getAdminEventManagement(filters),
    getEventStatusCounts(),
    getAdminPossibleDuplicates(),
    getAdminDateReviewQueue(),
    getAdminExactDuplicateSummary(),
  ]);

  const filterBase = `/admin?tab=events${query ? `&q=${encodeURIComponent(query)}` : ""}${sourceName ? `&src=${encodeURIComponent(sourceName)}` : ""}${city ? `&city=${encodeURIComponent(city)}` : ""}${county ? `&cty=${encodeURIComponent(county)}` : ""}${category ? `&cat=${encodeURIComponent(category)}` : ""}${status ? `&sta=${encodeURIComponent(status)}` : ""}${imgStatus ? `&img=${encodeURIComponent(imgStatus)}` : ""}${upcoming ? `&up=${upcoming}` : ""}`;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-amber-300 bg-amber-50 p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Date and time review</h2>
        <p className="mt-1 text-sm text-amber-900">
          {dateReviewQueue.length} event(s) need review. Plausible unverified listings stay public with a notice; conflicts are withheld.
        </p>
        <div className="mt-4 space-y-3">
          {dateReviewQueue.length === 0 ? <p className="text-sm text-emerald-700">No date discrepancies await review.</p> : dateReviewQueue.map((event) => {
            let dateEvidence: Array<{ label?: string; value?: string; source?: string; date?: string; text?: string; field?: string }> = [];
            let timeEvidence: typeof dateEvidence = [];
            try { dateEvidence = JSON.parse(event.dateEvidence); } catch { dateEvidence = []; }
            try { timeEvidence = JSON.parse(event.timeEvidence); } catch { timeEvidence = []; }
            const renderEvidence = (items: typeof dateEvidence) => items.length > 0
              ? <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">{items.map((item, index) => <li key={index}>{item.label || item.source || item.field || "Evidence"}: {item.value || item.date || item.text}</li>)}</ul>
              : <p className="mt-1 text-xs text-slate-500">No independent evidence detected.</p>;
            return (
              <article key={event.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      <span>Date: {event.dateVerificationStatus.replaceAll("_", " ")}</span>
                      <span>Time: {event.timeVerificationStatus.replaceAll("_", " ")}</span>
                    </div>
                    <h3 className="mt-1 font-semibold text-[color:var(--navy)]">{event.title}</h3>
                    <p className="text-sm text-slate-700">Stored date and time: {formatDateTimeRange(event.startDateTime, null, false)}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs font-semibold text-slate-700">Date evidence</p><p className="mt-1 text-xs text-amber-900">{event.dateVerificationReason || "Date evidence requires review."}</p>{renderEvidence(dateEvidence)}</div>
                      <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs font-semibold text-slate-700">Time evidence</p><p className="mt-1 text-xs text-amber-900">{event.timeVerificationReason || "Time evidence requires review."}</p>{renderEvidence(timeEvidence)}</div>
                    </div>
                    {event.sourcePublishedText && <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Source text</summary><p className="mt-1 whitespace-pre-wrap">{event.sourcePublishedText}</p></details>}
                    <p className="mt-2 text-xs text-slate-500">Last scrape attempt: {formatTimestamp(event.lastScrapeAttemptAt)} · Last successful scrape: {formatTimestamp(event.lastSuccessfulScrapeAt)}</p>
                  </div>
                  <div className="flex max-w-md shrink-0 flex-wrap items-start gap-2">
                    <a className="btn btn-ghost btn-xs" href={event.originalUrl || event.sourceUrl} target="_blank" rel="noreferrer">Check source</a>
                    <a className="btn btn-ghost btn-xs" href={`/admin?tab=events&edit=${event.id}`}>Correct details</a>
                    {event.sourceId && <form action={rescrapeEventSourceAction}><input type="hidden" name="sourceId" value={event.sourceId} /><button className="btn btn-ghost btn-xs" type="submit">Rescrape</button></form>}
                    {[{ field: "date", label: "Verify date" }, { field: "time", label: "Verify time" }, { field: "both", label: "Verify both" }].map(({ field, label }) => <form key={field} action={manuallyVerifyEventDetailsAction} className="flex gap-1"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="field" value={field} /><input name="verificationNote" aria-label={`${label} note`} placeholder="Optional note" className="w-28 rounded-full border border-[color:var(--line)] px-2 py-1 text-xs" /><button className="btn btn-primary btn-xs" type="submit">{label}</button></form>)}
                    <form action={unpublishEventAction}><input type="hidden" name="eventId" value={event.id} /><button className="btn btn-ghost btn-xs" type="submit">Unpublish</button></form>
                    <form action={rejectEventDateAction}><input type="hidden" name="eventId" value={event.id} /><button className="btn btn-ghost btn-xs" type="submit">Reject</button></form>
                    <form action={archiveEventAction}><input type="hidden" name="eventId" value={event.id} /><button className="btn btn-ghost btn-xs" type="submit">Archive</button></form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {/* Status counts */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(statusCounts).map(([st, count]) => (
            <div
              key={st}
              className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                {st}
              </p>
              <p className="mt-2 font-serif text-3xl text-[color:var(--navy)]">
                {count}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Filter form */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">
          Filter events
        </h2>
        <form
          method="get"
          action="/admin"
          className="mt-4 flex flex-wrap gap-3"
        >
          <input type="hidden" name="tab" value="events" />
          <input
            name="q"
            placeholder="Search title"
            defaultValue={query}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          />
          <input
            name="src"
            placeholder="Source name"
            defaultValue={sourceName}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          />
          <input
            name="city"
            placeholder="City"
            defaultValue={city}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          />
          <select
            name="cty"
            defaultValue={county ?? ""}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          >
            <option value="">All counties</option>
            {COUNTY_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            name="cat"
            defaultValue={category ?? ""}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            name="sta"
            defaultValue={status ?? ""}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            name="img"
            defaultValue={imgStatus ?? ""}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          >
            <option value="">Any image</option>
            <option value="missing">Missing image</option>
            <option value="fallback">Pexels fallback</option>
            <option value="real">Source/manual image</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="up"
              value="1"
              defaultChecked={upcoming === "1"}
            />
            Upcoming only
          </label>
          <button type="submit" className="btn btn-primary btn-sm">
            Apply
          </button>
          <a href="/admin?tab=events" className="btn btn-ghost btn-sm">
            Clear
          </a>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          {total} event(s) · Page {currentPage} of {totalPages}
        </p>
      </section>

      {/* Event list */}
      <section className="space-y-3">
        {events.length === 0 && (
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <p className="text-sm text-slate-600">
              No events match the current filters.
            </p>
          </div>
        )}
        {events.map((event) => {
          const imgInfo = getImgStatusLabel(
            event.imageUrl,
            event.imageIsFallback,
            event.imageSource,
          );
          return (
            <div
              key={event.id}
              className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                {/* Thumbnail */}
                {event.imageUrl && (
                  <div
                    className="h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100"
                    style={{
                      backgroundImage: `url(${event.imageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                )}
                {!event.imageUrl && (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--navy)] to-[color:var(--forest)] text-xs text-white/70">
                    No image
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        event.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : event.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {event.status}
                    </span>
                    <span
                      className={`text-xs font-medium ${imgInfo.className}`}
                    >
                      {imgInfo.label}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-[color:var(--navy)]">
                    {event.title}
                  </p>
                  <p className="text-sm text-slate-600">
                    {formatDateTimeRange(
                      event.startDateTime,
                      null,
                      event.isAllDay,
                    )}{" "}
                    · {event.city} · {event.county} ·{" "}
                    {event.category.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {event.sourceName} · Updated{" "}
                    {formatTimestamp(event.updatedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  <a
                    href={`/admin?tab=events&edit=${event.id}`}
                    className="btn btn-ghost btn-xs"
                  >
                    Edit
                  </a>
                  {event.status === "PENDING" && (
                    <form action={approveEventAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Approve
                      </button>
                    </form>
                  )}
                  <form action={archiveEventAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <button type="submit" className="btn btn-ghost btn-xs">
                      Archive
                    </button>
                  </form>
                  {!event.imageUrl && (
                    <form action={assignFallbackImageAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Assign image
                      </button>
                    </form>
                  )}
                  {event.imageIsFallback && (
                    <>
                      <form action={replaceFallbackImageAction}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className="btn btn-ghost btn-xs">
                          Replace
                        </button>
                      </form>
                      <form action={removeFallbackImageAction}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className="btn btn-ghost btn-xs">
                          Remove image
                        </button>
                      </form>
                    </>
                  )}
                  <a
                    href={`/events/${event.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-xs"
                  >
                    View
                  </a>
                  {event.originalUrl && (
                    <a
                      href={event.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs"
                    >
                      Source
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center gap-2">
          {currentPage > 1 && (
            <a
              href={`${filterBase}&pg=${currentPage - 1}`}
              className="btn btn-ghost btn-sm"
            >
              ← Previous
            </a>
          )}
          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <a
              href={`${filterBase}&pg=${currentPage + 1}`}
              className="btn btn-ghost btn-sm"
            >
              Next →
            </a>
          )}
        </nav>
      )}

      {/* Possible duplicates */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Possible duplicates</h2>
            <p className="mt-1 text-sm text-slate-500">
              {exactDuplicateSummary.groupCount} exact group(s), containing {exactDuplicateSummary.redundantEventCount} safely removable record(s).
            </p>
          </div>
          <form action={cleanExactEventDuplicatesAction}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={exactDuplicateSummary.redundantEventCount === 0}
            >
              Clear {exactDuplicateSummary.redundantEventCount} exact duplicate(s)
            </button>
          </form>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Upcoming approved events grouped by normalized title + date + city.
          The cleanup button is more conservative: it requires an exact start time and matching city/county, refuses records with conflicting known venues or addresses, preserves the strongest details and verification evidence, and records the operation in scrape logs.
        </p>
        <div className="mt-4 space-y-4">
          {duplicateGroups.length === 0 ? (
            <p className="text-sm text-emerald-700">
              No likely duplicates found in upcoming events.
            </p>
          ) : (
            duplicateGroups.map((group, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  {group.length} possible duplicates
                </p>
                <div className="mt-3 space-y-2">
                  {group.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl bg-white p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[color:var(--navy)]">
                            {event.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {event.startDateTime.toLocaleDateString()} ·{" "}
                            {event.sourceName} · {event.status}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a
                            href={`/admin?tab=events&edit=${event.id}`}
                            className="btn btn-ghost btn-xs"
                          >
                            Edit
                          </a>
                          {event.originalUrl && (
                            <a
                              href={event.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-xs"
                            >
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
