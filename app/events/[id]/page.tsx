import { notFound } from "next/navigation";

import { EventImage } from "@/components/event-image";
import { EventVerificationNotice } from "@/components/event-verification-notice";
import {
  createCalendarUrl,
  formatDateTimeRange,
  formatMoneyText,
  getCategoryLabel,
  parseStoredList,
} from "@/lib/hub-format";
import { getEventById } from "@/server/hub-data";
import { registerEventInterestAction } from "@/server/hub-actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import { EventShareButtons } from "@/components/event-share-buttons";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EventDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const interested = readSearchParam(query, "interested");
  const interestError = readSearchParam(query, "interestError");
  const event = await getEventById(id);

  if (
    !event ||
    event.status !== "APPROVED" ||
    event.dateVerificationStatus === "CONFLICT" ||
    event.timeVerificationStatus === "CONFLICT"
  ) {
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
            <span className="rounded-full bg-stone-100 px-3 py-1">
              {event.city}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1">
              {event.county}
            </span>
            {event.isOutdoor ? (
              <span className="rounded-full bg-stone-100 px-3 py-1">
                Outdoor
              </span>
            ) : null}
          </div>
          <h1 className="mt-5 font-serif text-4xl text-[color:var(--navy)]">
            {event.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            {event.description ||
              "This listing was imported with limited detail. Use the original source link for the latest information."}
          </p>
          <div className="mt-5 max-w-3xl">
            <EventVerificationNotice
              dateStatus={event.dateVerificationStatus}
              timeStatus={event.timeVerificationStatus}
              sourceUrl={event.originalUrl || event.sourceUrl}
              lastCheckedAt={event.lastSeenAt}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={createCalendarUrl({
                title: event.title,
                description: event.description,
                location: [event.locationName, event.address, event.city]
                  .filter(Boolean)
                  .join(", "),
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
          <div className="mt-4"><EventShareButtons title={event.title} path={`/events/${event.id}`} /></div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">
            Event details
          </h2>
          <dl className="mt-5 grid gap-5 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">Date and time</dt>
              <dd className="mt-1 text-slate-800">
                {formatDateTimeRange(
                  event.startDateTime,
                  event.endDateTime,
                  event.isAllDay,
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Location</dt>
              <dd className="mt-1 text-slate-800">
                {[event.locationName, event.address, event.city, event.county]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Cost</dt>
              <dd className="mt-1 text-slate-800">
                {formatMoneyText(event.cost, event.isFree)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">
                Source attribution
              </dt>
              <dd className="mt-1 text-slate-800">{event.sourceName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Date and time verification</dt>
              <dd className="mt-1 text-slate-800">
                Date: {event.dateVerificationStatus.replaceAll("_", " ").toLowerCase()}; time: {event.timeVerificationStatus.replaceAll("_", " ").toLowerCase()}.
              </dd>
            </div>
            {tags.length > 0 ? (
              <div>
                <dt className="font-semibold text-slate-500">Tags</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-stone-100 px-3 py-1 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--gold-soft)]/50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Community interest</p>
            <h2 className="mt-2 font-serif text-2xl text-[color:var(--navy)]">
              {event._count.interests} {event._count.interests === 1 ? "neighbor is" : "neighbors are"} interested
            </h2>
            {event.interests.length > 0 ? (
              <p className="mt-2 text-sm text-slate-600">Including {event.interests.map((entry) => entry.displayName).join(", ")}</p>
            ) : null}
            {interested ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your interest was saved. Thanks for helping show what matters locally.</p> : null}
            {interestError === "captcha" ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Please complete the CAPTCHA and try again.</p> : null}
            <form action={registerEventInterestAction} className="mt-5 grid gap-3">
              <input type="hidden" name="eventId" value={event.id} />
              <input name="displayName" maxLength={60} placeholder="First name (optional)" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <input name="email" type="email" required placeholder="Email address" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                <input type="checkbox" name="showNamePublicly" className="mt-1" />
                Show my first name publicly with this event. Your email is never displayed.
              </label>
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                <input type="checkbox" name="reminderRequested" className="mt-1" />
                Email me one reminder about 24 hours before this event.
              </label>
              <TurnstileWidget />
              <button type="submit" className="btn btn-primary btn-md">I’m interested</button>
            </form>
          </div>
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--forest-soft)] p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">
              Family and access notes
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>
                {event.isKidFriendly
                  ? "Kid-friendly event."
                  : "Check the organizer details for age-specific guidance."}
              </li>
              <li>
                {event.isOutdoor
                  ? "Outdoor setting, so weather may affect timing."
                  : "Indoor or unspecified location."}
              </li>
              <li>
                {event.isFree
                  ? "Free to attend."
                  : "Pricing varies; the source link may include ticket details."}
              </li>
            </ul>
          </div>
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">
              Why source links matter
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              This site keeps the original source visible so residents can
              double-check event timing, sign-up instructions, parking notes,
              and last-minute changes.
            </p>
          </div>
        </aside>
      </section>
    </article>
  );
}
