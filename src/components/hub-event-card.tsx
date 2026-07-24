import type { Event } from "@prisma/client";
import Link from "next/link";

import { EventImage } from "@/components/event-image";
import {
  createCalendarUrl,
  formatDateTimeRange,
  formatMoneyText,
  getCategoryLabel,
  parseStoredList,
} from "@/lib/hub-format";

export function HubEventCard({ event }: { event: Event }) {
  const tags = parseStoredList(event.tags);

  return (
    <article className="rounded-[1.75rem] border border-[color:var(--line)] bg-white shadow-[0_25px_60px_-45px_rgba(24,40,60,0.4)]">
      <Link href={`/events/${event.id}`} className="block">
        <EventImage
          title={event.title}
          imageUrl={event.imageUrl}
          category={event.category}
          className="h-44 rounded-b-none"
        />
      </Link>

      <div className="p-5">
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <span className="rounded-full bg-[color:var(--navy-soft)] px-3 py-1 text-[color:var(--navy)]">
          {getCategoryLabel(event.category)}
        </span>
        {event.isFree ? (
          <span className="rounded-full bg-[color:var(--forest-soft)] px-3 py-1 text-[color:var(--forest)]">Free</span>
        ) : null}
        {event.isKidFriendly ? (
          <span className="rounded-full bg-[color:var(--gold-soft)] px-3 py-1 text-[color:var(--navy)]">Kid-friendly</span>
        ) : null}
      </div>

      <h3 className="mt-4 font-serif text-2xl text-[color:var(--navy)]">
        <Link href={`/events/${event.id}`} className="hover:text-[color:var(--forest)]">
          {event.title}
        </Link>
      </h3>
      <p className="mt-3 text-sm font-medium text-slate-600">{formatDateTimeRange(event.startDateTime, event.endDateTime)}</p>
      <p className="mt-1 text-sm text-slate-600">
        {[event.locationName, event.city, event.county].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-700">
        {event.description || "Details are limited in the source listing. Use the original link for updates."}
      </p>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-slate-600">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Cost</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{formatMoneyText(event.cost, event.isFree)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--forest)] hover:text-[color:var(--forest)]"
          >
            Add to calendar
          </a>
          <Link
            href={`/events/${event.id}`}
            className="rounded-full bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)]"
          >
            Details
          </Link>
        </div>
      </div>
      </div>
    </article>
  );
}
