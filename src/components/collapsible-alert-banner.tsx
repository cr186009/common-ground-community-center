"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "community-alert-banner-state-v1";
const SEEN_HIGH_KEY = "community-alert-banner-seen-high-v1";

export type AlertBannerItem = {
  id: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  severityLabel: string;
  alertTypeLabel: string;
  sourceUrl: string;
  description: string | null;
};

const SEVERITY_RANK: Record<string, number> = {
  EMERGENCY: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// Per-severity Tailwind classes (badge pill, border+bg of card row, text color)
const SEVERITY_STYLES: Record<
  string,
  { badge: string; row: string; text: string; icon: string }
> = {
  EMERGENCY: {
    badge: "bg-[color:var(--alert)] text-white",
    row: "border-[color:var(--alert)]/20 bg-[color:var(--alert-soft)]",
    text: "text-[color:var(--alert)]",
    icon: "text-[color:var(--alert)]",
  },
  HIGH: {
    badge: "bg-orange-600 text-white",
    row: "border-orange-200/70 bg-orange-50",
    text: "text-orange-700",
    icon: "text-orange-600",
  },
  MEDIUM: {
    badge: "bg-amber-500 text-white",
    row: "border-amber-200/70 bg-amber-50",
    text: "text-amber-700",
    icon: "text-amber-500",
  },
  LOW: {
    badge: "bg-[color:var(--navy-soft)] text-[color:var(--navy)]",
    row: "border-[color:var(--navy-soft)] bg-[color:var(--navy-soft)]/40",
    text: "text-[color:var(--navy)]",
    icon: "text-[color:var(--navy)]",
  },
};

function getTopSeverity(alerts: AlertBannerItem[]): AlertBannerItem["severity"] {
  return alerts.reduce<AlertBannerItem["severity"]>(
    (best, a) => (SEVERITY_RANK[a.severity] > SEVERITY_RANK[best] ? a.severity : best),
    "LOW",
  );
}

export function CollapsibleAlertBanner({ alerts }: { alerts: AlertBannerItem[] }) {
  // Always start expanded so server and client first-render agree (no hydration mismatch).
  // useEffect then applies the stored preference / mobile default.
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Compute the sorted IDs of all HIGH/EMERGENCY alerts for "new alert" detection
    const urgentIds = alerts
      .filter((a) => a.severity === "HIGH" || a.severity === "EMERGENCY")
      .map((a) => a.id)
      .sort()
      .join(",");

    let nextExpanded: boolean;

    const stored = localStorage.getItem(STORAGE_KEY);
    const lastSeenUrgent = localStorage.getItem(SEEN_HIGH_KEY) ?? "";
    const hasNewUrgent = urgentIds !== "" && urgentIds !== lastSeenUrgent;

    if (hasNewUrgent) {
      // A new HIGH or EMERGENCY alert arrived — force expand once
      nextExpanded = true;
      localStorage.setItem(STORAGE_KEY, "expanded");
    } else if (stored === "minimized") {
      nextExpanded = false;
    } else if (stored === "expanded") {
      nextExpanded = true;
    } else {
      // No saved preference — expanded on md+, minimized on mobile
      nextExpanded = window.innerWidth >= 768;
    }

    // Always keep the seen-high record current so the next page load won't re-expand
    if (urgentIds) {
      localStorage.setItem(SEEN_HIGH_KEY, urgentIds);
    }

    setIsExpanded(nextExpanded);
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = !isExpanded;
    setIsExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "expanded" : "minimized");
    } catch {
      // localStorage unavailable (private browsing, storage full, etc.) — silent
    }
  }

  if (alerts.length === 0) return null;

  const topSeverity = getTopSeverity(alerts);
  const topStyles = SEVERITY_STYLES[topSeverity] ?? SEVERITY_STYLES.LOW;
  // Before hydration renders expanded (server default). After mount uses real preference.
  const expanded = mounted ? isExpanded : true;
  const count = alerts.length;

  return (
    <section
      className={`rounded-[1.75rem] border overflow-hidden ${topStyles.row}`}
      aria-label="Active community alerts"
    >
      {/* ── Minimized compact row ─────────────────────────────── */}
      {!expanded && (
        <div className="flex min-h-0 items-center gap-3 px-5 py-3">
          <AlertTriangle
            className={`h-4 w-4 shrink-0 ${topStyles.icon}`}
            aria-hidden="true"
          />
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${topStyles.badge}`}
          >
            {alerts[0].severityLabel}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
            {count === 1 ? "1 active alert" : `${count} active alerts`}
          </span>
          {count === 1 && (
            <span className="hidden min-w-0 truncate text-sm text-slate-600 sm:block">
              — {alerts[0].title}
            </span>
          )}
          <button
            type="button"
            onClick={toggle}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white/50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--navy)]"
            aria-expanded={false}
            aria-label="Expand alerts"
          >
            Expand
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Expanded full view ────────────────────────────────── */}
      {expanded && (
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 shrink-0 ${topStyles.icon}`}
                aria-hidden="true"
              />
              <span
                className={`text-xs font-bold uppercase tracking-[0.14em] ${topStyles.text}`}
              >
                {count === 1 ? "1 active alert" : `${count} active alerts`}
              </span>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white/50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--navy)]"
              aria-expanded={true}
              aria-label="Minimize alerts"
            >
              Minimize
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Alert list — scrollable on mobile when many alerts */}
          <ul
            className="max-h-[55vh] divide-y divide-black/5 overflow-y-auto px-5 pb-2 md:max-h-none"
            role="list"
          >
            {alerts.map((alert) => {
              const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.LOW;
              return (
                <li key={alert.id} className="py-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${styles.badge}`}
                    >
                      {alert.severityLabel}
                    </span>
                    <span
                      className={`text-xs font-semibold uppercase tracking-[0.12em] ${styles.text}`}
                    >
                      {alert.alertTypeLabel}
                    </span>
                  </p>
                  <p className="mt-1.5 font-semibold text-[color:var(--navy)]">
                    {alert.title}
                  </p>
                  {alert.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">
                      {alert.description}
                    </p>
                  )}
                  <a
                    href={alert.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-1.5 inline-block text-xs font-semibold hover:underline ${styles.text}`}
                  >
                    View source →
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Footer link */}
          <div className="border-t border-black/5 px-5 py-3">
            <Link
              href="/alerts"
              className={`text-sm font-semibold hover:underline ${topStyles.text}`}
            >
              View all alerts →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
