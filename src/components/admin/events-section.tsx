import {
  getAdminEventManagement,
  getAdminPossibleDuplicates,
  getEventStatusCounts,
  type AdminEventFilters,
} from "@/server/hub-data";
import {
  approveEventAction,
  archiveEventAction,
  assignFallbackImageAction,
  removeFallbackImageAction,
  replaceFallbackImageAction,
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

function getImgStatusLabel(imageUrl: string | null, imageIsFallback: boolean, imageSource: string | null) {
  if (!imageUrl) return { label: "Missing", className: "text-amber-600" };
  if (imageIsFallback) return { label: "Pexels fallback", className: "text-sky-600" };
  if (imageSource) return { label: "Source image", className: "text-emerald-600" };
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

  const [{ events, total, page: currentPage, totalPages }, statusCounts, duplicateGroups] =
    await Promise.all([
      getAdminEventManagement(filters),
      getEventStatusCounts(),
      getAdminPossibleDuplicates(),
    ]);

  const filterBase = `/admin?tab=events${query ? `&q=${encodeURIComponent(query)}` : ""}${sourceName ? `&src=${encodeURIComponent(sourceName)}` : ""}${city ? `&city=${encodeURIComponent(city)}` : ""}${county ? `&cty=${encodeURIComponent(county)}` : ""}${category ? `&cat=${encodeURIComponent(category)}` : ""}${status ? `&sta=${encodeURIComponent(status)}` : ""}${imgStatus ? `&img=${encodeURIComponent(imgStatus)}` : ""}${upcoming ? `&up=${upcoming}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Status counts */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(statusCounts).map(([st, count]) => (
            <div key={st} className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{st}</p>
              <p className="mt-2 font-serif text-3xl text-[color:var(--navy)]">{count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filter form */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Filter events</h2>
        <form method="get" action="/admin" className="mt-4 flex flex-wrap gap-3">
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
          <select name="cty" defaultValue={county ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">All counties</option>
            {COUNTY_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="cat" defaultValue={category ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select name="sta" defaultValue={status ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select name="img" defaultValue={imgStatus ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">Any image</option>
            <option value="missing">Missing image</option>
            <option value="fallback">Pexels fallback</option>
            <option value="real">Source/manual image</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
            <input type="checkbox" name="up" value="1" defaultChecked={upcoming === "1"} />
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
            <p className="text-sm text-slate-600">No events match the current filters.</p>
          </div>
        )}
        {events.map((event) => {
          const imgInfo = getImgStatusLabel(event.imageUrl, event.imageIsFallback, event.imageSource);
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
                    <span className={`text-xs font-medium ${imgInfo.className}`}>
                      {imgInfo.label}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-[color:var(--navy)]">{event.title}</p>
                  <p className="text-sm text-slate-600">
                    {formatDateTimeRange(event.startDateTime, null)} · {event.city} · {event.county} · {event.category.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {event.sourceName} · Updated {formatTimestamp(event.updatedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  <a href={`/admin?tab=events&edit=${event.id}`} className="btn btn-ghost btn-xs">
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
                  <a href={`/events/${event.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">
                    View
                  </a>
                  {event.originalUrl && (
                    <a href={event.originalUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">
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
            <a href={`${filterBase}&pg=${currentPage - 1}`} className="btn btn-ghost btn-sm">
              ← Previous
            </a>
          )}
          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <a href={`${filterBase}&pg=${currentPage + 1}`} className="btn btn-ghost btn-sm">
              Next →
            </a>
          )}
        </nav>
      )}

      {/* Possible duplicates */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Possible duplicates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upcoming approved events grouped by normalized title + date + city. Inspection only —
          no automatic merging.
        </p>
        <div className="mt-4 space-y-4">
          {duplicateGroups.length === 0 ? (
            <p className="text-sm text-emerald-700">No likely duplicates found in upcoming events.</p>
          ) : (
            duplicateGroups.map((group, idx) => (
              <div key={idx} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  {group.length} possible duplicates
                </p>
                <div className="mt-3 space-y-2">
                  {group.map((event) => (
                    <div key={event.id} className="rounded-xl bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[color:var(--navy)]">{event.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {event.startDateTime.toLocaleDateString()} · {event.sourceName} ·{" "}
                            {event.status}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a href={`/admin?tab=events&edit=${event.id}`} className="btn btn-ghost btn-xs">
                            Edit
                          </a>
                          {event.originalUrl && (
                            <a href={event.originalUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">
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
