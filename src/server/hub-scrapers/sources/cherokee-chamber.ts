import * as cheerio from "cheerio";
import { cleanPublicText, cleanText, dedupeNormalizedEvents, inferCategory, toAbsoluteUrl } from "@/server/hub-scrapers/helpers";
import type { NormalizedScrapedEvent, SourceScraper } from "@/server/hub-scrapers/types";

const BASE = "https://widgets.cherokeechamber.com";
const TIME_ZONE = "America/New_York";
type JsonLdEvent = { "@type"?: string; name?: string; description?: string; startDate?: string; endDate?: string; eventStatus?: string; location?: { name?: string; address?: { streetAddress?: string; addressLocality?: string; addressRegion?: string; postalCode?: string } } };

export function discoverCherokeeChamberDetails(html: string) {
  const $ = cheerio.load(html);
  return Array.from(new Set($("a[href*='event.aspx'][href*='id=']").toArray().map((a) => toAbsoluteUrl(BASE, $(a).attr("href"))).filter((x): x is string => Boolean(x))));
}

export function parseCherokeeChamberDetail(html: string, source: { name: string; url: string }, originalUrl: string, now = new Date()) {
  const $ = cheerio.load(html);
  let data: JsonLdEvent | null = null;
  for (const node of $("script[type='application/ld+json']").toArray()) {
    try { const value = JSON.parse($(node).text()) as JsonLdEvent; if (value["@type"] === "Event") { data = value; break; } } catch { /* unrelated invalid block */ }
  }
  const address = data?.location?.address;
  if (!data?.name || !data.startDate || cleanText(address?.addressLocality).toLowerCase() !== "canton") return null;
  if (/cancel/i.test(data.eventStatus ?? "") || /\bcancell?ed\b/i.test(data.name)) return null;
  const startDateTime = new Date(data.startDate);
  const endDateTime = data.endDate ? new Date(data.endDate) : null;
  if (Number.isNaN(startDateTime.getTime()) || (endDateTime && Number.isNaN(endDateTime.getTime()))) return null;
  if ((endDateTime ?? startDateTime) < now) return null;
  const title = cleanPublicText(data.name);
  const description = cleanPublicText(data.description) || null;
  const fullAddress = [cleanText(address?.streetAddress), [cleanText(address?.addressLocality), cleanText(address?.addressRegion), cleanText(address?.postalCode)].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;
  const combined = [title, description, data.location?.name, fullAddress].filter(Boolean).join(" ");
  return { title, description, startDateTime, endDateTime, locationName: cleanText(data.location?.name) || "Cherokee County Chamber", address: fullAddress, city: "Canton", county: "Cherokee", category: inferCategory(combined), tags: ["Cherokee County Chamber", "official chamber calendar"], cost: null, isFree: /\bfree\b/i.test(combined), isKidFriendly: false, isOutdoor: /\b(outdoor|park|golf|festival)\b/i.test(combined), sourceName: source.name, sourceUrl: source.url, originalUrl, confidenceScore: 0.96, isAllDay: false, timeZone: TIME_ZONE, dateEvidence: { listingDate: data.startDate.slice(0, 10), structuredDate: startDateTime.toISOString(), sourcePublishedText: `Official start: ${data.startDate}${data.endDate ? `; Official end: ${data.endDate}` : ""}` } } satisfies NormalizedScrapedEvent;
}

async function fetchHtml(url: string) { const r = await fetch(url, { headers: { accept: "text/html", "user-agent": "Common Ground Community Center event importer" }, cache: "no-store" }); if (!r.ok) throw new Error(`Cherokee Chamber request failed: ${r.status} ${r.statusText}`); return r.text(); }
export const cherokeeChamberScraper: SourceScraper = { sourceName: "Cherokee County Chamber events", async scrape(source) { const urls = discoverCherokeeChamberDetails(await fetchHtml(source.url)); const results = await Promise.allSettled(urls.map(async (url) => parseCherokeeChamberDetail(await fetchHtml(url), source, url))); const events = dedupeNormalizedEvents(results.flatMap((r) => r.status === "fulfilled" && r.value ? [r.value] : [])); const failures = results.filter((r) => r.status === "rejected").length; return { events, status: events.length && !failures ? "SUCCESS" : "PARTIAL", message: events.length ? `Parsed ${events.length} Canton events from the Cherokee Chamber calendar${failures ? `; ${failures} detail pages failed` : ""}.` : "The Cherokee Chamber calendar loaded but returned no upcoming events with a verified Canton address." }; } };
