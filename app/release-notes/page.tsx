import type { Metadata } from "next";

import { RELEASE_NOTES } from "@/data/release-notes";

export const metadata: Metadata = {
  title: "Release notes | Common Ground Community Center",
  description: "Plain-language updates about improvements to Common Ground Community Center.",
};

const releaseDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default function ReleaseNotesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Release notes</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">What&apos;s new at Common Ground</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Follow the improvements we make to community listings, reliability, and the experience of using the site. These updates are written without technical jargon so everyone can see what changed.
        </p>
      </section>

      <div className="space-y-5">
        {RELEASE_NOTES.map((release) => (
          <article
            key={release.slug}
            id={release.slug}
            className="scroll-mt-40 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6 sm:p-8"
          >
            <time dateTime={release.publishedOn} className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--forest)]">
              {releaseDateFormatter.format(new Date(`${release.publishedOn}T00:00:00Z`))}
            </time>
            <h2 className="mt-3 font-serif text-3xl text-[color:var(--navy)]">{release.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{release.summary}</p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {release.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[color:var(--gold-dark)]" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

