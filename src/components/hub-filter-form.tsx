import { type Category } from "@prisma/client";

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
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Search events
        <input
          name="query"
          defaultValue={query}
          placeholder="Title, tags, or location"
          className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        City
        <select name="city" defaultValue={city ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal">
          <option value="">All cities</option>
          {CITY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        County
        <select name="county" defaultValue={county ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal">
          <option value="">All counties</option>
          {COUNTY_FILTERS.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Category
        <select name="category" defaultValue={category ?? ""} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal">
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-2">
        <legend className="mb-2 w-full text-sm font-medium text-slate-700">Quick filters</legend>
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
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="grid gap-2 text-sm font-medium text-slate-700">
          <legend>View</legend>
          <div className="grid grid-cols-3 rounded-2xl border border-[color:var(--line)] bg-stone-50 p-1">
            {[{ value: "list", label: "List" }, { value: "calendar", label: "Calendar" }, { value: "map", label: "Map" }].map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="view"
                  value={option.value}
                  defaultChecked={view === option.value}
                />
                <span className="block rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-600 peer-checked:bg-white peer-checked:text-[color:var(--navy)] peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--forest)]">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Month
          <select name="month" defaultValue={month} className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-normal">
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="submit"
          className="btn btn-primary btn-md"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}
