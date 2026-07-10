import type { Tone } from "@/types/dashboard";

import { cn } from "@/lib/utils";

const toneMap: Record<Tone, string> = {
  signal: "bg-signal-soft text-signal",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
  success: "bg-success-soft text-success",
  muted: "bg-bg-strong text-ink-soft",
};

export function StatusBadge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.22em]",
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}
