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
          Built with OpenAI Codex and managed by Alec Miller. I created this because I wanted a centralized place for people to find the activities and civic events in our area.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Friendly, nonpartisan community information with clear source attribution and room for residents to contribute.
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
