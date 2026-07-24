import { getAdminImageData } from "@/server/hub-data";
import {
  assignBulkFallbackImagesAction,
  assignFallbackImageAction,
  removeFallbackImageAction,
  replaceFallbackImageAction,
} from "@/server/hub-actions";
import { formatDateTimeRange } from "@/lib/hub-format";

type Props = {
  bulkAssigned?: string;
  bulkSkipped?: string;
  bulkFailed?: string;
  imageAssigned?: string;
  imageReplaced?: string;
  imageRemoved?: string;
};

export async function ImagesSection({
  bulkAssigned,
  bulkSkipped,
  bulkFailed,
  imageAssigned,
  imageReplaced,
  imageRemoved,
}: Props) {
  const hasPexelsKey = Boolean(process.env.PEXELS_API_KEY);

  if (!hasPexelsKey) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-serif text-2xl text-amber-900">Pexels integration not configured</h2>
          <p className="mt-3 text-sm text-amber-800">
            Add <code className="rounded bg-amber-100 px-1">PEXELS_API_KEY</code> to Replit Secrets
            to enable fallback image assignment.
          </p>
        </section>
        <ImageStatsOnly />
      </div>
    );
  }

  const imageData = await getAdminImageData();

  const showBulkResult =
    bulkAssigned !== undefined || bulkSkipped !== undefined || bulkFailed !== undefined;

  return (
    <div className="space-y-6">
      {/* Flash messages */}
      {imageAssigned && (
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Fallback image assigned.
        </div>
      )}
      {imageReplaced && (
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Fallback image replaced with a new selection.
        </div>
      )}
      {imageRemoved && (
        <div className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          Image removed from event.
        </div>
      )}
      {showBulkResult && (
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Bulk assign complete — {bulkAssigned ?? 0} assigned, {bulkSkipped ?? 0} skipped,{" "}
          {bulkFailed ?? 0} failed.
        </div>
      )}

      {/* Image stats */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-[color:var(--navy)]">Image summary</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total approved</p>
            <p className="mt-2 font-serif text-3xl text-[color:var(--navy)]">
              {imageData.stats.total}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
              Missing (upcoming)
            </p>
            <p
              className={`mt-2 font-serif text-3xl ${
                imageData.stats.missingUpcoming > 0 ? "text-amber-700" : "text-[color:var(--navy)]"
              }`}
            >
              {imageData.stats.missingUpcoming}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Pexels fallback</p>
            <p className="mt-2 font-serif text-3xl text-sky-700">{imageData.stats.withFallback}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Source images</p>
            <p className="mt-2 font-serif text-3xl text-emerald-700">
              {imageData.stats.withSource}
            </p>
          </div>
        </div>
      </section>

      {/* Bulk assign */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Bulk assign fallback images</h2>
        <p className="mt-2 text-sm text-slate-600">
          Assigns Pexels fallback images to upcoming approved events that are currently missing
          images. Maximum 25 per run. Skips events with existing real images.
        </p>
        <form action={assignBulkFallbackImagesAction} className="mt-4">
          <button type="submit" className="btn btn-primary btn-md" disabled={!hasPexelsKey}>
            Assign fallback images (up to 25)
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Photos provided by{" "}
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-600"
          >
            Pexels
          </a>
        </p>
      </section>

      {/* Missing images list */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">
          Upcoming events missing images
        </h2>
        <div className="mt-4 space-y-3">
          {imageData.missingUpcomingEvents.length === 0 ? (
            <p className="text-sm text-emerald-700">All upcoming events have images. ✓</p>
          ) : (
            imageData.missingUpcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-4"
              >
                <div>
                  <p className="font-semibold text-[color:var(--navy)]">{event.title}</p>
                  <p className="text-sm text-slate-500">
                    {event.startDateTime.toLocaleDateString()} · {event.city} ·{" "}
                    {event.category.replaceAll("_", " ")}
                  </p>
                </div>
                <form action={assignFallbackImageAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <button type="submit" className="btn btn-ghost btn-xs">
                    Assign image
                  </button>
                </form>
              </div>
            ))
          )}
          {imageData.missingUpcomingEvents.length > 0 && (
            <p className="text-xs text-slate-400">
              Showing up to 50 upcoming events missing images.
            </p>
          )}
        </div>
      </section>

      {/* Pexels fallback images list */}
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
        <h2 className="font-serif text-2xl text-[color:var(--navy)]">Events using Pexels fallback images</h2>
        <div className="mt-4 space-y-3">
          {imageData.fallbackEvents.length === 0 ? (
            <p className="text-sm text-slate-600">No events are currently using Pexels fallback images.</p>
          ) : (
            imageData.fallbackEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {event.imageUrl && (
                      <div
                        className="h-12 w-16 shrink-0 overflow-hidden rounded-xl"
                        style={{
                          backgroundImage: `url(${event.imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    )}
                    <div>
                      <p className="font-semibold text-[color:var(--navy)]">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {event.startDateTime.toLocaleDateString()} · {event.city}
                        {event.imageCredit && (
                          <>
                            {" · "}
                            <a
                              href={event.imageCreditUrl ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              Photo by {event.imageCredit}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={replaceFallbackImageAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Replace
                      </button>
                    </form>
                    <form action={removeFallbackImageAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="btn btn-ghost btn-xs">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// Shown when Pexels key is absent — still show stats if available
async function ImageStatsOnly() {
  const imageData = await getAdminImageData().catch(() => null);
  if (!imageData) return null;
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total approved</p>
          <p className="mt-2 font-serif text-3xl text-[color:var(--navy)]">{imageData.stats.total}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Missing (upcoming)</p>
          <p className={`mt-2 font-serif text-3xl ${imageData.stats.missingUpcoming > 0 ? "text-amber-700" : "text-[color:var(--navy)]"}`}>
            {imageData.stats.missingUpcoming}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">With images</p>
          <p className="mt-2 font-serif text-3xl text-[color:var(--navy)]">{imageData.stats.withSource}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Pexels fallback</p>
          <p className="mt-2 font-serif text-3xl text-[color:var(--navy)]">{imageData.stats.withFallback}</p>
        </div>
      </div>
    </section>
  );
}
