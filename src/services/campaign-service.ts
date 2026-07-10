import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  CampaignCityMetric,
  CampaignDashboardData,
  CampaignSnapshotRecord,
  CampaignStore,
  CampaignTopCity,
  CampaignWatchlistPoint,
  CampaignWatchlistRow,
  WatchlistCity,
} from "@/types/campaign";
import { WATCHLIST_CITIES } from "@/types/campaign";

const DATA_ROOT = path.join(process.cwd(), "data");
const STORAGE_ROOT = path.join(DATA_ROOT, "campaign-storage");
const SNAPSHOT_FILE_PATH = path.join(STORAGE_ROOT, "snapshots.json");
const UPLOADS_ROOT = path.join(STORAGE_ROOT, "uploads");
const SAMPLE_ROOT = path.join(DATA_ROOT, "campaign-samples");

const GEORGIA_STATE_CODES = new Set(["ga", "georgia"]);
const KNOWN_GEORGIA_CITIES = new Set(
  [
    ...WATCHLIST_CITIES,
    "Marietta",
    "Smyrna",
    "Kennesaw",
    "Rome",
    "Douglasville",
    "Cartersville",
    "Powder Springs",
    "Mableton",
    "Austell",
    "Lithia Springs",
    "Woodstock",
    "Canton",
    "Newnan",
    "Bremen",
    "Villa Rica",
    "Adairsville",
  ].map((city) => normalizeToken(city)),
);

const CITY_HEADER_CANDIDATES = [
  "city",
  "topcity",
  "citytown",
  "audiencecity",
  "location",
  "primarycity",
  "cityname",
];

const STATE_HEADER_CANDIDATES = ["state", "region", "province", "subregion"];
const PERCENTAGE_HEADER_CANDIDATES = [
  "followerpercentage",
  "followerspercentage",
  "percentage",
  "percent",
  "audiencepercentage",
  "share",
];
const FOLLOWER_COUNT_HEADER_CANDIDATES = [
  "followers",
  "followercount",
  "audience",
  "accounts",
  "count",
];

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSnapshotLabel(snapshotDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${snapshotDate}T12:00:00`));
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(1)}%`;
}

function formatPointChange(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)} pts`;
}

function formatChangePhrase(value: number | null) {
  if (value === null || value === 0) {
    return "held steady";
  }

  if (value > 0) {
    return `is up ${value.toFixed(1)} points`;
  }

  return `is down ${Math.abs(value).toFixed(1)} points`;
}

async function ensureStorage() {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });

  try {
    await fs.access(SNAPSHOT_FILE_PATH);
  } catch {
    const emptyStore: CampaignStore = { snapshots: [] };
    await fs.writeFile(SNAPSHOT_FILE_PATH, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStorage();

  const raw = await fs.readFile(SNAPSHOT_FILE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<CampaignStore> | CampaignSnapshotRecord[];

  if (Array.isArray(parsed)) {
    return { snapshots: parsed } satisfies CampaignStore;
  }

  return {
    snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
  } satisfies CampaignStore;
}

async function writeStore(store: CampaignStore) {
  await ensureStorage();
  await fs.writeFile(SNAPSHOT_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function findHeaderKey(headers: string[], candidates: string[]) {
  for (const candidate of candidates) {
    const exactMatch = headers.find((header) => normalizeToken(header) === candidate);
    if (exactMatch) {
      return exactMatch;
    }
  }

  for (const candidate of candidates) {
    const fuzzyMatch = headers.find((header) => normalizeToken(header).includes(candidate));
    if (fuzzyMatch) {
      return fuzzyMatch;
    }
  }

  return null;
}

function parseNumericValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[%,$\s]/g, "").replace(/,/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeState(rawState: string | null) {
  if (!rawState) {
    return null;
  }

  const cleaned = rawState.trim();
  if (!cleaned) {
    return null;
  }

  const token = normalizeToken(cleaned);
  if (token === "ga") {
    return "GA";
  }

  if (token === "georgia") {
    return "Georgia";
  }

  return cleaned.toUpperCase().length <= 3 ? cleaned.toUpperCase() : titleCase(cleaned);
}

function parseLocation(rawCity: string) {
  const pieces = rawCity
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length >= 2) {
    return {
      city: pieces[0],
      state: pieces[1],
    };
  }

  return {
    city: rawCity.trim(),
    state: null,
  };
}

function isGeorgiaCity(city: string, state: string | null) {
  if (state) {
    return GEORGIA_STATE_CODES.has(normalizeToken(state));
  }

  return KNOWN_GEORGIA_CITIES.has(normalizeToken(city));
}

function buildSnapshotId(snapshotDate: string) {
  return `snapshot-${snapshotDate}`;
}

function sortSnapshots(snapshots: CampaignSnapshotRecord[]) {
  return [...snapshots].sort((left, right) => {
    return left.snapshotDate.localeCompare(right.snapshotDate);
  });
}

function getCityPercentage(snapshot: CampaignSnapshotRecord | null, city: string) {
  if (!snapshot) {
    return null;
  }

  const match = snapshot.cityMetrics.find(
    (metric) => normalizeToken(metric.city) === normalizeToken(city),
  );

  return match?.percentage ?? null;
}

function buildSummaryText(
  latestSnapshot: CampaignSnapshotRecord | null,
  previousSnapshot: CampaignSnapshotRecord | null,
  topGeorgiaCities: CampaignTopCity[],
  watchlistRows: CampaignWatchlistRow[],
) {
  if (!latestSnapshot) {
    return [
      "No campaign snapshots have been uploaded yet.",
      "Upload a CSV with city and follower percentage columns to create your first weekly baseline.",
    ].join(" ");
  }

  const latestLabel = formatSnapshotLabel(latestSnapshot.snapshotDate);
  const topLine =
    topGeorgiaCities.length > 0
      ? topGeorgiaCities
          .slice(0, 3)
          .map((city) => `${city.city} (${formatPercent(city.percentage)})`)
          .join(", ")
      : "No Georgia cities were detected in the latest file";

  const watchlistHighlights = watchlistRows
    .filter((row) => row.change !== null)
    .sort((left, right) => Math.abs((right.change ?? 0)) - Math.abs((left.change ?? 0)))
    .slice(0, 3)
    .map((row) => `${row.city} ${formatChangePhrase(row.change)}`)
    .join("; ");

  if (!previousSnapshot) {
    const baselineLines = watchlistRows
      .map((row) => `${row.city} at ${formatPercent(row.latestPercentage)}`)
      .join(", ");

    return [
      `Weekly campaign snapshot for ${latestLabel} is now stored locally.`,
      `Top Georgia cities in the latest upload are ${topLine}.`,
      `This is the first baseline, with watchlist cities currently reading ${baselineLines}.`,
    ].join(" ");
  }

  const previousLabel = formatSnapshotLabel(previousSnapshot.snapshotDate);
  const atlantaRow = watchlistRows.find((row) => row.city === "Atlanta");
  const atlantaSentence = atlantaRow
    ? `Atlanta moved from ${formatPercent(atlantaRow.previousPercentage)} to ${formatPercent(
        atlantaRow.latestPercentage,
      )} and ${formatChangePhrase(atlantaRow.change)}.`
    : "";

  return [
    `Weekly campaign snapshot for ${latestLabel} is now stored locally and compared against ${previousLabel}.`,
    `Top Georgia cities in the latest upload are ${topLine}.`,
    watchlistHighlights
      ? `Among the tracked cities, ${watchlistHighlights}.`
      : "The tracked watchlist cities were flat week over week.",
    atlantaSentence,
  ]
    .filter(Boolean)
    .join(" ");
}

function parseSnapshotMetrics(csvContent: string) {
  const rows = parseCsv(csvContent);
  if (rows.length < 2) {
    throw new Error("The CSV needs a header row and at least one data row.");
  }

  const [headerRow, ...valueRows] = rows;
  const cityHeader = findHeaderKey(headerRow, CITY_HEADER_CANDIDATES);
  const stateHeader = findHeaderKey(headerRow, STATE_HEADER_CANDIDATES);
  const percentageHeader = findHeaderKey(headerRow, PERCENTAGE_HEADER_CANDIDATES);
  const followerCountHeader = findHeaderKey(headerRow, FOLLOWER_COUNT_HEADER_CANDIDATES);

  if (!cityHeader || !percentageHeader) {
    throw new Error(
      "Could not find the city and follower percentage columns. Expected headers like City and Follower Percentage.",
    );
  }

  const headerIndex = new Map(headerRow.map((header, index) => [header, index]));
  const aggregate = new Map<string, CampaignCityMetric>();

  for (const row of valueRows) {
    const cityValue = row[headerIndex.get(cityHeader) ?? -1];
    const percentageValue = row[headerIndex.get(percentageHeader) ?? -1];

    if (!cityValue || !percentageValue) {
      continue;
    }

    const parsedLocation = parseLocation(cityValue);
    const stateValue = stateHeader ? row[headerIndex.get(stateHeader) ?? -1] : null;
    const city = titleCase(parsedLocation.city);
    const state = normalizeState(stateValue || parsedLocation.state);
    const percentage = parseNumericValue(percentageValue);
    const followers = followerCountHeader
      ? parseNumericValue(row[headerIndex.get(followerCountHeader) ?? -1])
      : null;

    if (percentage === null) {
      continue;
    }

    const key = `${normalizeToken(city)}::${normalizeToken(state ?? "")}`;
    const existing = aggregate.get(key);

    if (existing) {
      existing.percentage += percentage;
      existing.followers =
        existing.followers !== null && followers !== null
          ? existing.followers + followers
          : existing.followers ?? followers;
      continue;
    }

    aggregate.set(key, {
      city,
      state,
      percentage,
      followers,
      isGeorgia: isGeorgiaCity(city, state),
    });
  }

  const cityMetrics = [...aggregate.values()].sort((left, right) => right.percentage - left.percentage);

  if (cityMetrics.length === 0) {
    throw new Error("The CSV was read, but no usable city percentage rows were found.");
  }

  return cityMetrics;
}

export async function importCampaignSnapshot({
  csvContent,
  fileName,
  snapshotDate,
}: {
  csvContent: string;
  fileName: string;
  snapshotDate: string;
}) {
  if (!snapshotDate) {
    throw new Error("A snapshot date is required.");
  }

  const cityMetrics = parseSnapshotMetrics(csvContent);
  const store = await readStore();
  const incomingSnapshot: CampaignSnapshotRecord = {
    id: buildSnapshotId(snapshotDate),
    snapshotDate,
    sourceName: fileName,
    importedAt: new Date().toISOString(),
    cityMetrics,
  };

  const nextSnapshots = store.snapshots.filter((snapshot) => snapshot.snapshotDate !== snapshotDate);
  nextSnapshots.push(incomingSnapshot);

  const uploadPath = path.join(UPLOADS_ROOT, `${snapshotDate}-${fileName}`);
  await fs.writeFile(uploadPath, csvContent, "utf8");
  await writeStore({ snapshots: sortSnapshots(nextSnapshots) });

  return incomingSnapshot;
}

export async function loadSampleCampaignSnapshots() {
  const sampleFiles = ["2026-05-25.csv", "2026-06-01.csv", "2026-06-08.csv"];

  for (const sampleFile of sampleFiles) {
    const snapshotDate = sampleFile.replace(".csv", "");
    const samplePath = path.join(SAMPLE_ROOT, sampleFile);
    const csvContent = await fs.readFile(samplePath, "utf8");

    await importCampaignSnapshot({
      csvContent,
      fileName: sampleFile,
      snapshotDate,
    });
  }
}

export async function resetCampaignSnapshots() {
  await ensureStorage();
  await writeStore({ snapshots: [] });

  const uploadFiles = await fs.readdir(UPLOADS_ROOT);
  await Promise.all(
    uploadFiles.map((fileName) => fs.unlink(path.join(UPLOADS_ROOT, fileName))),
  );
}

export async function getCampaignDashboardData(): Promise<CampaignDashboardData> {
  const store = await readStore();
  const snapshots = sortSnapshots(store.snapshots);
  const latestSnapshot = snapshots.at(-1) ?? null;
  const previousSnapshot = snapshots.at(-2) ?? null;

  const topGeorgiaCities: CampaignTopCity[] = latestSnapshot
    ? latestSnapshot.cityMetrics
        .filter((metric) => metric.isGeorgia)
        .slice(0, 10)
        .map((metric) => ({
          ...metric,
          change: previousSnapshot
            ? (() => {
                const previousValue = getCityPercentage(previousSnapshot, metric.city);
                return previousValue === null ? null : metric.percentage - previousValue;
              })()
            : null,
        }))
    : [];

  const watchlistRows: CampaignWatchlistRow[] = WATCHLIST_CITIES.map((city) => {
    const points: CampaignWatchlistPoint[] = snapshots.map((snapshot) => ({
      snapshotDate: snapshot.snapshotDate,
      label: formatSnapshotLabel(snapshot.snapshotDate),
      percentage: getCityPercentage(snapshot, city),
    }));
    const latestPercentage = points.at(-1)?.percentage ?? null;
    const previousPercentage = points.at(-2)?.percentage ?? null;

    return {
      city: city as WatchlistCity,
      latestPercentage,
      previousPercentage,
      change:
        latestPercentage !== null && previousPercentage !== null
          ? latestPercentage - previousPercentage
          : null,
      points,
    };
  });

  return {
    snapshots,
    latestSnapshot,
    previousSnapshot,
    topGeorgiaCities,
    watchlistRows,
    summaryText: buildSummaryText(latestSnapshot, previousSnapshot, topGeorgiaCities, watchlistRows),
    storageFilePath: SNAPSHOT_FILE_PATH,
    uploadDirectoryPath: UPLOADS_ROOT,
  };
}

export function getCampaignStoragePaths() {
  return {
    storageFilePath: SNAPSHOT_FILE_PATH,
    uploadDirectoryPath: UPLOADS_ROOT,
  };
}

export function getCampaignFormattingHelpers() {
  return {
    formatPercent,
    formatPointChange,
    formatSnapshotLabel,
  };
}
