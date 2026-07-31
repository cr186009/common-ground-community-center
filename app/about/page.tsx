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
          Common Ground was created and is maintained by Alec Miller, with Christopher Robertson serving as Co-developer and Web Experience Designer. The project exists to give residents one dependable place to find activities, public meetings, alerts, and opportunities to help across our area.
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
    </div>
  );
}
