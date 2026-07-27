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
 * @param eventId - Prisma Event.id
 * @param options.force - When true, replaces the existing event image.
 *                        When false, skips an event that already has an image.
 */
export async function assignFallbackImageToEvent(
  eventId: string,
  options?: { force?: boolean },
): Promise<{ success: boolean; reason?: string }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      success: false,
      reason: "Event not found",
    };
  }

  if (event.imageUrl && !options?.force) {
    return {
      success: false,
      reason: "Event already has an image",
    };
  }

  const query = buildPexelsSearchQuery({
    title: event.title,
    category: event.category ?? null,
    description: event.description ?? null,
  });

  /*
   * Initial assignment uses the event ID as the selection seed.
   * This prevents every event with the same query from getting the same image.
   *
   * Replacement adds the current time and excludes the current URL.
   * This makes the Replace button return a different image.
   */
  const selectionSeed = options?.force ? `${event.id}:${Date.now()}` : event.id;

  const result = await searchPexelsImage(query, {
    excludeImageUrl: options?.force ? event.imageUrl : null,
    selectionSeed,
  });

  if (!result) {
    return {
      success: false,
      reason: "No Pexels image found for query",
    };
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

  return {
    success: true,
  };
}

/**
 * Bulk-assign Pexels fallback images to events that have no imageUrl.
 */
export async function assignFallbackImagesToMissingEvents(options?: {
  limit?: number;
}): Promise<{
  assigned: number;
  skipped: number;
  failed: number;
}> {
  const limit = options?.limit ?? 25;

  const events = await prisma.event.findMany({
    where: {
      imageUrl: null,
    },
    orderBy: {
      startDateTime: "asc",
    },
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

    /*
     * Use the event ID as the seed so events with the same search query
     * receive different photos from the returned result pool.
     */
    const result = await searchPexelsImage(query, {
      selectionSeed: event.id,
    });

    if (!result) {
      failed++;
      continue;
    }

    try {
      const updateResult = await prisma.event.updateMany({
        where: {
          id: event.id,
          imageUrl: null,
        },
        data: {
          imageUrl: result.imageUrl,
          imageSource: result.imageSource,
          imageCredit: result.imageCredit,
          imageCreditUrl: result.imageCreditUrl,
          imageAlt: result.imageAlt,
          imageIsFallback: true,
        },
      });

      if (updateResult.count === 0) {
        skipped++;
      } else {
        assigned++;
      }
    } catch (error) {
      console.error(
        `Failed to assign Pexels image to event ${event.id}:`,
        error,
      );
      failed++;
    }
  }

  return {
    assigned,
    skipped,
    failed,
  };
}
