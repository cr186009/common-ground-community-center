import { Bell, Calendar, Home, Plus, Search } from "lucide-react";
import Link from "next/link";

import { SITE_NAME } from "@/lib/hub-constants";

const mobileNavLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/search", label: "Search", icon: Search },
  { href: "/submit", label: "Submit", icon: Plus },
];

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
      <header className="sticky top-0 z-30 hidden border-b border-[color:var(--line)] bg-[color:rgba(255,253,248,0.94)] backdrop-blur lg:block">
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
                    className="btn btn-forest btn-sm"
                  >
                    Search
                  </button>
                </form>
                <Link
                  href="/submit"
                  className="btn btn-gold btn-md"
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

      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-8">{children}</main>

      {/* Mobile bottom navigation — hidden on lg and above */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-[color:var(--line)] bg-[color:rgba(255,253,248,0.97)] backdrop-blur lg:hidden">
        {mobileNavLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-500 transition hover:text-[color:var(--navy)]"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>

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
