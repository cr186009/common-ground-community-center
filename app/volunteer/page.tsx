import { CITY_FILTERS, COUNTY_FILTERS } from "@/lib/hub-constants";
import { formatDateTimeRange } from "@/lib/hub-format";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import { getVolunteerOpportunities } from "@/server/hub-data";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function VolunteerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const city = readSearchParam(params, "city") || undefined;
  const county = readSearchParam(params, "county") || undefined;
  const opportunities = await getVolunteerOpportunities({ city, county });

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

      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((item) => (
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
    </div>
  );
}
