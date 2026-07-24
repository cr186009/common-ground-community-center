import { notFound } from "next/navigation";

import { EventImage } from "@/components/event-image";
import {
  createCalendarUrl,
  formatDateTimeRange,
  formatMoneyText,
  getCategoryLabel,
  parseStoredList,
} from "@/lib/hub-format";
import { getEventById } from "@/server/hub-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event || event.status !== "APPROVED") {
    notFound();
  }

  const tags = parseStoredList(event.tags);

  return (
    <article className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--line)] bg-white shadow-[0_30px_85px_-45px_rgba(20,44,68,0.48)]">
        <EventImage
          title={event.title}
          imageUrl={event.imageUrl}
          category={event.category}
          imageAlt={event.imageAlt}
          imageCredit={event.imageCredit}
          imageCreditUrl={event.imageCreditUrl}
          imageIsFallback={event.imageIsFallback}
          className="h-64 rounded-b-none md:h-80"
        />
        <div className="p-8">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="rounded-full bg-[color:var(--navy-soft)] px-3 py-1 text-[color:var(--navy)]">
            {getCategoryLabel(event.category)}
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1">{event.city}</span>
          <span className="rounded-full bg-stone-100 px-3 py-1">{event.county}</span>
          {event.isOutdoor ? <span className="rounded-full bg-stone-100 px-3 py-1">Outdoor</span> : null}
        </div>
        <h1 className="mt-5 font-serif text-4xl text-[color:var(--navy)]">{event.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          {event.description || "This listing was imported with limited detail. Use the original source link for the latest information."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={createCalendarUrl({
              title: event.title,
              description: event.description,
              location: [event.locationName, event.address, event.city].filter(Boolean).join(", "),
              start: event.startDateTime,
              end: event.endDateTime,
            })}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-md"
          >
            Add to calendar
          </a>
          <a
            href={event.originalUrl || event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-md hover:border-[color:var(--forest)] hover:text-[color:var(--forest)]"
          >
            View original source
          </a>
        </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Event details</h2>
          <dl className="mt-5 grid gap-5 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">Date and time</dt>
              <dd className="mt-1 text-slate-800">{formatDateTimeRange(event.startDateTime, event.endDateTime)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Location</dt>
              <dd className="mt-1 text-slate-800">
                {[event.locationName, event.address, event.city, event.county].filter(Boolean).join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Cost</dt>
              <dd className="mt-1 text-slate-800">{formatMoneyText(event.cost, event.isFree)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Source attribution</dt>
              <dd className="mt-1 text-slate-800">{event.sourceName}</dd>
            </div>
            {tags.length > 0 ? (
              <div>
                <dt className="font-semibold text-slate-500">Tags</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--forest-soft)] p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Family and access notes</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>{event.isKidFriendly ? "Kid-friendly event." : "Check the organizer details for age-specific guidance."}</li>
              <li>{event.isOutdoor ? "Outdoor setting, so weather may affect timing." : "Indoor or unspecified location."}</li>
              <li>{event.isFree ? "Free to attend." : "Pricing varies; the source link may include ticket details."}</li>
            </ul>
          </div>
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Why source links matter</h2>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              This site keeps the original source visible so residents can double-check event timing, sign-up instructions, parking notes, and last-minute changes.
            </p>
          </div>
        </aside>
      </section>
    </article>
  );
}
