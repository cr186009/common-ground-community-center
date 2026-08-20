"use client";

import { Bell, Calendar, Home, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { href: "/release-notes", label: "Updates" },
];

export function HubShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isCurrent(href: string) {
    return href === "/" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,67,103,0.13),_transparent_40%),linear-gradient(180deg,_#f8f2e6_0%,_#fffdfa_42%,_#f0f5ed_100%)] text-slate-900">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

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
                  <label htmlFor="site-search" className="sr-only">
                    Search community events, alerts, meetings, and volunteer opportunities
                  </label>
                  <input
                    id="site-search"
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

            <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition hover:border-[color:var(--forest)]/30 hover:text-[color:var(--forest)] ${isCurrent(link.href) ? "border-[color:var(--forest)] bg-[color:var(--forest-soft)] text-[color:var(--forest)]" : "border-[color:var(--line)] bg-white/80 text-slate-700"}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-[color:rgba(255,253,248,0.96)] px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="font-serif text-lg font-semibold text-[color:var(--navy)]">
            {SITE_NAME}
          </Link>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--navy)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--navy)]">
              More
            </summary>
            <nav aria-label="More navigation" className="absolute right-0 mt-2 grid min-w-48 gap-1 rounded-2xl border border-[color:var(--line)] bg-white p-2 shadow-xl">
              {links.filter((link) => !mobileNavLinks.some((mobileLink) => mobileLink.href === link.href)).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-sm font-medium ${isCurrent(link.href) ? "bg-[color:var(--forest-soft)] text-[color:var(--forest)]" : "text-slate-700 hover:bg-stone-50"}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-8">{children}</main>

      {/* Mobile bottom navigation — hidden on lg and above */}
      <nav aria-label="Mobile navigation" className="fixed bottom-0 inset-x-0 z-40 flex border-t border-[color:var(--line)] bg-[color:rgba(255,253,248,0.97)] pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {mobileNavLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent(href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[0.625rem] font-semibold uppercase tracking-[0.08em] transition hover:text-[color:var(--navy)] ${isCurrent(href) ? "bg-[color:var(--navy-soft)]/60 text-[color:var(--navy)]" : "text-slate-500"}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>

      <footer className="border-t border-[color:var(--line)] bg-white/70 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
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
              We manually review Facebook event pages. Because these listings
              are checked by people rather than collected automatically, some
              may take longer to appear.
            </p>
            <Link href="/release-notes" className="mt-3 inline-flex font-semibold text-[color:var(--forest)] hover:underline">
              Read the latest site updates
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
