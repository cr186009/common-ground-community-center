import type { Category } from "@/types/hub";
import { CATEGORY_OPTIONS, CITY_FILTERS, COUNTY_FILTERS } from "@/lib/hub-constants";

type MonthOption = {
  value: string;
  label: string;
};

export function HubFilterForm({
  city,
  county,
  category,
  query,
  view,
  month,
  monthOptions,
  isFree,
  isKidFriendly,
  isOutdoor,
}: {
  city?: string;
  county?: string;
  category?: Category;
  query?: string;
  view: string;
  month: string;
  monthOptions: MonthOption[];
  isFree?: boolean;
  isKidFriendly?: boolean;
  isOutdoor?: boolean;
}) {
  return (
    <form className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
      <input
        name="query"
        defaultValue={query}
        placeholder="Search title, tags, location..."
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
      />
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
      <select
        name="category"
        defaultValue={category ?? ""}
        className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
      >
        <option value="">All categories</option>
        {CATEGORY_OPTIONS.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-2">
        <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
          <input type="checkbox" name="free" value="1" defaultChecked={isFree} />
          Free
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
          <input type="checkbox" name="kids" value="1" defaultChecked={isKidFriendly} />
          Kid-friendly
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
          <input type="checkbox" name="outdoor" value="1" defaultChecked={isOutdoor} />
          Outdoor
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select name="view" defaultValue={view} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          <option value="list">List view</option>
          <option value="calendar">Calendar view</option>
        </select>
        <select name="month" defaultValue={month} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="submit"
          className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--navy-dark)]"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}
