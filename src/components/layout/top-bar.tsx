import { Search, SlidersHorizontal } from "lucide-react";

import { formatFullDate } from "@/lib/utils";

export function TopBar() {
  const today = formatFullDate(new Date());

  return (
    <header className="panel-strong flex flex-col gap-4 px-5 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="eyebrow">Control room</p>
        <p className="mt-2 text-lg font-medium text-ink-soft">{today}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-line bg-bg/70 px-4 py-3 text-sm text-ink-soft">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Quick find lands once the command palette is wired.</span>
        </div>
        <button
          type="button"
          className="inline-flex h-12 w-12 items-center justify-center rounded-[22px] border border-line bg-bg/70 text-ink-soft transition hover:border-accent/40 hover:text-ink"
          aria-label="Open preferences placeholder"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
