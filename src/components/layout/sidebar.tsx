"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, RadioTower } from "lucide-react";

import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[290px] shrink-0 flex-col rounded-[32px] border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] backdrop-blur-xl lg:flex">
      <div className="rounded-[28px] border border-line/80 bg-surface-strong p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-[20px] bg-accent-soft p-3 text-accent">
            <Headphones className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Miller Command Center</p>
            <h1 className="mt-1 text-2xl font-semibold">Personal control room</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Media shelves, machines, house rhythm, creative work, and family memory lanes in one warm little operating system.
        </p>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-[24px] border px-4 py-4 transition",
                active
                  ? "border-accent/30 bg-accent-soft text-ink"
                  : "border-transparent hover:border-line hover:bg-surface-strong",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "rounded-2xl p-2.5",
                    active ? "bg-accent text-ink-inverse" : "bg-bg-strong text-ink-soft",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-[24px] border border-line/80 bg-surface-strong p-4">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-signal-soft p-2.5 text-signal">
            <RadioTower className="h-4 w-4" />
          </span>
          <div>
            <p className="eyebrow">Build status</p>
            <h2 className="mt-1 text-lg font-semibold">Mocked, honest, expandable.</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          No pretend live data yet. The goal of v1 is clean architecture, believable content, and real places for the integrations to land.
        </p>
      </div>
    </aside>
  );
}
