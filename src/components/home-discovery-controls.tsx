"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type CountyOption = {
  label: string;
  href: string;
  value: string;
};

type IntentOption = {
  label: string;
  href: string;
};

export function HomeDiscoveryControls({
  counties,
  intents,
  selectedCounty,
}: {
  counties: CountyOption[];
  intents: IntentOption[];
  selectedCounty: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (selectedCounty) {
      window.localStorage.setItem("common-ground-county", selectedCounty);
      return;
    }

    const rememberedCounty = window.localStorage.getItem("common-ground-county");
    if (rememberedCounty && counties.some(({ value }) => value === rememberedCounty)) {
      router.replace(`/?county=${encodeURIComponent(rememberedCounty)}`);
    }
  }, [counties, router, selectedCounty]);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-[color:var(--navy)]">
          Start with a county
        </p>
        <nav aria-label="Choose a county" className="flex flex-wrap gap-2">
          {counties.map((county) => {
            const isCurrent = county.value === selectedCounty;
            return (
              <Link
                key={county.label}
                href={county.href}
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => {
                  if (!county.value) {
                    window.localStorage.removeItem("common-ground-county");
                  }
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isCurrent
                    ? "border-[color:var(--forest)] bg-[color:var(--forest)] text-white"
                    : "border-[color:var(--line)] bg-white text-slate-700 hover:border-[color:var(--forest)] hover:text-[color:var(--forest)]"
                }`}
              >
                {county.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-[color:var(--navy)]">
          What sounds good?
        </p>
        <nav aria-label="Browse by time or interest" className="flex flex-wrap gap-2">
          {intents.map((intent) => (
            <Link
              key={intent.label}
              href={intent.href}
              className="rounded-full bg-[color:var(--navy-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--navy)] transition hover:bg-[color:var(--navy)] hover:text-white"
            >
              {intent.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
