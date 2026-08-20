"use client";

import {
  Children,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type HorizontalCardCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  itemLabel?: string;
  className?: string;
  cardClassName?: string;
};

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HorizontalCardCarousel({
  children,
  ariaLabel,
  itemLabel = "card",
  className = "",
  cardClassName = "",
}: HorizontalCardCarouselProps) {
  const items = Children.toArray(children);
  const carouselId = useId();
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || items.length === 0) return;

    const cards = Array.from(scroller.children) as HTMLElement[];
    const viewportCenter = scroller.scrollLeft + (scroller.clientWidth / 2);
    const firstCardOffset = cards[0].offsetLeft;
    const nextIndex = cards.reduce((closestIndex, card, index) => {
      const closestCenter = cards[closestIndex].offsetLeft - firstCardOffset + (cards[closestIndex].offsetWidth / 2);
      const cardCenter = card.offsetLeft - firstCardOffset + (card.offsetWidth / 2);
      const closestDistance = Math.abs(closestCenter - viewportCenter);
      const cardDistance = Math.abs(cardCenter - viewportCenter);
      return cardDistance < closestDistance ? index : closestIndex;
    }, 0);

    setActiveIndex(nextIndex);
  }, [items.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateActiveIndex();
    const resizeObserver = new ResizeObserver(updateActiveIndex);
    resizeObserver.observe(scroller);
    scroller.addEventListener("scroll", updateActiveIndex, { passive: true });

    return () => {
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", updateActiveIndex);
    };
  }, [updateActiveIndex]);

  const scrollToItem = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const target = scroller?.children.item(index) as HTMLElement | null;
    const firstCard = scroller?.children.item(0) as HTMLElement | null;
    if (!scroller || !target || !firstCard) return;

    scroller.scrollTo({
      left: target.offsetLeft - firstCard.offsetLeft,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    setActiveIndex(index);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.target !== event.currentTarget) return;

    let nextIndex = activeIndex;
    if (event.key === "ArrowRight") nextIndex = Math.min(activeIndex + 1, items.length - 1);
    else if (event.key === "ArrowLeft") nextIndex = Math.max(activeIndex - 1, 0);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else return;

    event.preventDefault();
    scrollToItem(nextIndex);
  };

  if (items.length === 0) return null;

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p id={`${carouselId}-instructions`} className="text-xs text-slate-500">
          Scroll sideways or use the arrow buttons to browse.
        </p>
        {items.length > 1 ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="min-w-12 text-center text-xs tabular-nums text-slate-500" aria-live="polite" aria-atomic="true">
              {activeIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-lg text-[color:var(--navy)] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Previous ${itemLabel}`}
              aria-controls={carouselId}
              disabled={activeIndex === 0}
              onClick={() => scrollToItem(activeIndex - 1)}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-lg text-[color:var(--navy)] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Next ${itemLabel}`}
              aria-controls={carouselId}
              disabled={activeIndex === items.length - 1}
              onClick={() => scrollToItem(activeIndex + 1)}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
      </div>

      <ul
        ref={scrollerRef}
        id={carouselId}
        aria-label={ariaLabel}
        aria-describedby={`${carouselId}-instructions`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto overscroll-x-contain pb-4 pr-4 scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--navy)] focus-visible:ring-offset-2 motion-reduce:scroll-auto"
      >
        {items.map((item, index) => (
          <li
            key={index}
            aria-label={`${itemLabel} ${index + 1} of ${items.length}`}
            className={`w-[min(86vw,30rem)] shrink-0 snap-start sm:w-[30rem] xl:w-[34rem] ${cardClassName}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
