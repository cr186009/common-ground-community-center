import {
  getAdminDashboardData,
  getAdminExtendedCounts,
  getAdminOverviewCounts,
  getAdminSourceHealth,
  getDigestPreview,
  type SourceHealthStatus,
} from "@/server/hub-data";
import {
  approveSubmittedEventAction,
  generateMeetingSummaryAction,
  rejectSubmittedEventAction,
} from "@/server/hub-actions";
import { getSupportedScraperNames } from "@/server/hub-scrapers";
import { formatDateTimeRange, formatTimestamp } from "@/lib/hub-format";

type Props = {
  subscriberId?: string;
};

const HEALTH_BADGE: Record<SourceHealthStatus, { label: string; className: string }> = {
  HEALTHY: { label: "Healthy", className: "bg-emerald-100 text-emerald-800" },
  WARNING: { label: "Warning", className: "bg-amber-100 text-amber-800" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
  MANUAL: { label: "Manual", className: "bg-slate-100 text-slate-600" },
  INACTIVE: { label: "Inactive", className: "bg-stone-100 text-stone-500" },
};

function StatCard({
  label,
  value,
  colorClass = "text-[color:var(--navy)]",
}: {
  label: string;
  value: number | string;
  colorClass?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 font-serif text-3xl ${colorClass}`}>{value}</p>
    </div>
  );
}

export async function OverviewSection({ subscriberId }: Props) {
  const scraperNames = getSupportedScraperNames();
  const [counts, extended, dashboard, sources, digestPreview] = await Promise.all([
    getAdminOverviewCounts(),
    getAdminExtendedCounts(),
    getAdminDashboardData(),
    getAdminSourceHealth(scraperNames),
    getDigestPreview(subscriberId),
  ]);

  const healthCounts = sources.reduce<Record<SourceHealthStatus, number>>(
    (acc, s) => {
      acc[s.health] = (acc[s.health] ?? 0) + 1;
      return acc;
    },
    { HEALTHY: 0, WARNING: 0, FAILED: 0, MANUAL: 0, INACTIVE: 0 },
  );

  const attentionItems: string[] = [];
  if (counts.pendingSubmissions > 0)
    attentionItems.push(`${counts.pendingSubmissions} pending submission(s) awaiting review`);
  if (extended.scraperFailures7d > 0)
    attentionItems.push(`${extended.scraperFailures7d} scraper failure(s) in the last 7 days`);
  if (healthCounts.FAILED > 0)
    attentionItems.push(`${healthCounts.FAILED} source(s) with a failed last scrape`);
  if (extended.missingUpcomingImages > 0)
    attentionItems.push(`${extended.missingUpcomingImages} upcoming event(s) missing images`);

  const staleSources = sources.filter(
    (s) => s.health === "WARNING" && s.hasAutomatedScraper && s.active,
  );
  if (staleSources.length > 0)
    attentionItems.push(`${staleSources.length} automated source(s) stale or returning no results`);

  const neverScraped = sources.filter(
    (s) => s.active && s.hasAutomatedScraper && !s.lastScrapedAt,
  );
  if (neverScraped.length > 0)
    attentionItems.push(`${neverScraped.length} active source(s) have never been scraped`);

  return (
    <div className="space-y-6">
      {/* Stat cards — row 1: content counts */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-[color:var(--navy)]">Content</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Approved events" value={counts.approvedEvents} />
          <StatCard label="Active alerts" value={counts.activeAlerts} />
          <StatCard label="Upcoming meetings" value={counts.upcomingMeetings} />
          <StatCard label="Open volunteer" value={counts.openVolunteer} />
          <StatCard
            label="Pending submissions"
            value={counts.pendingSubmissions}
            colorClass={counts.pendingSubmissions > 0 ? "text-amber-700" : "text-[color:var(--navy)]"}
          />
          <StatCard label="Active sources" value={counts.activeSources} />
        </div>
      </section>

      {/* Stat cards — row 2: operational health */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-[color:var(--navy)]">Operations</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Missing images (upcoming)"
            value={extended.missingUpcomingImages}
            colorClass={
              extended.missingUpcomingImages > 0 ? "text-amber-700" : "text-[color:var(--navy)]"
            }
          />
          <StatCard label="Pexels fallback images" value={extended.fallbackImages} />
          <StatCard label="Events with source images" value={extended.sourceImages} />
          <StatCard
            label="Scraper failures (7 days)"
            value={extended.scraperFailures7d}
            colorClass={
              extended.scraperFailures7d > 0 ? "text-red-700" : "text-emerald-700"
            }
          />
          <StatCard label="Inactive sources" value={extended.inactiveSources} />
        </div>
      </section>

      {/* Needs attention */}
      {attentionItems.length > 0 && (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-serif text-xl text-amber-900">Needs attention</h2>
          <ul className="mt-4 space-y-2">
            {attentionItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-amber-800">
                <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {attentionItems.length === 0 && (
        <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm text-emerald-800">✓ Everything looks healthy. No issues detected.</p>
        </section>
      )}

      {/* Source health summary */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Source health summary</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {(Object.keys(HEALTH_BADGE) as SourceHealthStatus[]).map((status) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${HEALTH_BADGE[status].className}`}
              >
                {HEALTH_BADGE[status].label}
              </span>
              <span className="font-serif text-lg text-slate-700">{healthCounts[status]}</span>
            </div>
          ))}
        </div>
        {healthCounts.FAILED > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">
              Failed sources
            </p>
            {sources
              .filter((s) => s.health === "FAILED")
              .map((s) => (
                <div key={s.id} className="rounded-2xl bg-red-50 p-3 text-sm">
                  <span className="font-semibold text-red-800">{s.name}</span>
                  {s.lastLog && (
                    <span className="ml-2 text-red-600">— {s.lastLog.message}</span>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Pending submissions */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Pending community submissions</h2>
          <span className="text-sm text-slate-500">{dashboard.pendingSubmissions.length} shown</span>
        </div>
        <div className="mt-5 space-y-4">
          {dashboard.pendingSubmissions.length === 0 ? (
            <p className="text-sm text-slate-600">No pending submissions.</p>
          ) : (
            dashboard.pendingSubmissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-[color:var(--line)] bg-stone-50 p-4"
              >
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span className="rounded-full bg-white px-3 py-1">
                    {submission.submissionType.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    {submission.category.replaceAll("_", " ")}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-[color:var(--navy)]">{submission.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {submission.city} · {submission.county} ·{" "}
                  {formatDateTimeRange(submission.startDateTime, submission.endDateTime)}
                </p>
                {submission.description && (
                  <p className="mt-3 text-sm text-slate-700">{submission.description}</p>
                )}
                <p className="mt-3 text-sm text-slate-500">
                  {submission.submitterName} · {submission.submitterEmail}
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
      </section>

      {/* Recent meetings + digest */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Recent meetings</h2>
          <div className="mt-4 space-y-3">
            {dashboard.meetings.length === 0 ? (
              <p className="text-sm text-slate-600">No meetings found.</p>
            ) : (
              dashboard.meetings.map((meeting) => (
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
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Weekly digest preview</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">{digestPreview.intro}</p>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Featured events
              </p>
              <div className="mt-2 space-y-2">
                {digestPreview.featuredEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-stone-50 p-3 text-sm text-slate-700">
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Alerts
              </p>
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
      </section>

      {/* Subscribers */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Subscribers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dashboard.subscribers.map((subscriber) => (
            <a
              key={subscriber.id}
              href={`/admin?tab=overview&subscriber=${subscriber.id}`}
              className="block rounded-2xl bg-stone-50 p-4 hover:bg-stone-100"
            >
              <p className="font-semibold text-[color:var(--navy)]">{subscriber.email}</p>
              <p className="mt-1 text-sm text-slate-600">
                {[subscriber.city, subscriber.county].filter(Boolean).join(" · ") ||
                  "No location preference"}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
