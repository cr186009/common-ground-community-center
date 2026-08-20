import { redirect } from "next/navigation";

import { formatCommunityDate } from "@/lib/hub-date";
import { isAdminAuthenticated } from "@/server/hub-auth";
import { previewScraperSourceById } from "@/server/hub-scrapers";

type PageProps = { params: Promise<{ id: string }> };

function formatPreviewDate(value: Date | null) {
  if (!value) return "No date supplied";
  return formatCommunityDate(value, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DECISION_STYLES = {
  NEW: "bg-emerald-100 text-emerald-800",
  EXISTING: "bg-slate-100 text-slate-700",
  CHANGED: "bg-sky-100 text-sky-800",
  DUPLICATE: "bg-violet-100 text-violet-800",
  INVALID: "bg-red-100 text-red-800",
  OUT_OF_AREA: "bg-amber-100 text-amber-800",
} as const;

export default async function ScraperPreviewPage({ params }: PageProps) {
  if (!(await isAdminAuthenticated())) redirect("/admin");

  const { id } = await params;
  let preview: Awaited<ReturnType<typeof previewScraperSourceById>> | null = null;
  let error: string | null = null;

  try {
    preview = await previewScraperSourceById(id);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "The preview could not be completed.";
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Scraper dry run</p>
          <h1 className="font-serif text-4xl text-[color:var(--navy)]">
            {preview?.source.name ?? "Source preview"}
          </h1>
        </div>
        <a href="/admin?tab=sources" className="btn btn-ghost btn-sm">Back to sources</a>
      </div>

      {error ? (
        <section className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5 text-red-800">
          <h2 className="font-semibold">Preview failed</h2>
          <p className="mt-1 text-sm">{error}</p>
        </section>
      ) : null}

      {preview ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(preview.counts).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-[color:var(--navy)]">{value}</p>
              </div>
            ))}
          </section>
          <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[color:var(--navy)]">Incoming records</h2>
                <p className="mt-1 text-sm text-slate-600">{preview.message}</p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                Nothing was saved
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {preview.items.length === 0 ? (
                <p className="text-sm text-amber-700">The scraper returned no records.</p>
              ) : preview.items.map((item, index) => (
                <article key={`${item.kind}-${item.title}-${index}`} className="rounded-2xl border border-[color:var(--line)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">{item.kind}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DECISION_STYLES[item.decision]}`}>
                      {item.decision.replaceAll("_", " ")}
                    </span>
                    {item.confidenceScore !== null ? (
                      <span className="text-xs text-slate-500">Confidence {Math.round(item.confidenceScore * 100)}%</span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-semibold text-[color:var(--navy)]">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-700">{formatPreviewDate(item.date)}</p>
                  <p className="text-sm text-slate-500">{[item.city, item.county].filter(Boolean).join(" · ") || "Location not supplied"}</p>
                  <p className="mt-2 text-xs text-slate-600">{item.reason}</p>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-[color:var(--navy)] underline">Open original</a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
