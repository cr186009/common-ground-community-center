import type { Category } from "@prisma/client";

import { getCategoryLabel } from "@/lib/hub-format";

type Props = {
  title: string;
  imageUrl?: string | null;
  category: Category;
  className?: string;
  // Pexels attribution — populated after db push and Pexels API setup
  imageCredit?: string | null;
  imageCreditUrl?: string | null;
  imageAlt?: string | null;
  imageIsFallback?: boolean | null;
};

export function EventImage({
  title,
  imageUrl,
  category,
  className,
  imageCredit,
  imageCreditUrl,
  imageAlt,
  imageIsFallback,
}: Props) {
  const label = imageAlt || title;
  const showAttribution = imageIsFallback && imageCredit && imageCreditUrl;

  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] ${className ?? ""}`}
      style={
        imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              background:
                "linear-gradient(135deg, var(--navy) 0%, var(--forest) 55%, var(--gold) 100%)",
            }
      }
      role="img"
      aria-label={label}
    >
      {/* Scrim so the badge is readable over both photos and the gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Category badge */}
      <span className="absolute bottom-3 left-3 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
        {getCategoryLabel(category)}
      </span>

      {/* Pexels attribution — only shown when imageIsFallback is true */}
      {showAttribution && (
        <span
          className="absolute bottom-3 right-3 rounded-full bg-black/30 px-2 py-1 text-[10px] text-white/75 backdrop-blur-sm"
          aria-hidden="true"
        >
          Photo by{" "}
          <a
            href={imageCreditUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {imageCredit}
          </a>{" "}
          on{" "}
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            Pexels
          </a>
        </span>
      )}
    </div>
  );
}
