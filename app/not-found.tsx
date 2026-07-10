import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white p-8">
      <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Not found</p>
      <h1 className="mt-3 font-serif text-3xl text-[color:var(--navy)]">That page or community record could not be found.</h1>
      <p className="mt-3 text-sm text-slate-600">
        The record may have been removed, archived, or the link may be incomplete.
      </p>
      <Link href="/" className="mt-5 inline-block font-semibold text-[color:var(--forest)] hover:text-[color:var(--forest-dark)]">
        Return to the homepage
      </Link>
    </div>
  );
}
