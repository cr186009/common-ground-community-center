export type Tone = "signal" | "accent" | "warn" | "success" | "muted";

export type SystemCard = {
  kicker: string;
  title: string;
  description: string;
  status: string;
  tone: Tone;
  primary: string;
  secondary: string;
  href: string;
};

export type ActivityItem = {
  title: string;
  detail: string;
  time: string;
};

export type QuickLaunchItem = {
  href: string;
  label: string;
  copy: string;
  icon: "media" | "vault" | "projects" | "life" | "legacy" | "settings";
};

export type SummaryItem = {
  label: string;
  value: string;
  note: string;
};

export type AlertItem = {
  title: string;
  copy: string;
  level: string;
  tone: Tone;
};

export type MediaItem = {
  title: string;
  kind: "Movie" | "Series" | "Music";
  context: string;
  addedAt: string;
};

export type ProjectItem = {
  name: string;
  status: string;
  tone: Tone;
  summary: string;
  nextAction: string;
  lastUpdated: string;
  notes: string;
};

export type IntegrationItem = {
  key: string;
  name: string;
  status: string;
  tone: Tone;
  summary: string;
  requirements: string;
};
