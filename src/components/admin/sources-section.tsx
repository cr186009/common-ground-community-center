import {
  getAdminSourceHealth,
  type AdminSourceHealth,
  type SourceHealthStatus,
} from "@/server/hub-data";
import {
  runSingleScraperAction,
  toggleSourceActiveAction,
  updateSourceAction,
} from "@/server/hub-actions";
import { getSupportedScraperNames } from "@/server/hub-scrapers";
import {
  formatTimestamp,
  getSourceSectionLabel,
  getSourceTypeLabel,
} from "@/lib/hub-format";
import {
  COUNTY_FILTERS,
  SOURCE_TYPE_LABELS,
} from "@/lib/hub-constants";

type Props = {
  search?: string;
  section?: string;
  county?: string;
  active?: string;
  health?: string;
  editSourceId?: string;
};

const HEALTH_BADGE: Record<SourceHealthStatus, { label: string; className: string; dot: string }> =
  {
    HEALTHY: {
      label: "Healthy",
      className: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-500",
    },
    WARNING: {
      label: "Warning",
      className: "bg-amber-100 text-amber-800",
      dot: "bg-amber-500",
    },
    FAILED: { label: "Failed", className: "bg-red-100 text-red-800", dot: "bg-red-500" },
    MANUAL: {
      label: "Manual source",
      className: "bg-slate-100 text-slate-600",
      dot: "bg-slate-400",
    },
    INACTIVE: { label: "Inactive", className: "bg-stone-100 text-stone-500", dot: "bg-stone-400" },
  };

const SOURCE_SECTION_VALUES = ["EVENTS", "ALERTS", "MEETINGS", "ACTIVITIES", "VOLUNTEER"] as const;

function applyFilters(
  sources: AdminSourceHealth[],
  {
    search,
    section,
    county,
    active,
    health,
  }: Props,
): AdminSourceHealth[] {
  return sources.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (section && s.section !== section) return false;
    if (county && s.county !== county) return false;
    if (active === "true" && !s.active) return false;
    if (active === "false" && s.active) return false;
    if (health && s.health !== health) return false;
    return true;
  });
}

export async function SourcesSection({
  search,
  section,
  county,
  active,
  health,
  editSourceId,
}: Props) {
  const scraperNames = getSupportedScraperNames();
  const allSources = await getAdminSourceHealth(scraperNames);
  const filtered = applyFilters(allSources, { search, section, county, active, health });

  const editSource = editSourceId ? allSources.find((s) => s.id === editSourceId) : null;

  return (
    <div className="space-y-6">
      {/* Filter form */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Filter sources</h2>
        <form method="get" action="/admin" className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="tab" value="sources" />
          <input
            name="s"
            placeholder="Search by name"
            defaultValue={search}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          />
          <select name="sec" defaultValue={section ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">All sections</option>
            {SOURCE_SECTION_VALUES.map((s) => (
              <option key={s} value={s}>
                {getSourceSectionLabel(s)}
              </option>
            ))}
          </select>
          <select name="cty" defaultValue={county ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">All counties</option>
            {COUNTY_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="act" defaultValue={active ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">Active &amp; inactive</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <select name="hlth" defaultValue={health ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm">
            <option value="">All health</option>
            <option value="HEALTHY">Healthy</option>
            <option value="WARNING">Warning</option>
            <option value="FAILED">Failed</option>
            <option value="MANUAL">Manual</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm">
            Apply
          </button>
          <a href="/admin?tab=sources" className="btn btn-ghost btn-sm">
            Clear
          </a>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Showing {filtered.length} of {allSources.length} sources
        </p>
      </section>

      {/* Edit source form */}
      {editSource && (
        <section className="rounded-[1.75rem] border border-[color:var(--navy)]/20 bg-[color:var(--navy-soft)] p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Edit source: {editSource.name}</h2>
          <form action={updateSourceAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="sourceId" value={editSource.id} />
            <input
              name="name"
              defaultValue={editSource.name}
              placeholder="Source name"
              required
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
            />
            <input
              name="url"
              defaultValue={editSource.url}
              placeholder="https://example.com"
              required
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
            />
            <select
              name="type"
              defaultValue={editSource.type}
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
            >
              {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              name="section"
              defaultValue={editSource.section}
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
            >
              {SOURCE_SECTION_VALUES.map((s) => (
                <option key={s} value={s}>
                  {getSourceSectionLabel(s)}
                </option>
              ))}
            </select>
            <input
              name="city"
              defaultValue={editSource.city ?? ""}
              placeholder="City"
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
            />
            <select
              name="county"
              defaultValue={editSource.county}
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
            >
              {COUNTY_FILTERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Georgia">Georgia / Statewide</option>
            </select>
            <input
              name="scrapeFrequency"
              defaultValue={editSource.scrapeFrequency ?? ""}
              placeholder="daily / weekly / manual"
              className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
            />
            <textarea
              name="notes"
              defaultValue={editSource.notes ?? ""}
              placeholder="Notes"
              className="min-h-20 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2"
            />
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="btn btn-primary btn-md">
                Save changes
              </button>
              <a href="/admin?tab=sources" className="btn btn-ghost btn-md">
                Cancel
              </a>
            </div>
          </form>
        </section>
      )}

      {/* Source list */}
      <section className="space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <p className="text-sm text-slate-600">No sources match the current filters.</p>
          </div>
        )}
        {filtered.map((source) => {
          const hb = HEALTH_BADGE[source.health];
          return (
            <div
              key={source.id}
              className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 min-w-0">
                  {/* Name + status badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${hb.dot}`} />
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[color:var(--navy)] hover:underline"
                    >
                      {source.name}
                    </a>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${hb.className}`}
                    >
                      {hb.label}
                    </span>
                    {!source.active && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-500">
                        Deactivated
                      </span>
                    )}
                    {source.consecutiveFailures >= 3 && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700">
                        {source.consecutiveFailures} consecutive failures
                      </span>
                    )}
                  </div>

                  {/* Metadata row */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>{getSourceTypeLabel(source.type)}</span>
                    <span>{getSourceSectionLabel(source.section)}</span>
                    {source.city && <span>{source.city}</span>}
                    <span>{source.county}</span>
                    {source.scrapeFrequency && <span>Frequency: {source.scrapeFrequency}</span>}
                    <span>{source.eventCount} events</span>
                  </div>

                  {/* Scrape stats */}
                  <div className="mt-2 text-xs text-slate-500">
                    {source.lastScrapedAt ? (
                      <>Last scraped {formatTimestamp(source.lastScrapedAt)}</>
                    ) : (
                      <span className="text-amber-600">Never scraped</span>
                    )}
                    {source.lastLog && (
                      <span className="ml-3">
                        Found {source.lastLog.itemsFound} · Created {source.lastLog.itemsCreated} ·
                        Updated {source.lastLog.itemsUpdated}
                        {source.lastLog.message && (
                          <span className="ml-2 text-slate-400">— {source.lastLog.message.slice(0, 80)}</span>
                        )}
                      </span>
                    )}
                  </div>
                  {source.notes && (
                    <p className="mt-2 text-xs italic text-slate-400">{source.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {source.hasAutomatedScraper && source.active && (
                    <form action={runSingleScraperAction}>
                      <input type="hidden" name="sourceId" value={source.id} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Run
                      </button>
                    </form>
                  )}
                  <form action={toggleSourceActiveAction}>
                    <input type="hidden" name="sourceId" value={source.id} />
                    <input type="hidden" name="nextActive" value={String(!source.active)} />
                    <button type="submit" className="btn btn-ghost btn-xs">
                      {source.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <a
                    href={`/admin?tab=sources&editSource=${source.id}`}
                    className="btn btn-ghost btn-xs"
                  >
                    Edit
                  </a>
                  <a
                    href={`/admin?tab=logs&logSrc=${encodeURIComponent(source.name)}`}
                    className="btn btn-ghost btn-xs"
                  >
                    Logs
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
