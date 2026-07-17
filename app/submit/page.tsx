import {
  CATEGORY_OPTIONS,
  COUNTY_FILTERS,
  SUBMISSION_TYPE_OPTIONS,
} from "@/lib/hub-constants";
import { readSearchParam, type SearchParamsRecord } from "@/lib/hub-search";
import { submitCommunityItemAction } from "@/server/hub-actions";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function SubmitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const success = readSearchParam(params, "success");

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Community submissions</p>
        <h1 className="mt-3 font-serif text-4xl text-[color:var(--navy)]">Submit an event, activity, volunteer need, or notice</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Residents, schools, nonprofits, libraries, churches, civic groups, and local businesses can submit items for review. Every submission starts in a pending moderation queue.
        </p>
      </section>

      {success ? (
        <div className="rounded-[1.75rem] border border-[color:var(--forest)]/20 bg-[color:var(--forest-soft)] p-4 text-sm text-[color:var(--forest)]">
          Your submission is in the moderation queue. Thanks for helping keep the community informed.
        </div>
      ) : null}

      <form action={submitCommunityItemAction} className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6 md:grid-cols-2">
        <input name="submitterName" placeholder="Your name" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
        <input name="submitterEmail" type="email" placeholder="Your email" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />

        <select name="submissionType" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm">
          {SUBMISSION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select name="category" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input name="title" placeholder="Title" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" required />
        <textarea name="description" placeholder="Description" className="min-h-32 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />

        <input name="startDateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
        <input name="endDateTime" type="datetime-local" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
        <input name="locationName" placeholder="Location name" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
        <input name="address" placeholder="Street address" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
        <input name="city" placeholder="City" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required />
        <select name="county" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" required>
          {COUNTY_FILTERS.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </select>

        <input name="cost" placeholder="Cost or ticket info (optional)" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
        <input name="tags" placeholder="Tags, separated by commas" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm" />
        <input name="sourceUrl" type="url" placeholder="Optional source URL" className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm md:col-span-2" />

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
            <input type="checkbox" name="isFree" />
            Free
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
            <input type="checkbox" name="isKidFriendly" />
            Kid-friendly
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-slate-700">
            <input type="checkbox" name="isOutdoor" />
            Outdoor
          </label>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="btn btn-primary btn-md"
          >
            Submit for review
          </button>
        </div>
      </form>
    </div>
  );
}
