import type { Category } from "@prisma/client";

import { getCategoryLabel } from "@/lib/hub-format";

type Props = {
  title: string;
  imageUrl?: string | null;
  category: Category;
  className?: string;
};

export function EventImage({ title, imageUrl, category, className }: Props) {
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
      aria-label={title}
    >
      {/* Scrim so the badge is readable over both photos and the gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <span className="absolute bottom-3 left-3 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
        {getCategoryLabel(category)}
      </span>
    </div>
  );
}
