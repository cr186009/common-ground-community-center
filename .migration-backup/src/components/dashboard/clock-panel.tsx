"use client";

import { useEffect, useState } from "react";
import { Clock4 } from "lucide-react";

import { formatFullDate, formatTime } from "@/lib/utils";

export function ClockPanel({ timezoneLabel }: { timezoneLabel: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-2xl bg-accent-soft p-2.5 text-accent">
          <Clock4 className="h-4 w-4" />
        </span>
        <div>
          <p className="eyebrow text-ink-inverse/62">{timezoneLabel}</p>
          <p className="mt-1 text-sm text-ink-inverse/70">{formatFullDate(now)}</p>
        </div>
      </div>
      <p className="text-5xl leading-none font-semibold">{formatTime(now)}</p>
      <p className="mt-3 text-sm text-ink-inverse/68">Built to stay glanceable from a phone, not just admired on a big screen.</p>
    </div>
  );
}
