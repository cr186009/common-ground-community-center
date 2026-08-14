import {
  getAdminSourceHealth,
  type AdminSourceHealth,
  type SourceHealthStatus,
} from "@/server/hub-data";
import {
  bulkPauseSourcesAction,
  retireSourceAction,
  restoreSourceAction,
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
import { COUNTY_FILTERS, SOURCE_TYPE_LABELS } from "@/lib/hub-constants";
import {
  buildCoverageProfiles,
  COVERAGE_AREAS,
  type CoverageAreaId,
  type CoverageProfileStatus,
} from "@/lib/community-coverage-profile";
import { HorizontalCardCarousel } from "@/components/admin/horizontal-card-carousel";

type Props = {
  search?: string;
  section?: string;
  county?: string;
  city?: string;
  sourceType?: string;
  coverage?: string;
  status?: string;
  active?: string;
  health?: string;
  usage?: string;
  editSourceId?: string;
};

const HEALTH_BADGE: Record<SourceHealthStatus, { label: string; className: string; dot: string }> = {
  HEALTHY: { label: "Healthy", className: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  DEGRADED: { label: "Needs review", className: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  FAILING: { label: "Failing", className: "bg-red-100 text-red-800", dot: "bg-red-500" },
  PAUSED: { label: "Paused", className: "bg-stone-100 text-stone-600", dot: "bg-stone-400" },
  RETIRED: { label: "Retired", className: "bg-slate-200 text-slate-700", dot: "bg-slate-500" },
};

const SOURCE_SECTION_VALUES = ["EVENTS", "ALERTS", "MEETINGS", "ACTIVITIES", "VOLUNTEER"] as const;

const COVERAGE_BADGE = {
  CORE_PAULDING: { label: "Core Paulding", className: "bg-blue-100 text-blue-800" },
  WITHIN_RADIUS: { label: "Within 25 miles", className: "bg-emerald-100 text-emerald-800" },
  BORDERLINE: { label: "Borderline", className: "bg-amber-100 text-amber-800" },
  OUT_OF_AREA: { label: "Out of area", className: "bg-red-100 text-red-800" },
  UNKNOWN: { label: "Location unknown", className: "bg-slate-100 text-slate-600" },
} as const;

const PROFILE_BADGE: Record<CoverageProfileStatus, { label: string; className: string }> = {
  covered: { label: "Covered", className: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-800" },
  missing: { label: "Missing", className: "bg-slate-100 text-slate-600" },
  manual: { label: "Manual", className: "bg-blue-100 text-blue-800" },
  failing: { label: "Failing", className: "bg-red-100 text-red-800" },
};

const COVERAGE_AREA_LABELS = Object.fromEntries(
  COVERAGE_AREAS.map((area) => [area.id, area.label]),
) as Record<CoverageAreaId, string>;

function matchesStatus(source: AdminSourceHealth, status?: string) {
  if (!status) return true;
  if (status === "ACTIVE") return source.active;
  if (status === "PAUSED") return source.health === "PAUSED";
  if (status === "NEVER_RUN") return source.active && source.hasAutomatedScraper && !source.lastScrapedAt;
  return source.health === status;
}

function applyFilters(sources: AdminSourceHealth[], filters: Props): AdminSourceHealth[] {
  const query = filters.search?.trim().toLocaleLowerCase();
  return sources.filter((source) => {
    const searchable = [source.name, source.city, source.county, source.notes, source.url]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (filters.section && source.section !== filters.section) return false;
    if (filters.county && source.county !== filters.county) return false;
    if (filters.city && source.city !== filters.city) return false;
    if (filters.sourceType && source.type !== filters.sourceType) return false;
    if (filters.coverage && source.coverage.classification !== filters.coverage) return false;
    if (!matchesStatus(source, filters.status)) return false;
    // Keep compatibility with links created by the previous filter UI.
    if (filters.active === "true" && !source.active) return false;
    if (filters.active === "false" && source.active) return false;
    if (filters.health && source.health !== filters.health) return false;
    if ((filters.usage ?? "USED") === "USED" && !sourceIsInUse(source)) return false;
    if (filters.usage === "UNUSED" && sourceIsInUse(source)) return false;
    return true;
  });
}

export function sourceIsInUse(source: Pick<AdminSourceHealth, "publishedContentCount" | "url">) {
  const hasSourceUrl = /^https?:\/\/\S+$/i.test(source.url.trim());
  return source.publishedContentCount > 0 && hasSourceUrl;
}

function Stat({ label, value, tone = "text-[color:var(--navy)]" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export async function SourcesSection(filters: Props) {
  const scraperNames = getSupportedScraperNames();
  const allSources = await getAdminSourceHealth(scraperNames);
  const coverageProfiles = buildCoverageProfiles(allSources);
  const filtered = applyFilters(allSources, filters);
  const minimizedCount = allSources.filter((source) => !sourceIsInUse(source)).length;
  const editSource = filters.editSourceId
    ? allSources.find((source) => source.id === filters.editSourceId)
    : null;
  const cities = [...new Set(allSources.map((source) => source.city).filter((city): city is string => Boolean(city)))].sort();
  const counties = [...new Set([...COUNTY_FILTERS, ...allSources.map((source) => source.county)])].sort();
  const counts = {
    active: allSources.filter((source) => source.active).length,
    healthy: allSources.filter((source) => source.health === "HEALTHY").length,
    review: allSources.filter((source) => source.health === "DEGRADED").length,
    failing: allSources.filter((source) => source.health === "FAILING").length,
    paused: allSources.filter((source) => source.health === "PAUSED").length,
    neverRun: allSources.filter((source) => source.active && source.hasAutomatedScraper && !source.lastScrapedAt).length,
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="source-health-heading" className="space-y-3">
        <div>
          <h2 id="source-health-heading" className="font-serif text-2xl text-[color:var(--navy)]">Scraper health</h2>
          <p className="mt-1 text-sm text-slate-600">See what is running, what needs attention, and what each source last imported.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Active" value={counts.active} />
          <Stat label="Healthy" value={counts.healthy} tone="text-emerald-700" />
          <Stat label="Needs review" value={counts.review} tone="text-amber-700" />
          <Stat label="Failing" value={counts.failing} tone="text-red-700" />
          <Stat label="Never run" value={counts.neverRun} tone="text-amber-700" />
          <Stat label="Paused" value={counts.paused} tone="text-slate-600" />
        </div>
      </section>

      <section aria-labelledby="coverage-profile-heading" className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <div className="max-w-3xl">
          <h2 id="coverage-profile-heading" className="font-serif text-2xl text-[color:var(--navy)]">Community profile library</h2>
          <p className="mt-1 text-sm text-slate-600">Each card is a portable coverage plan: the community, its content areas, and the source or scraper bundle assigned to it. Missing areas stay visible so a profile can be improved before it is reused.</p>
        </div>
        <HorizontalCardCarousel
          ariaLabel="Community coverage profiles"
          itemLabel="community profile"
          className="mt-5"
          cardClassName="h-auto"
        >
          {coverageProfiles.map((profile) => (
            <article key={profile.id} className="h-full overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white">
              <div className="border-b border-[color:var(--line)] bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl text-[color:var(--navy)]">{profile.city}</h3>
                    <p className="text-xs text-slate-500">{profile.county} County · {profile.id}</p>
                  </div>
                  <a href={`/admin?tab=sources&usage=ALL&city=${encodeURIComponent(profile.city)}`} className="btn btn-ghost btn-xs shrink-0">View sources</a>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50 px-2 py-2"><p className="text-lg font-semibold text-emerald-800">{profile.statusCounts.covered}</p><p className="text-[0.68rem] text-emerald-700">Covered</p></div>
                  <div className="rounded-xl bg-amber-50 px-2 py-2"><p className="text-lg font-semibold text-amber-800">{profile.statusCounts.partial + profile.statusCounts.manual + profile.statusCounts.failing}</p><p className="text-[0.68rem] text-amber-700">Needs work</p></div>
                  <div className="rounded-xl bg-slate-100 px-2 py-2"><p className="text-lg font-semibold text-slate-700">{profile.statusCounts.missing}</p><p className="text-[0.68rem] text-slate-600">Unmapped</p></div>
                </div>
                <p className="mt-3 text-xs text-slate-600">{profile.sourceBundle.length} source{profile.sourceBundle.length === 1 ? "" : "s"} in this reusable bundle · {profile.sourceBundle.filter((item) => item.collectionMode === "automated").length} automated</p>
              </div>

              <details className="group">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--navy)] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--navy)]">
                  <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="transition group-open:rotate-90">›</span> Coverage areas</span>
                </summary>
                <div className="divide-y divide-[color:var(--line)] border-t border-[color:var(--line)]">
                  {profile.areas.map((area) => {
                    const badge = PROFILE_BADGE[area.status];
                    return <div key={area.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800">{area.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                      </div>
                      <div className="mt-1 space-y-1 text-xs text-slate-500">
                        {area.sources.length === 0 ? <p>No source mapped</p> : area.sources.map(({ sourceName, role, collectionMode, source }) => (
                          <p key={`${sourceName}-${role}`}><span className="font-medium text-slate-700">{sourceName}</span> · {role} · {collectionMode}{source ? <> · last success {source.lastSuccessfulAt ? formatTimestamp(source.lastSuccessfulAt) : "never"}</> : " · needs source setup"}</p>
                        ))}
                      </div>
                    </div>;
                  })}
                </div>
              </details>

              <details className="group border-t border-[color:var(--line)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--navy)] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--navy)]">
                  <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="transition group-open:rotate-90">›</span> Source and scraper bundle</span>
                </summary>
                <div className="space-y-3 border-t border-[color:var(--line)] px-4 py-3">
                  {profile.sourceBundle.map((item) => (
                    <div key={item.sourceName} className="rounded-xl bg-slate-50 p-3 text-xs">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-slate-800">{item.sourceName}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-600">{item.collectionMode}</span>
                      </div>
                      <p className="mt-1 text-slate-500">{item.areas.map((area) => COVERAGE_AREA_LABELS[area.areaId]).join(" · ")}</p>
                      {item.source ? <div className="mt-2 flex flex-wrap gap-2">
                        {item.source.hasAutomatedScraper && <a href={`/admin/sources/${item.source.id}/preview`} className="font-semibold text-[color:var(--navy)] hover:underline">Preview</a>}
                        <a href={`/admin?tab=sources&editSource=${item.source.id}`} className="font-semibold text-[color:var(--navy)] hover:underline">Edit</a>
                        <a href={`/admin?tab=logs&logSrc=${encodeURIComponent(item.source.name)}`} className="font-semibold text-[color:var(--navy)] hover:underline">Logs</a>
                      </div> : <p className="mt-2 font-medium text-amber-700">Source record needs setup</p>}
                    </div>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </HorizontalCardCarousel>
        <p className="mt-2 text-xs text-slate-500">Profiles currently describe source assignments; they do not bulk activate or pause shared scrapers. Profile-level switching will require persisted assignments and an atomic server action.</p>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Find sources</h2>
        <form method="get" action="/admin" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="tab" value="sources" />
          <label className="sm:col-span-2">
            <span className="sr-only">Search sources</span>
            <input name="s" placeholder="Search name, city, county, URL…" defaultValue={filters.search} className="w-full rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm" />
          </label>
          <select aria-label="Operational status" name="srcStatus" defaultValue={filters.status ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm">
            <option value="">Every status</option>
            <option value="ACTIVE">Active</option>
            <option value="HEALTHY">Healthy</option>
            <option value="DEGRADED">Needs review</option>
            <option value="FAILING">Failing</option>
            <option value="NEVER_RUN">Never run</option>
            <option value="PAUSED">Paused</option>
            <option value="RETIRED">Retired</option>
          </select>
          <select aria-label="Content usage" name="usage" defaultValue={filters.usage ?? "USED"} className="rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm">
            <option value="USED">Used on the public site</option>
            <option value="ALL">All source records</option>
            <option value="UNUSED">Unused or incomplete only</option>
          </select>
          <select aria-label="Source type" name="srcType" defaultValue={filters.sourceType ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm">
            <option value="">Every source type</option>
            {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select aria-label="Geographic coverage" name="coverage" defaultValue={filters.coverage ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm">
            <option value="">Every coverage area</option>
            {Object.entries(COVERAGE_BADGE).map(([value, badge]) => <option key={value} value={value}>{badge.label}</option>)}
          </select>
          <select aria-label="Section" name="sec" defaultValue={filters.section ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm">
            <option value="">Every section</option>
            {SOURCE_SECTION_VALUES.map((value) => <option key={value} value={value}>{getSourceSectionLabel(value)}</option>)}
          </select>
          <select aria-label="County" name="cty" defaultValue={filters.county ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm">
            <option value="">Every county</option>
            {counties.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="City" name="city" defaultValue={filters.city ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-2.5 text-sm">
            <option value="">Every city</option>
            {cities.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <div className="flex gap-2 lg:justify-end">
            <button type="submit" className="btn btn-primary btn-sm">Apply</button>
            <a href="/admin?tab=sources" className="btn btn-ghost btn-sm">Clear</a>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Showing {filtered.length} of {allSources.length} sources. {minimizedCount} with no published content or usable source URL {filters.usage === "ALL" || filters.usage === "UNUSED" ? "are included" : "are minimized"}.
        </p>
      </section>

      {editSource && (
        <section className="rounded-[1.75rem] border border-[color:var(--navy)]/20 bg-[color:var(--navy-soft)] p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Edit source: {editSource.name}</h2>
          <form action={updateSourceAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="sourceId" value={editSource.id} />
            <input name="name" defaultValue={editSource.name} placeholder="Source name" required className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
            <input name="url" defaultValue={editSource.url} placeholder="https://example.com" required className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
            <select name="type" defaultValue={editSource.type} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">{Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select name="section" defaultValue={editSource.section} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">{SOURCE_SECTION_VALUES.map((value) => <option key={value} value={value}>{getSourceSectionLabel(value)}</option>)}</select>
            <input name="city" defaultValue={editSource.city ?? ""} placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
            <select name="county" defaultValue={editSource.county} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">{counties.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <input name="scrapeFrequency" defaultValue={editSource.scrapeFrequency ?? ""} placeholder="daily / weekly / manual" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
            <textarea name="notes" defaultValue={editSource.notes ?? ""} placeholder="Notes" className="min-h-20 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />
            <div className="flex gap-3 md:col-span-2"><button type="submit" className="btn btn-primary btn-md">Save changes</button><a href="/admin?tab=sources" className="btn btn-ghost btn-md">Cancel</a></div>
          </form>
        </section>
      )}

      <section aria-label="Source results" className="space-y-4">
        {filtered.length > 0 && (
          <form id="bulk-source-form" action={bulkPauseSourcesAction} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-600">Select active sources below to pause several at once.</p>
            <button type="submit" className="btn btn-ghost btn-xs">Pause selected</button>
          </form>
        )}
        {filtered.length === 0 && <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5"><p className="text-sm text-slate-600">No sources match these filters.</p></div>}
        {filtered.map((source) => {
          const badge = HEALTH_BADGE[source.health];
          const coverageBadge = COVERAGE_BADGE[source.coverage.classification];
          return (
            <article id={`source-${source.id}`} key={source.id} className="scroll-mt-6 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {source.active && <input form="bulk-source-form" type="checkbox" name="sourceId" value={source.id} aria-label={`Select ${source.name}`} className="h-4 w-4 rounded border-slate-300" />}
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${badge.dot}`} />
                    <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-[color:var(--navy)] hover:underline">{source.name}</a>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${coverageBadge.className}`}>
                      {coverageBadge.label}{source.coverage.distanceMiles === null ? "" : ` · ${source.coverage.distanceMiles.toFixed(1)} mi`}
                    </span>
                    {source.inventoryMismatch === "DATABASE_ONLY" && <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">No registered scraper</span>}
                    {source.inventoryMismatch === "REGISTRY_ONLY" && <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">Scraper missing database source</span>}
                    {source.consecutiveFailures > 0 && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-700">{source.consecutiveFailures} consecutive failure{source.consecutiveFailures === 1 ? "" : "s"}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>{getSourceTypeLabel(source.type)}</span><span>{getSourceSectionLabel(source.section)}</span>
                    <span>{[source.city, source.county].filter(Boolean).join(", ")}</span>
                    {source.scrapeFrequency && <span>Runs {source.scrapeFrequency}</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Last run</p><p className="mt-1 text-sm font-medium text-slate-800">{source.lastScrapedAt ? formatTimestamp(source.lastScrapedAt) : "Never"}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Found last run</p><p className="mt-1 text-sm font-medium text-slate-800">{source.lastLog?.itemsFound ?? "—"}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Created / updated</p><p className="mt-1 text-sm font-medium text-slate-800">{source.lastLog ? `${source.lastLog.itemsCreated} / ${source.lastLog.itemsUpdated}` : "—"}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Published / total</p><p className="mt-1 text-sm font-medium text-slate-800">{source.publishedContentCount} / {source.eventCount}</p></div>
                  </div>
                  {source.healthWarning && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{source.healthWarning}</p>}
                  {source.inventoryMismatch !== "NONE" && <p className="mt-2 rounded-xl bg-purple-50 px-3 py-2 text-xs font-medium text-purple-800">{source.inventoryMismatch === "DATABASE_ONLY" ? "This source exists in the database but has no matching scraper registered in code. It cannot be run automatically until those names are reconciled." : "This scraper is registered in code but does not have a matching source record in the database."}</p>}
                  {source.lastLog?.message && <p className="mt-2 text-xs text-slate-500"><span className="font-semibold">Last result:</span> {source.lastLog.message}</p>}
                  {source.notes && <p className="mt-2 text-xs italic text-slate-500">{source.notes}</p>}
                </div>
                <div className="shrink-0 space-y-2 lg:max-w-72">
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {source.hasAutomatedScraper && <a href={`/admin/sources/${source.id}/preview`} className="btn btn-ghost btn-xs">Preview</a>}
                    {source.hasAutomatedScraper && source.active && <form action={runSingleScraperAction}><input type="hidden" name="sourceId" value={source.id} /><button type="submit" className="btn btn-primary btn-xs">Run now</button></form>}
                    {source.health !== "RETIRED" && <form action={toggleSourceActiveAction}><input type="hidden" name="sourceId" value={source.id} /><input type="hidden" name="nextActive" value={String(!source.active)} /><button type="submit" className="btn btn-ghost btn-xs">{source.active ? "Pause" : "Activate"}</button></form>}
                    {source.health === "RETIRED" ? <form action={restoreSourceAction}><input type="hidden" name="sourceId" value={source.id} /><button type="submit" className="btn btn-ghost btn-xs">Restore</button></form> : <form action={retireSourceAction}><input type="hidden" name="sourceId" value={source.id} /><button type="submit" className="btn btn-ghost btn-xs">Retire</button></form>}
                    <a href={`/admin?tab=sources&editSource=${source.id}`} className="btn btn-ghost btn-xs">Edit</a>
                    <a href={`/admin?tab=logs&logSrc=${encodeURIComponent(source.name)}`} className="btn btn-ghost btn-xs">View logs</a>
                  </div>
                  <p className="text-right text-[0.7rem] leading-4 text-slate-500">Retiring is reversible and preserves all {source.ownedRecordCounts.total} owned record{source.ownedRecordCounts.total === 1 ? "" : "s"}, including {source.publishedContentCount} published.</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
