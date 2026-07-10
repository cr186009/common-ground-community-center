export const WATCHLIST_CITIES = [
  "Acworth",
  "Dallas",
  "Hiram",
  "Rockmart",
  "Cedartown",
  "Atlanta",
] as const;

export type WatchlistCity = (typeof WATCHLIST_CITIES)[number];

export type CampaignCityMetric = {
  city: string;
  state: string | null;
  percentage: number;
  followers: number | null;
  isGeorgia: boolean;
};

export type CampaignSnapshotRecord = {
  id: string;
  snapshotDate: string;
  sourceName: string;
  importedAt: string;
  cityMetrics: CampaignCityMetric[];
};

export type CampaignStore = {
  snapshots: CampaignSnapshotRecord[];
};

export type CampaignTopCity = CampaignCityMetric & {
  change: number | null;
};

export type CampaignWatchlistPoint = {
  snapshotDate: string;
  label: string;
  percentage: number | null;
};

export type CampaignWatchlistRow = {
  city: WatchlistCity;
  latestPercentage: number | null;
  previousPercentage: number | null;
  change: number | null;
  points: CampaignWatchlistPoint[];
};

export type CampaignDashboardData = {
  snapshots: CampaignSnapshotRecord[];
  latestSnapshot: CampaignSnapshotRecord | null;
  previousSnapshot: CampaignSnapshotRecord | null;
  topGeorgiaCities: CampaignTopCity[];
  watchlistRows: CampaignWatchlistRow[];
  summaryText: string;
  storageFilePath: string;
  uploadDirectoryPath: string;
};
