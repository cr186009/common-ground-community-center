import { prisma } from "../src/lib/prisma";
import {
  buildPexelsSearchQuery,
  searchPexelsImage,
} from "../src/server/images/pexels";

function getLimit(): number {
  const limitIndex = process.argv.indexOf("--limit");

  if (limitIndex === -1) {
    return 20;
  }

  const requestedLimit = Number(process.argv[limitIndex + 1]);

  if (!Number.isInteger(requestedLimit) || requestedLimit <= 0) {
    throw new Error("--limit must be a positive whole number.");
  }

  return Math.min(requestedLimit, 100);
}

function getDelayMs(): number {
  const delayIndex = process.argv.indexOf("--delay");

  if (delayIndex === -1) {
    return 350;
  }

  const requestedDelay = Number(process.argv[delayIndex + 1]);

  if (!Number.isFinite(requestedDelay) || requestedDelay < 0) {
    throw new Error("--delay must be zero or a positive number.");
  }

  return requestedDelay;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const limit = getLimit();
  const delayMs = getDelayMs();

  if (!process.env.PEXELS_API_KEY) {
    throw new Error(
      "PEXELS_API_KEY is missing. Add it to Replit Secrets before running this script.",
    );
  }

  const events = await prisma.event.findMany({
    where: {
      imageUrl: null,
      status: "APPROVED",
    },
    orderBy: {
      startDateTime: "asc",
    },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      startDateTime: true,
    },
  });

  console.log(`Found ${events.length} approved events without images.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, event] of events.entries()) {
    const query = buildPexelsSearchQuery({
      title: event.title,
      category: event.category,
      description: event.description,
    });

    console.log(
      `[${index + 1}/${events.length}] ${event.title} → "${query}"`,
    );

    try {
      const image = await searchPexelsImage(query);

      if (!image) {
        console.warn(`No image assigned to: ${event.title}`);
        skipped += 1;
        continue;
      }

      await prisma.event.update({
        where: {
          id: event.id,
        },
        data: {
          imageUrl: image.imageUrl,
          imageSource: image.imageSource,
          imageCredit: image.imageCredit,
          imageCreditUrl: image.imageCreditUrl,
          imageAlt: image.imageAlt,
          imageIsFallback: image.imageIsFallback,
        },
      });

      console.log(
        `Saved image for "${event.title}" — photo by ${image.imageCredit}`,
      );

      updated += 1;
    } catch (error) {
      console.error(`Failed to update "${event.title}":`, error);
      failed += 1;
    }

    if (delayMs > 0 && index < events.length - 1) {
      await wait(delayMs);
    }
  }

  console.log("\nPexels backfill complete:");
  console.log({
    reviewed: events.length,
    updated,
    skipped,
    failed,
  });
}

main()
  .catch((error) => {
    console.error("Pexels backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });