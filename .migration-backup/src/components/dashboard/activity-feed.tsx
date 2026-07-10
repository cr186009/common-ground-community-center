import { AudioWaveform, FolderClock, House, LibraryBig } from "lucide-react";

import type { ActivityItem } from "@/types/dashboard";

const activityIcons = [LibraryBig, FolderClock, AudioWaveform, House];

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const Icon = activityIcons[index % activityIcons.length];

        return (
          <div
            key={`${item.title}-${item.time}`}
            className="flex flex-col gap-4 rounded-[22px] border border-line/80 bg-surface-strong p-4 sm:flex-row sm:items-start"
          >
            <span className="rounded-2xl bg-bg-strong p-2.5 text-ink-soft">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold">{item.title}</p>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-ink-soft">
                  {item.time}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
