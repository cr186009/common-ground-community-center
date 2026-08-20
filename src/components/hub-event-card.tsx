import type { Event } from "@prisma/client";
import Link from "next/link";

import { EventImage } from "@/components/event-image";
import { EventVerificationNotice } from "@/components/event-verification-notice";
import { MotionEventCard } from "@/components/motion/motion-event-card";
import {
  createCalendarUrl,
  formatDateTimeRange,
  formatMoneyText,
  getCategoryLabel,
  parseStoredList,
} from "@/lib/hub-format";
import { partitionEventTags } from "@/lib/event-tags";
import {
  cleanPublicText,
  summarizePublicText,
} from "@/server/hub-scrapers/helpers";

type HubEventCardProps = {
  event: Event;
  additionalOccurrences?: Event[];
};

export function HubEventCard({
  event,
  additionalOccurrences = [],
}: HubEventCardProps) {
  const tags = parseStoredList(event.tags);
  const { visibleTags, hiddenTags } = partitionEventTags(tags);
  const hasAdditionalOccurrences = additionalOccurrences.length > 0;
  const fullDescription = cleanPublicText(event.description).replace(/\s+/g, " ");
  const description = event.description
    ? summarizePublicText(event.description, 220)
    : "Details are limited in the source listing. Use the original link for updates.";

  return (
    <MotionEventCard className="rounded-[1.75rem] border border-[color:var(--line)] bg-white shadow-[0_25px_60px_-45px_rgba(24,40,60,0.4)]">
      <Link href={`/events/${event.id}`} className="block">
        <EventImage
          title={event.title}
          imageUrl={event.imageUrl}
          category={event.category}
          imageAlt={event.imageAlt}
          imageCredit={event.imageCredit}
          imageCreditUrl={event.imageCreditUrl}
          imageIsFallback={event.imageIsFallback}
          className="h-44 rounded-b-none"
        />
      </Link>

      <div className="p-5">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="rounded-full bg-[color:var(--navy-soft)] px-3 py-1 text-[color:var(--navy)]">
            {getCategoryLabel(event.category)}
          </span>

          {event.isFree ? (
            <span className="rounded-full bg-[color:var(--forest-soft)] px-3 py-1 text-[color:var(--forest)]">
              Free
            </span>
          ) : null}

          {event.isKidFriendly ? (
            <span className="rounded-full bg-[color:var(--gold-soft)] px-3 py-1 text-[color:var(--navy)]">
              Kid-friendly
            </span>
          ) : null}

          {hasAdditionalOccurrences ? (
            <span className="rounded-full bg-stone-100 px-3 py-1 text-slate-600">
              {additionalOccurrences.length + 1} dates
            </span>
          ) : null}
        </div>

        <h3 className="mt-4 font-serif text-2xl text-[color:var(--navy)]">
          <Link
            href={`/events/${event.id}`}
            className="hover:text-[color:var(--forest)]"
          >
            {event.title}
          </Link>
        </h3>

        <p className="mt-3 text-sm font-medium text-slate-600">
          {formatDateTimeRange(
            event.startDateTime,
            event.endDateTime,
            event.isAllDay,
          )}
        </p>

        <EventVerificationNotice
          dateStatus={event.dateVerificationStatus}
          timeStatus={event.timeVerificationStatus}
          sourceUrl={event.originalUrl || event.sourceUrl}
          lastCheckedAt={event.lastSeenAt}
          compact
        />

        <p className="mt-1 text-sm text-slate-600">
          {[event.locationName, event.city, event.county]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {hasAdditionalOccurrences ? (
          <details className="mt-4 rounded-2xl border border-[color:var(--line)] bg-stone-50">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--navy)]">
              More dates ({additionalOccurrences.length})
            </summary>

            <div className="border-t border-[color:var(--line)] px-4 py-2">
              <ul className="divide-y divide-[color:var(--line)]">
                {additionalOccurrences.map((occurrence) => (
                  <li
                    key={occurrence.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={`/events/${occurrence.id}`}
                      className="text-sm font-medium text-slate-700 hover:text-[color:var(--forest)]"
                    >
                      {formatDateTimeRange(
                        occurrence.startDateTime,
                        occurrence.endDateTime,
                        occurrence.isAllDay,
                      )}
                    </Link>

                    <a
                      href={createCalendarUrl({
                        title: occurrence.title,
                        description: occurrence.description,
                        location: [
                          occurrence.locationName,
                          occurrence.address,
                          occurrence.city,
                        ]
                          .filter(Boolean)
                          .join(", "),
                        start: occurrence.startDateTime,
                        end: occurrence.endDateTime,
                        isAllDay: occurrence.isAllDay,
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[color:var(--forest)] hover:underline"
                    >
                      Add date
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}

        <p className="mt-4 text-sm leading-6 text-slate-700">
          {description}
        </p>
        {event.description && description !== fullDescription ? (
          <Link
            href={`/events/${event.id}`}
            className="mt-2 inline-flex text-sm font-semibold text-[color:var(--forest)] hover:underline"
            aria-label={`Read the full description for ${event.title}`}
          >
            Read more →
          </Link>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
            {hiddenTags.length > 0 ? (
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--navy)]">
                  +{hiddenTags.length} more
                  <span className="sr-only"> tags for {event.title}</span>
                </summary>
                <div className="mt-2 flex flex-wrap gap-2" aria-label={`Additional tags for ${event.title}`}>
                  {hiddenTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-stone-100 px-3 py-1 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
              Cost
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatMoneyText(event.cost, event.isFree)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={createCalendarUrl({
                title: event.title,
                description: event.description,
                location: [event.locationName, event.address, event.city]
                  .filter(Boolean)
                  .join(", "),
                start: event.startDateTime,
                end: event.endDateTime,
                isAllDay: event.isAllDay,
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
    </MotionEventCard>
  );
}
