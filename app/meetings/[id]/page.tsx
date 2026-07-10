import { notFound } from "next/navigation";

import {
  formatDateTimeRange,
  getMeetingTypeLabel,
  parseStoredList,
} from "@/lib/hub-format";
import { getMeetingById } from "@/server/hub-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeetingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const meeting = await getMeetingById(id);

  if (!meeting || meeting.status === "ARCHIVED") {
    notFound();
  }

  const keyTopics = parseStoredList(meeting.keyTopics);

  return (
    <article className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--line)] bg-white p-8 shadow-[0_30px_85px_-45px_rgba(20,44,68,0.48)]">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="rounded-full bg-[color:var(--navy-soft)] px-3 py-1 text-[color:var(--navy)]">
            {getMeetingTypeLabel(meeting.meetingType)}
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1">{meeting.governmentBody}</span>
        </div>
        <h1 className="mt-5 font-serif text-4xl text-[color:var(--navy)]">{meeting.title}</h1>
        <p className="mt-3 text-sm text-slate-600">{formatDateTimeRange(meeting.startDateTime, meeting.endDateTime)}</p>
        <p className="mt-1 text-sm text-slate-600">{[meeting.locationName, meeting.address, meeting.city, meeting.county].filter(Boolean).join(" · ")}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Official meeting info</h2>
            <dl className="mt-5 grid gap-5 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Agenda</dt>
                <dd className="mt-1">
                  {meeting.agendaUrl ? (
                    <a href={meeting.agendaUrl} target="_blank" rel="noreferrer" className="text-[color:var(--forest)]">
                      Open agenda
                    </a>
                  ) : (
                    "Agenda not added yet"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Minutes</dt>
                <dd className="mt-1">
                  {meeting.minutesUrl ? (
                    <a href={meeting.minutesUrl} target="_blank" rel="noreferrer" className="text-[color:var(--forest)]">
                      Open minutes
                    </a>
                  ) : (
                    "Minutes not added yet"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Video</dt>
                <dd className="mt-1">
                  {meeting.videoUrl ? (
                    <a href={meeting.videoUrl} target="_blank" rel="noreferrer" className="text-[color:var(--forest)]">
                      Watch video
                    </a>
                  ) : (
                    "Video link not added yet"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Source</dt>
                <dd className="mt-1">
                  <a href={meeting.originalUrl || meeting.sourceUrl} target="_blank" rel="noreferrer" className="text-[color:var(--forest)]">
                    {meeting.sourceName}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Plain-English summary</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              {meeting.plainEnglishSummary || meeting.summary || "A plain-English summary has not been generated yet."}
            </p>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--gold-soft)]/50 p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Key topics</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {keyTopics.length > 0 ? (
                keyTopics.map((topic) => (
                  <span key={topic} className="rounded-full bg-white px-3 py-1 text-sm text-slate-700">
                    {topic}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-700">Topics have not been added yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
            <h2 className="font-serif text-2xl text-[color:var(--navy)]">Why residents might care</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              {meeting.whyResidentsCare ||
                "Meeting outcomes can affect local services, budgets, infrastructure, neighborhood growth, and how public resources are used."}
            </p>
          </div>
        </aside>
      </section>
    </article>
  );
}
