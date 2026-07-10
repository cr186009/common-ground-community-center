"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[28px] border border-line bg-surface/95 px-2 py-2 shadow-[var(--shadow)] backdrop-blur-xl lg:hidden">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4.35rem] shrink-0 flex-col items-center gap-1 rounded-[20px] px-2 py-2 text-center text-[0.68rem] font-medium transition",
                active ? "bg-accent text-ink-inverse" : "text-ink-soft",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
