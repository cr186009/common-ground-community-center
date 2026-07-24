/**
 * Pexels photo API service — server-side only.
 * Never import this in client code.
 */

const PEXELS_API_BASE = "https://api.pexels.com/v1";

const CATEGORY_QUERIES: Record<string, string> = {
  FAMILY: "community family festival",
  MUSIC: "outdoor live music community",
  FOOD_DRINK: "community food festival",
  FESTIVAL: "community street festival",
  PARKS_RECREATION: "community park outdoor recreation",
  SPORTS: "community sports event",
  LIBRARY: "community library books",
  SCHOOL: "school community event",
  VOLUNTEER: "community volunteers",
  GOVERNMENT_MEETING: "community town hall meeting",
  TRIVIA: "friends trivia night",
  KARAOKE: "community karaoke music",
  OTHER: "local community gathering",
};

export type PexelsPhoto = {
  id: number;
  photographer: string;
  url: string;
  alt: string;
  src: {
    landscape: string;
    large: string;
  };
};

type PexelsSearchResponse = {
  photos?: PexelsPhoto[];
  total_results?: number;
  error?: string;
};

export async function searchPexelsPhotos(
  query: string,
  options: { perPage?: number } = {},
): Promise<PexelsPhoto[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL(`${PEXELS_API_BASE}/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", String(options.perPage ?? 15));

    const response = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      cache: "no-store",
    });

    if (response.status === 429) {
      console.warn("[Pexels] Rate limit reached");
      return [];
    }

    if (!response.ok) {
      console.error(`[Pexels] API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as PexelsSearchResponse;

    if (data.error) {
      console.error(`[Pexels] API returned error: ${data.error}`);
      return [];
    }

    return data.photos ?? [];
  } catch (error) {
    console.error("[Pexels] Fetch failed:", error);
    return [];
  }
}

export async function findFallbackImageForEvent(event: {
  category: string;
  title: string;
}): Promise<PexelsPhoto | null> {
  if (!process.env.PEXELS_API_KEY) return null;

  const query = CATEGORY_QUERIES[event.category] ?? CATEGORY_QUERIES.OTHER;
  const photos = await searchPexelsPhotos(query, { perPage: 15 });

  if (photos.length === 0) return null;

  // Choose randomly from results; caller persists the selected photo so it
  // doesn't change on every page load.
  return photos[Math.floor(Math.random() * photos.length)];
}

export async function assignFallbackImageToEvent(
  eventId: string,
  options: { force?: boolean } = {},
): Promise<{ success: boolean; message: string }> {
  if (!process.env.PEXELS_API_KEY) {
    return { success: false, message: "PEXELS_API_KEY is not configured" };
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        category: true,
        imageUrl: true,
        imageIsFallback: true,
      },
    });

    if (!event) return { success: false, message: "Event not found" };

    // Never overwrite a real (non-fallback) image unless forced
    if (event.imageUrl && !event.imageIsFallback && !options.force) {
      return { success: false, message: "Event already has a real image" };
    }

    const photo = await findFallbackImageForEvent(event);
    if (!photo) return { success: false, message: "No Pexels photos returned" };

    await prisma.event.update({
      where: { id: eventId },
      data: {
        imageUrl: photo.src.landscape || photo.src.large,
        imageSource: "Pexels",
        imageCredit: photo.photographer,
        imageCreditUrl: photo.url,
        imageAlt: photo.alt || event.title,
        imageIsFallback: true,
      },
    });

    return { success: true, message: `Image assigned (${photo.photographer})` };
  } catch (error) {
    console.error("[Pexels] assignFallbackImageToEvent failed:", error);
    return { success: false, message: "Internal error assigning image" };
  }
}

export async function assignFallbackImagesToMissingEvents(
  options: { limit?: number } = {},
): Promise<{ assigned: number; skipped: number; failed: number }> {
  if (!process.env.PEXELS_API_KEY) {
    return { assigned: 0, skipped: 0, failed: 0 };
  }

  const limit = Math.min(options.limit ?? 25, 25);
  let assigned = 0,
    skipped = 0,
    failed = 0;

  try {
    const { prisma } = await import("@/lib/prisma");

    const events = await prisma.event.findMany({
      where: {
        status: "APPROVED",
        imageUrl: null,
        startDateTime: { gte: new Date() },
      },
      select: {
        id: true,
        title: true,
        category: true,
        imageUrl: true,
        imageIsFallback: true,
      },
      take: limit,
      orderBy: { startDateTime: "asc" },
    });

    for (const event of events) {
      if (event.imageUrl && !event.imageIsFallback) {
        skipped++;
        continue;
      }

      const result = await assignFallbackImageToEvent(event.id);
      if (result.success) {
        assigned++;
      } else {
        failed++;
      }

      // Brief delay to be polite to the Pexels API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error("[Pexels] Bulk assign failed:", error);
  }

  return { assigned, skipped, failed };
}
