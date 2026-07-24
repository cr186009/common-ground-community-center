import { getAdminScrapeLogs, type AdminLogFilters } from "@/server/hub-data";
import { formatTimestamp } from "@/lib/hub-format";

type Props = {
  sourceName?: string;
  status?: string;
  zeros?: string;
  created?: string;
  page?: number;
};

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
};

function sanitizeDetails(raw: string): string {
  // Redact anything that looks like an API key or secret in the output
  return raw
    .replace(/Authorization:\s*\S+/gi, "Authorization: [redacted]")
    .replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi, "$1: [redacted]")
    .replace(/\b[A-Z][A-Z0-9_]{7,}=[^\s,}\]"]+/g, "[env var redacted]");
}

export async function LogsSection({ sourceName, status, zeros, created, page }: Props) {
  const filters: AdminLogFilters = {
    sourceName,
    status,
    zeros: zeros === "1",
    created: created === "1",
    page: page ?? 1,
  };

  const { logs, total, page: currentPage, totalPages } = await getAdminScrapeLogs(filters);

  const filterBase = `/admin?tab=logs${sourceName ? `&logSrc=${encodeURIComponent(sourceName)}` : ""}${status ? `&logSta=${encodeURIComponent(status)}` : ""}${zeros === "1" ? "&zeros=1" : ""}${created === "1" ? "&created=1" : ""}`;

  return (
    <div className="space-y-6">
      {/* Filter form */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Scrape logs</h2>
        <form method="get" action="/admin" className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="tab" value="logs" />
          <input
            name="logSrc"
            placeholder="Source name"
            defaultValue={sourceName}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          />
          <select
            name="logSta"
            defaultValue={status ?? ""}
            className="rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
            <input type="checkbox" name="zeros" value="1" defaultChecked={zeros === "1"} />
            Zero-result runs
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
            <input type="checkbox" name="created" value="1" defaultChecked={created === "1"} />
            Runs that created records
          </label>
          <button type="submit" className="btn btn-primary btn-sm">
            Apply
          </button>
          <a href="/admin?tab=logs" className="btn btn-ghost btn-sm">
            Clear
          </a>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          {total} log(s) · Page {currentPage} of {totalPages}
        </p>
      </section>

      {/* Log list */}
      <section className="space-y-3">
        {logs.length === 0 && (
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <p className="text-sm text-slate-600">No scrape logs match the current filters.</p>
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-[color:var(--navy)]">{log.sourceName}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_BADGE[log.status] ?? "bg-stone-100 text-stone-600"
                }`}
              >
                {log.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{log.message}</p>
            <p className="mt-1.5 text-xs text-slate-400">
              Found {log.itemsFound} · Created {log.itemsCreated} · Updated {log.itemsUpdated} ·{" "}
              {formatTimestamp(log.createdAt)}
            </p>
            {log.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                  View details
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
                  {sanitizeDetails(log.details)}
                </pre>
              </details>
            )}
          </div>
        ))}
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
    </div>
  );
}
