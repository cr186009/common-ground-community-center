"use client";

import type { Category } from "@prisma/client";

import { getDeliveredImageUrl } from "@/lib/cloudinary-image";
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
  deliveryWidth?: number;
  deliveryHeight?: number;
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
  deliveryWidth = 960,
  deliveryHeight = 540,
}: Props) {
  const label = imageAlt || title;
  const showAttribution = imageIsFallback && imageCredit && imageCreditUrl;
  const deliveredImageUrl = getDeliveredImageUrl(imageUrl, {
    width: deliveryWidth,
    height: deliveryHeight,
  });

  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] ${className ?? ""}`}
      style={
        deliveredImageUrl
          ? {
              backgroundImage: `url(${deliveredImageUrl})`,
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

      {/* Pexels attribution — only shown when imageIsFallback is true.
          Uses <span role="link"> instead of <a> to avoid nested-anchor
          invalid HTML when EventImage is rendered inside a card <Link>. */}
      {showAttribution && (
        <span
          className="absolute bottom-3 right-3 rounded-full bg-black/30 px-2 py-1 text-[10px] text-white/75 backdrop-blur-sm"
          aria-hidden="true"
        >
          Photo by{" "}
          <span
            role="link"
            tabIndex={0}
            className="cursor-pointer underline hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(imageCreditUrl!, "_blank", "noreferrer");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                window.open(imageCreditUrl!, "_blank", "noreferrer");
              }
            }}
          >
            {imageCredit}
          </span>{" "}
          on{" "}
          <span
            role="link"
            tabIndex={0}
            className="cursor-pointer underline hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open("https://www.pexels.com", "_blank", "noreferrer");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                window.open("https://www.pexels.com", "_blank", "noreferrer");
              }
            }}
          >
            Pexels
          </span>
        </span>
      )}
    </div>
  );
}
