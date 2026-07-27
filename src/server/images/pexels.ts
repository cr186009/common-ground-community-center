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

type SearchPexelsImageOptions = {
  /**
   * Prevent the current image from being selected again.
   * Used by the Replace action.
   */
  excludeImageUrl?: string | null;

  /**
   * Changes which result is selected from the result pool.
   * Event IDs make first-time assignments different across events.
   * A timestamp can be included during replacement.
   */
  selectionSeed?: string | null;
};

const TITLE_SEARCH_RULES: Array<{
  keywords: string[];
  query: string;
}> = [
  // -----------------------------------------------------------------------
  // Local government and civic meetings
  // -----------------------------------------------------------------------
  {
    keywords: [
      "board of commissioners",
      "commissioners meeting",
      "commissioners work session",
      "county commission",
    ],
    query: "local government council meeting",
  },
  {
    keywords: [
      "city council",
      "council meeting",
      "council work session",
      "council retreat",
    ],
    query: "city council government meeting",
  },
  {
    keywords: [
      "board of aldermen",
      "aldermen meeting",
      "mayor and council",
      "mayor's meeting",
    ],
    query: "city government officials meeting",
  },
  {
    keywords: [
      "planning commission",
      "planning and zoning",
      "zoning board",
      "zoning commission",
      "zoning hearing",
    ],
    query: "city planning architecture meeting",
  },
  {
    keywords: [
      "development authority",
      "downtown development authority",
      "dda meeting",
      "redevelopment authority",
    ],
    query: "downtown development business meeting",
  },
  {
    keywords: [
      "historic preservation",
      "historic board",
      "historic preservation commission",
    ],
    query: "historic architecture preservation meeting",
  },
  {
    keywords: ["parks board", "recreation board", "parks and recreation board"],
    query: "parks recreation planning meeting",
  },
  {
    keywords: ["school board", "board of education", "education board meeting"],
    query: "school board education meeting",
  },
  {
    keywords: [
      "public hearing",
      "community hearing",
      "town hall meeting",
      "town hall",
    ],
    query: "public community town hall meeting",
  },
  {
    keywords: [
      "budget hearing",
      "budget meeting",
      "budget workshop",
      "millage rate",
    ],
    query: "government budget planning meeting",
  },
  {
    keywords: [
      "water authority",
      "water board",
      "sewer authority",
      "utility board",
    ],
    query: "public utilities infrastructure meeting",
  },
  {
    keywords: ["airport authority", "airport board", "aviation authority"],
    query: "regional airport aviation meeting",
  },
  {
    keywords: ["ethics board", "ethics commission", "personnel board"],
    query: "professional government board meeting",
  },
  {
    keywords: [
      "code enforcement",
      "code hearing",
      "municipal court",
      "court session",
    ],
    query: "municipal government courthouse",
  },
  {
    keywords: [
      "board of elections",
      "early voting",
      "advance voting",
      "absentee ballot",
      "poll worker",
      "election",
      "voter registration",
    ],
    query: "voting election polling place",
  },
  {
    keywords: [
      "office closed",
      "city hall closed",
      "county offices closed",
      "government offices closed",
      "holiday closure",
      "administrative closure",
    ],
    query: "government office building exterior",
  },

  // -----------------------------------------------------------------------
  // Libraries, reading, education, and workshops
  // -----------------------------------------------------------------------
  {
    keywords: [
      "baby storytime",
      "toddler storytime",
      "preschool storytime",
      "family storytime",
      "story time",
      "storytime",
    ],
    query: "children reading picture books library",
  },
  {
    keywords: ["library", "public library", "bookmobile", "library program"],
    query: "public library books community",
  },
  {
    keywords: [
      "book club",
      "book discussion",
      "reading group",
      "literary club",
    ],
    query: "adults discussing books book club",
  },
  {
    keywords: [
      "author talk",
      "author visit",
      "author signing",
      "book signing",
      "meet the author",
    ],
    query: "author speaking bookstore audience",
  },
  {
    keywords: [
      "creative writing",
      "writing workshop",
      "poetry workshop",
      "poetry reading",
      "open mic poetry",
    ],
    query: "creative writing poetry workshop",
  },
  {
    keywords: [
      "computer class",
      "technology class",
      "digital literacy",
      "computer basics",
      "internet basics",
    ],
    query: "adult computer technology class",
  },
  {
    keywords: [
      "coding class",
      "coding workshop",
      "robotics",
      "stem class",
      "stem workshop",
    ],
    query: "children robotics coding STEM class",
  },
  {
    keywords: ["homework help", "tutoring", "study hall", "academic support"],
    query: "students homework tutoring library",
  },
  {
    keywords: ["homeschool", "home school", "homeschoolers"],
    query: "homeschool students learning together",
  },
  {
    keywords: ["college fair", "career fair", "education fair", "school fair"],
    query: "students college career fair",
  },
  {
    keywords: ["graduation", "commencement", "graduate ceremony"],
    query: "graduation ceremony students",
  },
  {
    keywords: [
      "back to school",
      "school bash",
      "school supply",
      "school supplies",
    ],
    query: "back to school community event",
  },
  {
    keywords: [
      "financial literacy",
      "money management",
      "budgeting class",
      "credit workshop",
      "homebuyer workshop",
    ],
    query: "financial education workshop adults",
  },
  {
    keywords: ["genealogy", "family history", "ancestry workshop"],
    query: "genealogy family history research",
  },
  {
    keywords: [
      "history lecture",
      "historical lecture",
      "local history",
      "history program",
      "museum lecture",
    ],
    query: "local history museum presentation",
  },

  // -----------------------------------------------------------------------
  // Children, teens, families, and seniors
  // -----------------------------------------------------------------------
  {
    keywords: [
      "kids craft",
      "children's craft",
      "childrens craft",
      "craft for kids",
      "family craft",
    ],
    query: "children making arts and crafts",
  },
  {
    keywords: [
      "teen program",
      "teen night",
      "teen club",
      "youth night",
      "youth program",
    ],
    query: "teenagers community activity",
  },
  {
    keywords: ["lego club", "lego build", "building blocks"],
    query: "children building colorful blocks",
  },
  {
    keywords: [
      "puppet show",
      "puppets",
      "children's theater",
      "childrens theater",
      "kids theater",
    ],
    query: "children puppet show theater",
  },
  {
    keywords: ["magic show", "magician", "family magic"],
    query: "family magic show children",
  },
  {
    keywords: ["circus", "acrobat", "juggler", "juggling show"],
    query: "family circus performance",
  },
  {
    keywords: [
      "sensory play",
      "sensory friendly",
      "sensory hour",
      "sensory activity",
    ],
    query: "children sensory learning activity",
  },
  {
    keywords: [
      "mommy and me",
      "parent and child",
      "caregiver and child",
      "baby play",
    ],
    query: "parent and young child activity",
  },
  {
    keywords: [
      "senior social",
      "senior luncheon",
      "senior activity",
      "older adults",
      "active adults",
    ],
    query: "senior adults community social",
  },
  {
    keywords: ["bingo", "senior bingo", "family bingo"],
    query: "community bingo game",
  },
  {
    keywords: ["game night", "board games", "family game", "tabletop games"],
    query: "friends playing board games",
  },
  {
    keywords: ["trivia", "trivia night", "quiz night"],
    query: "friends playing trivia restaurant",
  },

  // -----------------------------------------------------------------------
  // Arts, crafts, museums, and creative events
  // -----------------------------------------------------------------------
  {
    keywords: ["art walk", "art festival", "arts festival", "arts celebration"],
    query: "outdoor community art festival",
  },
  {
    keywords: [
      "art exhibit",
      "art exhibition",
      "gallery opening",
      "artist reception",
      "art reception",
    ],
    query: "community art gallery exhibition",
  },
  {
    keywords: [
      "painting class",
      "paint night",
      "paint and sip",
      "watercolor",
      "canvas painting",
    ],
    query: "adults painting art class",
  },
  {
    keywords: ["pottery", "ceramics", "clay class", "ceramic workshop"],
    query: "pottery ceramics art workshop",
  },
  {
    keywords: [
      "quilting",
      "quilt guild",
      "sewing class",
      "sewing workshop",
      "knitting",
      "crochet",
    ],
    query: "community sewing quilting workshop",
  },
  {
    keywords: [
      "craft fair",
      "craft market",
      "handmade market",
      "artisan market",
    ],
    query: "outdoor handmade artisan craft market",
  },
  {
    keywords: ["photography class", "photo walk", "photography workshop"],
    query: "community photography workshop",
  },
  {
    keywords: [
      "dance class",
      "dance workshop",
      "line dancing",
      "ballroom dancing",
      "salsa dancing",
    ],
    query: "community dance class",
  },
  {
    keywords: [
      "theater performance",
      "theatre performance",
      "stage play",
      "community theater",
      "community theatre",
      "musical theater",
    ],
    query: "community theater stage performance",
  },
  {
    keywords: ["museum", "museum day", "museum tour", "historic house tour"],
    query: "local history museum exhibit",
  },

  // -----------------------------------------------------------------------
  // Music, concerts, movies, and entertainment
  // -----------------------------------------------------------------------
  {
    keywords: [
      "concert",
      "live music",
      "tribute show",
      "music festival",
      "summer concert",
      "concert series",
    ],
    query: "outdoor live music concert crowd",
  },
  {
    keywords: ["jazz", "jazz concert", "jazz festival"],
    query: "live jazz music concert",
  },
  {
    keywords: ["orchestra", "symphony", "classical music", "chamber music"],
    query: "orchestra classical music concert",
  },
  {
    keywords: ["choir", "chorus", "choral concert", "community choir"],
    query: "community choir singing concert",
  },
  {
    keywords: ["open mic", "music showcase", "talent show"],
    query: "local performers open mic stage",
  },
  {
    keywords: [
      "night of worship",
      "worship concert",
      "gospel concert",
      "praise concert",
    ],
    query: "gospel worship music concert",
  },
  {
    keywords: [
      "movie night",
      "outdoor movie",
      "movies in the park",
      "film screening",
      "family movie",
    ],
    query: "outdoor movie night family",
  },
  {
    keywords: ["comedy show", "stand up comedy", "comedian"],
    query: "live comedy show audience",
  },

  // -----------------------------------------------------------------------
  // Festivals, parades, markets, and community celebrations
  // -----------------------------------------------------------------------
  {
    keywords: [
      "block party",
      "street fest",
      "street festival",
      "community celebration",
    ],
    query: "community street festival crowd",
  },
  {
    keywords: [
      "festival",
      "community festival",
      "annual festival",
      "family festival",
    ],
    query: "community outdoor festival families",
  },
  {
    keywords: ["parade", "community parade", "holiday parade"],
    query: "community parade families outdoors",
  },
  {
    keywords: ["fireworks", "fireworks show", "fireworks celebration"],
    query: "community fireworks celebration night",
  },
  {
    keywords: [
      "farmers market",
      "farmer's market",
      "farm market",
      "produce market",
    ],
    query: "outdoor farmers market fresh produce",
  },
  {
    keywords: ["night market", "evening market", "moonlight market"],
    query: "outdoor night market vendors",
  },
  {
    keywords: ["food truck", "food trucks", "food truck friday"],
    query: "food truck festival outdoors",
  },
  {
    keywords: [
      "taste of",
      "food festival",
      "culinary festival",
      "restaurant week",
    ],
    query: "outdoor community food festival",
  },
  {
    keywords: [
      "vendor fair",
      "vendor market",
      "community market",
      "local vendors",
    ],
    query: "outdoor local vendor market",
  },
  {
    keywords: ["yard sale", "garage sale", "community sale", "rummage sale"],
    query: "community yard sale outdoors",
  },

  // -----------------------------------------------------------------------
  // Food, cooking, gardening, and agriculture
  // -----------------------------------------------------------------------
  {
    keywords: [
      "cooking class",
      "cooking demonstration",
      "chef demonstration",
      "culinary class",
    ],
    query: "community cooking class kitchen",
  },
  {
    keywords: ["baking class", "cake decorating", "cookie decorating"],
    query: "community baking class kitchen",
  },
  {
    keywords: ["coffee", "coffee tasting", "coffee meetup", "coffee with"],
    query: "community coffee gathering cafe",
  },
  {
    keywords: [
      "garden club",
      "gardening class",
      "gardening workshop",
      "community garden",
    ],
    query: "community gardening workshop plants",
  },
  {
    keywords: [
      "plant sale",
      "native plant sale",
      "flower sale",
      "seedling sale",
    ],
    query: "outdoor plant sale garden",
  },
  {
    keywords: ["seed swap", "plant swap", "garden exchange"],
    query: "gardeners exchanging plants seeds",
  },
  {
    keywords: ["agriculture", "farm day", "farm tour", "farming workshop"],
    query: "community agriculture farm event",
  },

  // -----------------------------------------------------------------------
  // Parks, nature, outdoors, and environmental programs
  // -----------------------------------------------------------------------
  {
    keywords: [
      "nature walk",
      "guided hike",
      "hiking",
      "trail walk",
      "walking trail",
    ],
    query: "families hiking nature trail",
  },
  {
    keywords: ["bird watching", "birding", "bird walk", "birds of prey"],
    query: "bird watching nature park",
  },
  {
    keywords: ["fishing", "fishing clinic", "fishing derby", "kids fishing"],
    query: "family fishing lake outdoors",
  },
  {
    keywords: ["kayak", "kayaking", "canoe", "canoeing", "paddle"],
    query: "community kayaking lake outdoors",
  },
  {
    keywords: ["camping", "campfire", "family campout", "overnight camp"],
    query: "family camping outdoors campfire",
  },
  {
    keywords: [
      "nature program",
      "environmental education",
      "wildlife program",
      "animal program",
    ],
    query: "children nature wildlife education",
  },
  {
    keywords: ["tree planting", "plant a tree", "arbor day"],
    query: "community volunteers planting trees",
  },
  {
    keywords: [
      "cleanup",
      "clean up",
      "litter pickup",
      "river cleanup",
      "park cleanup",
    ],
    query: "community volunteers cleaning park",
  },
  {
    keywords: [
      "earth day",
      "environmental festival",
      "sustainability fair",
      "recycling event",
    ],
    query: "community earth day environmental festival",
  },
  {
    keywords: ["park", "parks and recreation", "recreation", "playground"],
    query: "community park families outdoors",
  },

  // -----------------------------------------------------------------------
  // Sports, races, fitness, and recreation
  // -----------------------------------------------------------------------
  {
    keywords: ["5k", "10k", "fun run", "road race", "marathon", "run walk"],
    query: "community runners road race",
  },
  {
    keywords: [
      "walking club",
      "community walk",
      "fitness walk",
      "walking group",
    ],
    query: "community walking group outdoors",
  },
  {
    keywords: ["yoga", "yoga in the park", "chair yoga"],
    query: "community outdoor yoga class",
  },
  {
    keywords: ["fitness class", "exercise class", "boot camp", "group fitness"],
    query: "community outdoor fitness class",
  },
  {
    keywords: ["zumba", "dance fitness", "cardio dance"],
    query: "community zumba dance fitness",
  },
  {
    keywords: ["pickleball", "pickle ball", "pickleball tournament"],
    query: "community pickleball game outdoors",
  },
  {
    keywords: ["tennis", "tennis clinic", "tennis tournament"],
    query: "community tennis match outdoors",
  },
  {
    keywords: ["basketball", "basketball tournament", "basketball clinic"],
    query: "community basketball game gym",
  },
  {
    keywords: [
      "baseball",
      "baseball game",
      "baseball tournament",
      "little league",
    ],
    query: "community youth baseball game",
  },
  {
    keywords: ["softball", "softball game", "softball tournament"],
    query: "community softball game outdoors",
  },
  {
    keywords: ["soccer", "soccer game", "soccer tournament", "soccer clinic"],
    query: "community youth soccer game",
  },
  {
    keywords: ["football", "football camp", "football clinic"],
    query: "community youth football practice",
  },
  {
    keywords: ["volleyball", "volleyball tournament", "sand volleyball"],
    query: "community volleyball game",
  },
  {
    keywords: ["golf tournament", "golf outing", "charity golf"],
    query: "community charity golf tournament",
  },
  {
    keywords: ["swim", "swimming", "pool party", "aquatics"],
    query: "community swimming pool activity",
  },
  {
    keywords: ["skate", "skating", "skateboard", "skate park"],
    query: "youth skate park community",
  },
  {
    keywords: ["martial arts", "karate", "self defense class", "taekwondo"],
    query: "community martial arts class",
  },
  {
    keywords: ["sports camp", "athletic camp", "youth sports"],
    query: "children community sports camp",
  },

  // -----------------------------------------------------------------------
  // Automotive, pets, and specialty events
  // -----------------------------------------------------------------------
  {
    keywords: [
      "car show",
      "classic cars",
      "classic car",
      "horsepower",
      "cruise in",
      "cruise-in",
    ],
    query: "classic car show outdoors",
  },
  {
    keywords: [
      "motorcycle",
      "motorcycle show",
      "bike rally",
      "motorcycle rally",
    ],
    query: "community motorcycle show outdoors",
  },
  {
    keywords: ["touch a truck", "truck day", "public safety vehicles"],
    query: "children community touch a truck",
  },
  {
    keywords: ["pet adoption", "adoption event", "animal adoption"],
    query: "community pet adoption event",
  },
  {
    keywords: [
      "dogs day",
      "dog event",
      "pet event",
      "dog festival",
      "bark in the park",
    ],
    query: "dogs outdoor community event",
  },
  {
    keywords: ["rabies clinic", "pet vaccination", "animal clinic"],
    query: "community veterinary pet clinic",
  },

  // -----------------------------------------------------------------------
  // Volunteer, nonprofit, charity, and public service
  // -----------------------------------------------------------------------
  {
    keywords: [
      "volunteer",
      "volunteer day",
      "service project",
      "community service",
    ],
    query: "community volunteers working together",
  },
  {
    keywords: ["food drive", "canned food drive", "food donation"],
    query: "community food donation volunteers",
  },
  {
    keywords: ["clothing drive", "coat drive", "donation drive"],
    query: "community clothing donation volunteers",
  },
  {
    keywords: ["blood drive", "blood donation"],
    query: "community blood donation drive",
  },
  {
    keywords: [
      "fundraiser",
      "fundraising event",
      "charity event",
      "benefit event",
    ],
    query: "community charity fundraiser",
  },
  {
    keywords: [
      "resource fair",
      "community resources",
      "services fair",
      "nonprofit fair",
    ],
    query: "community resource fair",
  },
  {
    keywords: ["job fair", "hiring fair", "employment fair"],
    query: "community job fair employers",
  },

  // -----------------------------------------------------------------------
  // Business, networking, and professional development
  // -----------------------------------------------------------------------
  {
    keywords: [
      "networking",
      "business networking",
      "professional networking",
      "networking breakfast",
    ],
    query: "professional business networking event",
  },
  {
    keywords: [
      "chamber of commerce",
      "chamber luncheon",
      "chamber breakfast",
      "business luncheon",
    ],
    query: "local business chamber luncheon",
  },
  {
    keywords: ["ribbon cutting", "grand opening", "business opening"],
    query: "local business ribbon cutting ceremony",
  },
  {
    keywords: [
      "small business",
      "entrepreneur",
      "entrepreneurship",
      "startup workshop",
    ],
    query: "small business entrepreneur workshop",
  },
  {
    keywords: [
      "leadership workshop",
      "professional development",
      "leadership seminar",
    ],
    query: "professional leadership workshop",
  },

  // -----------------------------------------------------------------------
  // Health, wellness, and safety
  // -----------------------------------------------------------------------
  {
    keywords: ["health fair", "wellness fair", "community health"],
    query: "community health wellness fair",
  },
  {
    keywords: [
      "mental health",
      "wellness workshop",
      "stress management",
      "mindfulness",
    ],
    query: "community mental wellness workshop",
  },
  {
    keywords: ["first aid", "cpr class", "cpr training", "safety training"],
    query: "community CPR first aid training",
  },
  {
    keywords: ["fire safety", "fire department open house", "fire prevention"],
    query: "community fire department safety event",
  },
  {
    keywords: [
      "police community",
      "coffee with a cop",
      "public safety",
      "police open house",
    ],
    query: "police community public safety event",
  },

  // -----------------------------------------------------------------------
  // Holidays, memorials, and seasonal events
  // -----------------------------------------------------------------------
  {
    keywords: [
      "christmas",
      "holiday festival",
      "holiday celebration",
      "tree lighting",
      "santa",
    ],
    query: "community christmas holiday celebration",
  },
  {
    keywords: [
      "halloween",
      "spooky",
      "boo bash",
      "trunk or treat",
      "trick or treat",
    ],
    query: "family halloween festival outdoors",
  },
  {
    keywords: ["easter", "egg hunt", "easter egg", "spring egg"],
    query: "community easter egg hunt children",
  },
  {
    keywords: [
      "fourth of july",
      "4th of july",
      "independence day",
      "july fourth",
    ],
    query: "community independence day celebration",
  },
  {
    keywords: [
      "memorial day",
      "veterans day",
      "veteran ceremony",
      "veterans ceremony",
      "military appreciation",
    ],
    query: "community veterans memorial ceremony",
  },
  {
    keywords: ["martin luther king", "mlk day", "day of service"],
    query: "community civil rights service event",
  },
  {
    keywords: ["juneteenth", "juneteenth celebration"],
    query: "community juneteenth celebration festival",
  },
  {
    keywords: [
      "black history",
      "black history month",
      "african american history",
    ],
    query: "community black history cultural event",
  },
  {
    keywords: [
      "fall festival",
      "autumn festival",
      "harvest festival",
      "pumpkin festival",
    ],
    query: "community fall harvest festival",
  },
  {
    keywords: ["spring festival", "spring celebration"],
    query: "community spring festival outdoors",
  },
];

const CATEGORY_SEARCH_RULES: Record<string, string> = {
  government: "local government community meeting",
  civic: "local government community meeting",
  meeting: "community meeting conference room",
  election: "voting election polling place",

  library: "public library books community",
  education: "students community education program",
  workshop: "community educational workshop",
  history: "local history museum presentation",

  family: "family community outdoor event",
  children: "children community activity",
  youth: "youth community activity",
  senior: "senior adults community social",

  food: "community food festival outdoors",
  dining: "community food event",
  market: "outdoor farmers market vendors",
  shopping: "outdoor local vendor market",

  concert: "outdoor live music concert",
  music: "live music outdoor festival",
  art: "community art festival",
  theater: "community theater performance",
  entertainment: "community entertainment event",
  festival: "community outdoor festival",

  volunteer: "community volunteers working together",
  nonprofit: "community charity volunteer event",
  charity: "community charity fundraiser",

  sports: "community outdoor sports",
  fitness: "community group fitness outdoors",
  recreation: "community recreation activity",
  outdoors: "community park families outdoors",
  nature: "families nature park outdoors",

  automotive: "classic car show outdoors",
  pets: "dogs outdoor community event",
  animals: "community animal event",

  business: "local business networking event",
  networking: "professional business networking event",

  health: "community health wellness event",
  wellness: "community wellness activity",
  safety: "community public safety event",

  holiday: "community holiday celebration",
  religious: "community faith gathering",
  faith: "community faith gathering",

  other: "community event people outdoors",
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

function hashText(value: string): number {
  return Math.abs(
    Array.from(value).reduce(
      (hash, character) => (hash * 31 + character.charCodeAt(0)) | 0,
      0,
    ),
  );
}

function photoMatchesImageUrl(
  photo: PexelsPhoto,
  imageUrl: string | null | undefined,
): boolean {
  if (!imageUrl) {
    return false;
  }

  const photoUrls = [
    photo.src.landscape,
    photo.src.medium,
    photo.src.large,
    photo.src.large2x,
    photo.src.original,
  ];

  return photoUrls.some((url) => url === imageUrl);
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

  // Description is the final content-based signal.
  for (const rule of TITLE_SEARCH_RULES) {
    if (rule.keywords.some((keyword) => description.includes(keyword))) {
      return rule.query;
    }
  }

  return "community event people outdoors";
}

export async function searchPexelsImage(
  query: string,
  options?: SearchPexelsImageOptions,
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
    per_page: "20",
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
   * Remove the current image from the result pool when Replace is used.
   * If every returned photo somehow matches, fall back to the full pool.
   */
  const filteredPhotos = data.photos.filter(
    (photo) => !photoMatchesImageUrl(photo, options?.excludeImageUrl),
  );

  const selectionPool =
    filteredPhotos.length > 0 ? filteredPhotos : data.photos;

  /*
   * The query determines the broad result set.
   * The selection seed determines which image inside that set is selected.
   *
   * Initial assignment:
   *   query + event ID
   *
   * Replacement:
   *   query + event ID + current timestamp
   */
  const selectionKey = `${query}|${options?.selectionSeed ?? query}`;
  const selectedIndex = hashText(selectionKey) % selectionPool.length;
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
