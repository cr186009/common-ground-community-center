type PexelsPhoto = {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string | null;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    landscape: string;
  };
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
};

export type PexelsImageResult = {
  imageUrl: string;
  imageSource: "pexels";
  imageCredit: string;
  imageCreditUrl: string;
  imageAlt: string;
  imageIsFallback: true;
};

const TITLE_SEARCH_RULES: Array<{
  keywords: string[];
  query: string;
}> = [
  {
    keywords: ["board of commissioners", "commissioners work session"],
    query: "local government council meeting",
  },
  {
    keywords: ["planning commission", "zoning board", "zoning commission"],
    query: "city planning architecture meeting",
  },
  {
    keywords: ["board of elections", "early voting", "absentee ballot", "election"],
    query: "voting election polling place",
  },
  {
    keywords: ["mayor", "board of aldermen", "city council"],
    query: "city council government meeting",
  },
  {
    keywords: ["library", "storytime"],
    query: "children reading books library",
  },
  {
    keywords: ["farmers market", "farmer's market"],
    query: "outdoor farmers market fresh produce",
  },
  {
    keywords: ["food truck"],
    query: "food truck festival outdoors",
  },
  {
    keywords: ["car show", "classic cars", "horsepower"],
    query: "classic car show outdoors",
  },
  {
    keywords: ["concert", "live music", "tribute show", "night of worship"],
    query: "outdoor live music concert crowd",
  },
  {
    keywords: ["art walk", "art festival", "arts festival"],
    query: "outdoor community art festival",
  },
  {
    keywords: ["movie night", "outdoor movie"],
    query: "outdoor movie night family",
  },
  {
    keywords: ["block party", "street fest", "street festival"],
    query: "community street festival crowd",
  },
  {
    keywords: ["night market"],
    query: "outdoor night market vendors",
  },
  {
    keywords: ["volunteer", "cleanup", "workday"],
    query: "community volunteers working together",
  },
  {
    keywords: ["back to school", "school bash"],
    query: "back to school community event",
  },
  {
    keywords: ["christmas", "holiday"],
    query: "community christmas celebration",
  },
  {
    keywords: ["halloween", "spooky", "boo bash"],
    query: "family halloween festival outdoors",
  },
  {
    keywords: ["dogs day", "dog event", "pet event"],
    query: "dogs outdoor community event",
  },
  {
    keywords: ["puppet", "circus"],
    query: "children puppet show theater",
  },
  {
    keywords: ["trivia"],
    query: "friends playing trivia restaurant",
  },
  {
    keywords: ["closed", "closure", "office closed"],
    query: "government office building exterior",
  },
  {
    keywords: ["park", "recreation"],
    query: "community park families outdoors",
  },
];

const CATEGORY_SEARCH_RULES: Record<string, string> = {
  government: "local government community meeting",
  meeting: "community meeting conference room",
  election: "voting election polling place",
  library: "public library books community",
  family: "family community outdoor event",
  children: "children community activity",
  education: "students education community",
  food: "food festival outdoors",
  market: "outdoor farmers market",
  concert: "outdoor live music concert",
  music: "live music outdoor festival",
  art: "community art festival",
  festival: "community outdoor festival",
  volunteer: "community volunteers working together",
  sports: "community outdoor sports",
  automotive: "classic car show outdoors",
  holiday: "community holiday celebration",
  pets: "dogs outdoor community event",
  outdoors: "community park families outdoors",
};

function normalizeText(value: string | null | undefined): string {
  return (
    value
      ?.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  );
}
export function buildPexelsSearchQuery(input: {
  title: string;
  category?: string | null;
  description?: string | null;
}): string {
  const title = normalizeText(input.title);
  const category = normalizeText(input.category);
  const description = normalizeText(input.description);

  // Title is the strongest signal.
  for (const rule of TITLE_SEARCH_RULES) {
    if (rule.keywords.some((keyword) => title.includes(keyword))) {
      return rule.query;
    }
  }

  // Category is the second-best signal.
  for (const [keyword, query] of Object.entries(CATEGORY_SEARCH_RULES)) {
    if (category.includes(keyword)) {
      return query;
    }
  }

  // Use the description only as a fallback.
  for (const rule of TITLE_SEARCH_RULES) {
    if (rule.keywords.some((keyword) => description.includes(keyword))) {
      return rule.query;
    }
  }

  return "community event people outdoors";
}

export async function searchPexelsImage(
  query: string,
): Promise<PexelsImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn("PEXELS_API_KEY is not configured.");
    return null;
  }

  const params = new URLSearchParams({
    query,
    orientation: "landscape",
    size: "medium",
    locale: "en-US",
    per_page: "8",
  });

  const response = await fetch(
    `https://api.pexels.com/v1/search?${params.toString()}`,
    {
      headers: {
        Authorization: apiKey,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const responseText = await response.text();

    console.error("Pexels request failed:", {
      status: response.status,
      statusText: response.statusText,
      response: responseText.slice(0, 500),
    });

    return null;
  }

  const data = (await response.json()) as PexelsSearchResponse;

  if (!data.photos?.length) {
    console.warn(`No Pexels photos found for query: ${query}`);
    return null;
  }

  /*
   * Pick from the first few results instead of always choosing result #1.
   * This reduces the chance that every similar event uses the same photo.
   */
  const selectionPool = data.photos.slice(0, Math.min(8, data.photos.length));

  const selectedIndex =
    Math.abs(
      Array.from(query).reduce(
        (hash, character) => (hash * 31 + character.charCodeAt(0)) | 0,
        0,
      ),
    ) % selectionPool.length;

  const selectedPhoto = selectionPool[selectedIndex];

  return {
    imageUrl:
      selectedPhoto.src.landscape ??
      selectedPhoto.src.large ??
      selectedPhoto.src.large2x,
    imageSource: "pexels",
    imageCredit: selectedPhoto.photographer,
    imageCreditUrl: selectedPhoto.url,
    imageAlt:
      selectedPhoto.alt?.trim() ||
      `Community event photo by ${selectedPhoto.photographer}`,
    imageIsFallback: true,
  };
}