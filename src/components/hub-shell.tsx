import Link from "next/link";

import { SITE_NAME } from "@/lib/hub-constants";

const links = [
  { href: "/events", label: "Events" },
  { href: "/alerts", label: "Alerts" },
  { href: "/meetings", label: "Meetings" },
  { href: "/activities", label: "Activities" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/submit", label: "Submit" },
  { href: "/about", label: "About" },
];

export function HubShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,67,103,0.13),_transparent_40%),linear-gradient(180deg,_#f8f2e6_0%,_#fffdfa_42%,_#f0f5ed_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-[color:rgba(255,253,248,0.94)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--navy)] text-lg font-black text-[color:var(--cream)] shadow-[0_14px_30px_-16px_rgba(17,44,68,0.9)]">
                  CG
                </div>
                <div>
                  <Link href="/" className="font-serif text-2xl font-semibold tracking-tight text-[color:var(--navy)]">
                    {SITE_NAME}
                  </Link>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    A community-first bulletin board for nearby local Georgia communities.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form action="/search" className="flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-3 py-2 shadow-sm">
                  <input
                    name="query"
                    placeholder="Search events, alerts, meetings, volunteer..."
                    className="w-full min-w-0 border-0 bg-transparent px-2 text-sm outline-none sm:w-72"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-[color:var(--forest)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--forest-dark)]"
                  >
                    Search
                  </button>
                </form>
                <Link
                  href="/submit"
                  className="rounded-full bg-[color:var(--gold)] px-5 py-3 text-sm font-semibold text-[color:var(--navy)] transition hover:bg-[color:var(--gold-dark)]"
                >
                  Submit an item
                </Link>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-[color:var(--line)] bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[color:var(--forest)]/30 hover:text-[color:var(--forest)]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/admin"
                className="rounded-full border border-dashed border-[color:var(--line)] bg-transparent px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-[color:var(--navy)]"
              >
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-[color:var(--line)] bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <p className="font-semibold text-[color:var(--navy)]">{SITE_NAME}</p>
            <p className="mt-2 leading-6">
              Friendly, nonpartisan community information with clear source attribution and room for residents to contribute.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[color:var(--navy)]">What we prioritize</p>
            <p className="mt-2 leading-6">
              Official sites, public meetings, community events, and useful local alerts.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[color:var(--navy)]">Facebook policy</p>
            <p className="mt-2 leading-6">
              Facebook pages are tracked as manual-review sources so the app does not depend on aggressive scraping.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
