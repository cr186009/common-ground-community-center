import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: Array<{ href: string; label: string }>;
}) {
  return (
    <section className="panel-strong px-5 py-6 md:px-6 md:py-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl space-y-3">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="balanced-wrap text-4xl leading-[0.94] font-semibold md:text-5xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-soft md:text-base">{description}</p>
        </div>

        {actions?.length ? (
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-[18px] border border-line bg-bg/70 px-4 py-3 text-sm font-medium transition hover:border-accent/45 hover:text-accent"
              >
                <span>{action.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
