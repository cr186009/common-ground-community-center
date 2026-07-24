import { ALERT_TYPE_OPTIONS, CITY_FILTERS, COUNTY_FILTERS } from "@/lib/hub-constants";
import {
  formatTimestamp,
  getAlertSeverityLabel,
  getAlertTypeLabel,
} from "@/lib/hub-format";
import { parseAlertFilters, type SearchParamsRecord } from "@/lib/hub-search";
import { getAlerts } from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function AlertsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseAlertFilters(params);
  const { activeAlerts, expiredAlerts } = await getAlerts(filters);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Alerts & notices</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Local alerts, notices, and public safety updates</h1>
        <p className="mt-2 text-sm text-slate-600">
          Active notices appear first, followed by expired items for short-term reference.
        </p>
      </section>

      <form className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-3">
        <select name="city" defaultValue={filters.city ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All cities</option>
          {CITY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <select name="county" defaultValue={filters.county ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All counties</option>
          {COUNTY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={filters.alertType ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All alert types</option>
          {ALERT_TYPE_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn btn-primary btn-md md:col-span-3 md:justify-self-end"
        >
          Apply filters
        </button>
      </form>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Active</p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Current alerts</h2>
        </div>
        {activeAlerts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8 text-sm text-slate-600">
            No active alerts match the current filters.
          </div>
        ) : (
          <div className="grid gap-4">
            {activeAlerts.map((alert) => (
              <article key={alert.id} className="rounded-[1.75rem] border border-[color:var(--alert)]/18 bg-white p-5">
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span className="rounded-full bg-[color:var(--alert-soft)] px-3 py-1 text-[color:var(--alert)]">
                    {getAlertSeverityLabel(alert.severity)}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1">{getAlertTypeLabel(alert.alertType)}</span>
                </div>
                <h3 className="mt-4 font-serif text-2xl text-[color:var(--navy)]">{alert.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">{alert.description}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                  {(() => {
                    const affected = JSON.parse(alert.affectedCounties || "[]") as string[];
                    const location = affected.length > 0
                      ? affected.join(", ")
                      : [alert.city, alert.county].filter(Boolean).join(" · ");
                    return <span>{location}</span>;
                  })()}
                  <span>Updated {formatTimestamp(alert.updatedAt)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Source:{" "}
                  <a
                    href={alert.originalUrl || alert.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-[color:var(--navy)]"
                  >
                    {alert.sourceName}
                  </a>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Expired</p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Recent past notices</h2>
        </div>
        <div className="grid gap-4">
          {expiredAlerts.map((alert) => (
            <article key={alert.id} className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
              <h3 className="font-semibold text-[color:var(--navy)]">{alert.title}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {getAlertTypeLabel(alert.alertType)} · {formatTimestamp(alert.expiresAt)}
                {(() => {
                  const affected = JSON.parse(alert.affectedCounties || "[]") as string[];
                  return affected.length > 0 ? ` · ${affected.join(", ")}` : null;
                })()}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Source:{" "}
                <a
                  href={alert.originalUrl || alert.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-[color:var(--navy)]"
                >
                  {alert.sourceName}
                </a>
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
