import Link from "next/link";

import { CITY_FILTERS, COUNTY_FILTERS } from "@/lib/hub-constants";
import { formatDateTimeRange } from "@/lib/hub-format";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import { buildSubmissionHref } from "@/lib/submission-context";
import { getVolunteerOpportunities } from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function VolunteerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const city = readSearchParam(params, "city") || undefined;
  const county = readSearchParam(params, "county") || undefined;
  const { current, past } = await getVolunteerOpportunities({ city, county });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Volunteer & community help</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Ways to help across nearby communities</h1>
        <p className="mt-2 text-sm text-slate-600">
          Food pantry needs, animal shelter support, donation drives, cleanup days, and other local ways to pitch in.
        </p>
      </section>

      <form className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-3">
        <select name="city" defaultValue={city ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All cities</option>
          {CITY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <select name="county" defaultValue={county ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="">All counties</option>
          {COUNTY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn btn-primary btn-md md:justify-self-end"
        >
          Apply filters
        </button>
      </form>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Current</p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Open opportunities</h2>
        </div>
        {current.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white p-8">
            <p className="text-sm text-slate-600">
              No current volunteer opportunities match these filters.
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--navy)]">
              Know somewhere that needs volunteers?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Share the need with neighbors. Submissions are reviewed before
              they appear publicly.
            </p>
            <Link
              href={buildSubmissionHref({
                city,
                county,
                submissionType: "VOLUNTEER",
              })}
              className="mt-4 inline-flex btn btn-primary btn-md"
            >
              Submit a volunteer opportunity
            </Link>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
        {current.map((item) => (
          <article key={item.id} className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.organization}</p>
            <h2 className="mt-3 font-serif text-2xl text-[color:var(--navy)]">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              {item.dateTime ? (
                <div>
                  <dt className="font-semibold text-slate-500">When</dt>
                  <dd>{formatDateTimeRange(item.dateTime, null)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-semibold text-slate-500">Where</dt>
                <dd>{[item.locationName, item.city, item.county].filter(Boolean).join(" · ")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Contact</dt>
                <dd>{[item.contactName, item.contactEmail].filter(Boolean).join(" · ") || "See source for contact details"}</dd>
              </div>
            </dl>
          </article>
        ))}
        </div>
      </section>

      {past.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Archive</p>
            <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Past volunteer opportunities</h2>
            <p className="mt-2 text-sm text-slate-600">Previous opportunities are retained for community reference.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {past.map((item) => (
              <article key={item.id} className="rounded-[1.75rem] border border-[color:var(--line)] bg-stone-50 p-5 text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Past opportunity · {item.organization}</p>
                <h3 className="mt-3 font-serif text-2xl text-[color:var(--navy)]">{item.title}</h3>
                {item.dateTime ? <p className="mt-2 text-sm">{formatDateTimeRange(item.dateTime, null)}</p> : null}
                <p className="mt-3 text-sm leading-6">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
