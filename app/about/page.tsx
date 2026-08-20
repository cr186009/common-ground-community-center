import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">About</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">A local digital community center</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Common Ground Digital Community Center is a friendly, nonpartisan local hub for events, public alerts, volunteer needs, and plain-English civic information. The goal is simple: help residents find what matters nearby without needing to hunt across dozens of pages.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Common Ground began with Alec Miller&apos;s idea and vision for a dependable digital gathering place that helps neighbors stay connected to their community. Alec founded the concept and continues to shape its purpose, while Christopher Robertson serves as Co-developer and Web Experience Designer and maintains the site&apos;s technical experience. Together, their contributions help residents find activities, public meetings, alerts, and opportunities to help across our area.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Although the site is hosted on the Miller for Georgia domain, listings are included without regard to political party or viewpoint. Official sources are prioritized, resident submissions follow the same moderation standards, and every listing links back to its source whenever possible.
        </p>
        <p className="mt-4 max-w-3xl text-xs leading-6 text-slate-500">
          Technical development is supported by OpenAI Codex.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">What we prioritize</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">Official sites, public meetings, community events, and useful local alerts.</p>
        </article>
        <article className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Source-aware</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Listings keep visible source attribution so people can verify details and check original announcements when needed.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[color:var(--navy)]">Community-first</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            The tone is warm, useful, and easy to scan, with room for residents to contribute and help keep the calendar current.
          </p>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">How listings stay trustworthy</p>
        <h2 className="mt-3 font-serif text-3xl text-[color:var(--navy)]">Sourcing, freshness, and corrections</h2>
        <div className="mt-5 grid gap-5 text-sm leading-7 text-slate-700 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-[color:var(--navy)]">Source-listed</h3>
            <p className="mt-1">
              The date or time appears on an identifiable original listing. This is useful source information, but it is distinct from an independently or manually confirmed schedule.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[color:var(--navy)]">Freshness</h3>
            <p className="mt-1">
              Automated calendars are checked on schedules suited to their source. Public refresh claims are shown only when the relevant event sources are current; precise run history remains available to administrators.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[color:var(--navy)]">Corrections</h3>
            <p className="mt-1">
              If a listing changed, check its original-source link first, then send the corrected details and source through our moderated submission form.
            </p>
            <Link href="/submit" className="mt-3 inline-flex font-semibold text-[color:var(--forest)] underline">
              Submit a correction
            </Link>
          </div>
        </div>
        <p className="mt-6 border-t border-[color:var(--line)] pt-5 text-xs leading-6 text-slate-500">
          Common Ground does not publish subscriber email addresses or private reminder records. Community submissions are reviewed before publication, and source reliability, schedule evidence, and collection freshness are evaluated separately rather than combined into one opaque score.
        </p>
      </section>
    </div>
  );
}
