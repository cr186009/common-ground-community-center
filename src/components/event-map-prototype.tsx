"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

import type { EventMapPoint } from "@/lib/event-map";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function EventMapPrototype({ points }: { points: EventMapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [selectedId, setSelectedId] = useState(points[0]?.id ?? null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "failed">("loading");
  const selected = points.find((point) => point.id === selectedId) ?? points[0];

  useEffect(() => {
    let active = true;
    let tileErrorCount = 0;

    async function initialize() {
      if (!containerRef.current || points.length === 0) return;
      try {
        const L = await import("leaflet");
        if (!active || !containerRef.current) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomAnimation: !reduceMotion,
          fadeAnimation: !reduceMotion,
          markerZoomAnimation: !reduceMotion,
        });
        mapRef.current = map;
        const bounds = L.latLngBounds([]);

        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          maxZoom: 19,
        })
          .on("tileerror", () => {
            tileErrorCount += 1;
            if (tileErrorCount >= 3 && active) setMapStatus("failed");
          })
          .addTo(map);

        for (const point of points) {
          const location = L.latLng(point.latitude, point.longitude);
          bounds.extend(location);
          const marker = L.circleMarker(location, {
            radius: 9,
            color: "#173f5f",
            fillColor: "#2f7d67",
            fillOpacity: 0.9,
            weight: 2,
          }).addTo(map);
          marker.bindPopup(
            `<strong>${escapeHtml(point.title)}</strong><br>${escapeHtml(point.dateTimeLabel)}<br>${escapeHtml(point.city)}<br><small>Approximate city-center location</small>`,
          );
          marker.on("click", () => setSelectedId(point.id));
          const markerElement = marker.getElement();
          if (markerElement) {
            markerElement.setAttribute("tabindex", "0");
            markerElement.setAttribute("role", "button");
            markerElement.setAttribute(
              "aria-label",
              `${point.title}, ${point.dateTimeLabel}, ${point.city}, approximate city-center location`,
            );
            markerElement.addEventListener("keydown", (event) => {
              const keyboardEvent = event as KeyboardEvent;
              if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                setSelectedId(point.id);
                marker.openPopup();
              } else if (keyboardEvent.key === "Escape") {
                marker.closePopup();
                (markerElement as HTMLElement).focus();
              }
            });
          }
        }

        if (points.length === 1) map.setView(bounds.getCenter(), 11, { animate: false });
        else map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11, animate: false });
        setMapStatus("ready");
      } catch {
        if (active) setMapStatus("failed");
      }
    }

    void initialize();
    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[color:var(--line)] bg-white">
      <div className="p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Explore by area</p>
        <h2 className="mt-2 font-serif text-3xl text-[color:var(--navy)]">Upcoming events on the map</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pins are approximate city centers until venue addresses are geocoded. Always confirm the venue on the event page.
        </p>
        <a href="#event-map-location-list" className="mt-3 inline-block text-sm font-semibold text-[color:var(--forest)] hover:underline">
          Skip map and browse locations
        </a>
      </div>

      <div className={mapStatus === "failed" ? "hidden" : "relative border-y border-[color:var(--line)]"}>
        <p id="event-map-instructions" className="sr-only">
          Interactive map with approximate city-center markers. Use Tab to reach markers, Enter or Space to open one, and Escape to close it. Scroll-wheel zoom is disabled.
        </p>
        <div ref={containerRef} className="event-leaflet-map h-[30rem] w-full bg-stone-100 md:h-[38rem]" role="region" aria-label="Map of approximate event locations" aria-describedby="event-map-instructions" />
        {mapStatus === "loading" ? (
          <p className="absolute inset-0 grid place-items-center bg-stone-100 text-sm text-slate-600">Loading map…</p>
        ) : null}
      </div>

      {mapStatus === "failed" ? (
        <div role="status" className="border-y border-[color:var(--line)] bg-stone-50 px-6 py-5 text-sm text-slate-600">
          The interactive map or its tiles could not load. Browse every mapped location below.
        </div>
      ) : null}

      {selected ? (
        <div className="border-b border-[color:var(--line)] bg-[color:var(--navy-soft)]/40 px-6 py-4" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Selected event</p>
          <p className="mt-1 font-semibold text-[color:var(--navy)]">{selected.title}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{selected.dateTimeLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{selected.city} · approximate city-center pin</p>
          <a href={`/events/${selected.id}`} className="mt-2 inline-block text-sm font-semibold text-[color:var(--forest)] hover:underline">View event details →</a>
        </div>
      ) : null}

      <ul id="event-map-location-list" className="grid scroll-mt-6 gap-px bg-[color:var(--line)] sm:grid-cols-2 lg:grid-cols-3">
        {points.map((point) => (
          <li key={point.id} className="bg-white p-4">
            <button
              type="button"
              onClick={() => {
                setSelectedId(point.id);
                mapRef.current?.setView([point.latitude, point.longitude], 11, { animate: false });
              }}
              className="text-left font-semibold text-[color:var(--navy)] hover:text-[color:var(--forest)]"
            >
              {point.title}
            </button>
            <p className="mt-1 text-sm font-medium text-slate-700">{point.dateTimeLabel}</p>
            <p className="mt-1 text-xs text-slate-500">{point.city} · approximate location</p>
            <a href={`/events/${point.id}`} className="mt-2 inline-block text-xs font-semibold text-[color:var(--forest)] hover:underline">
              Event details →
            </a>
          </li>
        ))}
      </ul>
      <p className="bg-white px-6 py-3 text-xs text-slate-500">
        Map data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
      </p>
    </section>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}
