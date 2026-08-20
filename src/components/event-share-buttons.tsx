"use client";

import { useState } from "react";

export function EventShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const configuredBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/u, "");
  const stableShareUrl = configuredBase ? `${configuredBase}${path}` : path;
  const eventUrl = () => `${window.location.origin}${path}`;

  async function share() {
    const url = eventUrl();
    if (navigator.share) await navigator.share({ title, url });
    else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(eventUrl());
    setCopied(true);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className="btn btn-ghost btn-sm">Share event</button>
      <button type="button" onClick={copy} className="btn btn-ghost btn-sm">{copied ? "Link copied" : "Copy link"}</button>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`I thought you might like this event: ${stableShareUrl}`)}`} className="btn btn-ghost btn-sm">Email</a>
      <button type="button" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl())}`, "_blank", "noopener,noreferrer")} className="btn btn-ghost btn-sm">Facebook</button>
    </div>
  );
}
