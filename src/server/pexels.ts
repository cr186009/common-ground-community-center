/**
 * High-level Pexels helpers used by hub-actions.ts.
 * Low-level API client lives in src/server/images/pexels.ts.
 */

import { prisma } from "@/lib/prisma";
import {
  buildPexelsSearchQuery,
  searchPexelsImage,
} from "@/server/images/pexels";

/**
 * Assign a Pexels fallback image to a single event.
 *
 * @param eventId  - Prisma Event.id
 * @param options.force - When true, replaces an existing fallback image.
 *                        When false (default), skips events that already have
 *                        any imageUrl set.
 */
export async function assignFallbackImageToEvent(
  eventId: string,
  options?: { force?: boolean },
): Promise<{ success: boolean; reason?: string }> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    return { success: false, reason: "Event not found" };
  }

  // Skip if already has an image and we're not forcing a replacement
  if (event.imageUrl && !options?.force) {
    return { success: false, reason: "Event already has an image" };
  }

  const query = buildPexelsSearchQuery({
    title: event.title,
    category: event.category ?? null,
    description: event.description ?? null,
  });

  const result = await searchPexelsImage(query);

  if (!result) {
    return { success: false, reason: "No Pexels image found for query" };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      imageUrl: result.imageUrl,
      imageSource: result.imageSource,
      imageCredit: result.imageCredit,
      imageCreditUrl: result.imageCreditUrl,
      imageAlt: result.imageAlt,
      imageIsFallback: true,
    },
  });

  return { success: true };
}

/**
 * Bulk-assign Pexels fallback images to events that have no imageUrl.
 *
 * @param options.limit - Maximum number of events to process (default 25).
 * @returns Counts of assigned, skipped, and failed events.
 */
export async function assignFallbackImagesToMissingEvents(options?: {
  limit?: number;
}): Promise<{ assigned: number; skipped: number; failed: number }> {
  const limit = options?.limit ?? 25;

  const events = await prisma.event.findMany({
    where: { imageUrl: null },
    orderBy: { startDateTime: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
    },
  });

  let assigned = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events) {
    const query = buildPexelsSearchQuery({
      title: event.title,
      category: event.category ?? null,
      description: event.description ?? null,
    });

    const result = await searchPexelsImage(query);

    if (!result) {
      failed++;
      continue;
    }

    try {
      await prisma.event.update({
        where: { id: event.id },
        data: {
          imageUrl: result.imageUrl,
          imageSource: result.imageSource,
          imageCredit: result.imageCredit,
          imageCreditUrl: result.imageCreditUrl,
          imageAlt: result.imageAlt,
          imageIsFallback: true,
        },
      });
      assigned++;
    } catch {
      failed++;
    }
  }

  return { assigned, skipped, failed };
}
