import type { LucideIcon } from "lucide-react";

import type { Tone } from "@/types/dashboard";
import { cn } from "@/lib/utils";

const toneMap: Record<Tone, string> = {
  signal: "bg-signal-soft text-signal",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
  success: "bg-success-soft text-success",
  muted: "bg-bg-strong text-ink-soft",
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: Tone;
}) {
  return (
    <div className="flex h-full min-h-[220px] flex-col justify-center rounded-[24px] border border-dashed border-line bg-bg/35 p-5">
      <span className={cn("mb-4 inline-flex w-fit rounded-2xl p-3", toneMap[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-lg text-sm leading-6 text-ink-soft">{description}</p>
    </div>
  );
}
