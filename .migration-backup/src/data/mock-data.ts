import type {
  ActivityItem,
  AlertItem,
  IntegrationItem,
  MediaItem,
  ProjectItem,
  QuickLaunchItem,
  SummaryItem,
  SystemCard,
} from "@/types/dashboard";

export const quickLaunch: QuickLaunchItem[] = [
  {
    href: "/media",
    label: "Media Room",
    copy: "Recent adds, Plex pulse, and a slot for now playing.",
    icon: "media",
  },
  {
    href: "/vault",
    label: "Vault + NAS",
    copy: "Storage health, archive lanes, and the family shelves.",
    icon: "vault",
  },
  {
    href: "/projects",
    label: "Studio Board",
    copy: "Creative work, loose ideas, and the next move.",
    icon: "projects",
  },
  {
    href: "/life",
    label: "House Ops",
    copy: "Maintenance, recurring jobs, and future home stats.",
    icon: "life",
  },
  {
    href: "/legacy",
    label: "Memory Vault",
    copy: "Timeline prompts and family archive structure.",
    icon: "legacy",
  },
  {
    href: "/settings",
    label: "Wiring Closet",
    copy: "Adapters, env vars, and integration planning.",
    icon: "settings",
  },
];

export const dashboardSummary: SummaryItem[] = [
  {
    label: "Media adds",
    value: "3",
    note: "Two albums and one series refresh waiting for tags.",
  },
  {
    label: "Open projects",
    value: "4",
    note: "One active song idea, one post draft, two parked but alive.",
  },
  {
    label: "Vault health",
    value: "78%",
    note: "Enough room for now, but photo growth is worth watching.",
  },
];

export const systemCards: SystemCard[] = [
  {
    kicker: "Plex pulse",
    title: "Media stack",
    description: "The server looks calm, with a couple of recent arrivals waiting to be filed into the right mood.",
    status: "Healthy",
    tone: "signal",
    primary: "3 new additions",
    secondary: "Metadata cleanup is the only nag right now.",
    href: "/media",
  },
  {
    kicker: "Archive shelf",
    title: "Vault status",
    description: "Storage is stable, but the family photo lane is getting close enough to deserve future automation.",
    status: "Watch",
    tone: "warn",
    primary: "22 TB free",
    secondary: "Photo archive index last refreshed six hours ago.",
    href: "/vault",
  },
  {
    kicker: "Creative pressure",
    title: "Studio board",
    description: "A few ideas are warm enough to finish if they stay visible and small enough to move today.",
    status: "Active",
    tone: "accent",
    primary: "4 live threads",
    secondary: "The most ready item is the ambient guitar sketch.",
    href: "/projects",
  },
  {
    kicker: "House rhythm",
    title: "Life systems",
    description: "Nothing’s on fire. A short maintenance list and one recurring task are the only items pushing back.",
    status: "Steady",
    tone: "success",
    primary: "1 due soon",
    secondary: "Air filter swap is the next low-drama win.",
    href: "/life",
  },
];

export const activityFeed: ActivityItem[] = [
  {
    title: "Plex library scan wrapped cleanly",
    detail: "Recent movie ingest completed with poster fetches still mocked for v1.",
    time: "45 min ago",
  },
  {
    title: "Family photo lane was manually refreshed",
    detail: "The archive shelf is ready for a future indexer or duplicate checker.",
    time: "6 hr ago",
  },
  {
    title: "Ambient guitar sketch got a new note",
    detail: "Next move is still to print the chord map before the idea cools off.",
    time: "Yesterday",
  },
  {
    title: "House filter reminder rolled forward",
    detail: "Recurring maintenance belongs in the system so your brain doesn’t have to hold it.",
    time: "Yesterday",
  },
];

export const alerts: AlertItem[] = [
  {
    title: "Archive growth is outpacing cleanup",
    copy: "Photo and video imports are still manageable, but this is the lane that will benefit most from automated indexing first.",
    level: "Heads up",
    tone: "warn",
  },
  {
    title: "One creative thread is close to shipping",
    copy: "The song sketch has enough momentum that a thirty-minute focused session could tip it into a real draft.",
    level: "Good nudge",
    tone: "accent",
  },
  {
    title: "Adapters remain explicitly mocked",
    copy: "No service is pretending to be connected yet. The seams are there; the auth and network work come later.",
    level: "Clean build",
    tone: "signal",
  },
];

export const recentlyAdded: MediaItem[] = [
  {
    title: "Paris, Texas",
    kind: "Movie",
    context: "Filed into Late Night Drift with room for director notes later.",
    addedAt: "Today",
  },
  {
    title: "Floating Points - Crush",
    kind: "Music",
    context: "A good reminder that playlists should feel hand-built, not algorithmic.",
    addedAt: "Today",
  },
  {
    title: "Reservation Dogs",
    kind: "Series",
    context: "Marked for a rewatch lane once custom collections exist.",
    addedAt: "Yesterday",
  },
];

export const projectCards: ProjectItem[] = [
  {
    name: "Tape Hiss Ambient EP",
    status: "In Motion",
    tone: "accent",
    summary: "A small, moody batch of guitar textures that needs arrangement decisions more than new ideas.",
    nextAction: "Bounce the best loop and choose a lead motif.",
    lastUpdated: "Today",
    notes: "Keep it raw. The charm is in the friction and bleed, not polish.",
  },
  {
    name: "Family Archive Playbook",
    status: "Research",
    tone: "signal",
    summary: "Defining how photos, scans, captions, and oral history clips should live together long-term.",
    nextAction: "Draft category rules and naming standards.",
    lastUpdated: "Yesterday",
    notes: "This should end in a durable workflow, not just a cleaner folder tree.",
  },
  {
    name: "YouTube Concepts Board",
    status: "Brewing",
    tone: "warn",
    summary: "A place to collect music tech, dashboard, and archive ideas without forcing every thought into production mode.",
    nextAction: "Pick the easiest idea to explain on camera.",
    lastUpdated: "3 days ago",
    notes: "Lower the barrier to starting. Clear beats impressive here.",
  },
  {
    name: "Longform Writing Thread",
    status: "Parked",
    tone: "muted",
    summary: "A few connected notes around systems, memory, and making tools that don’t feel corporate.",
    nextAction: "Merge scattered notes into one source doc.",
    lastUpdated: "Last week",
    notes: "This wants a stronger point of view before it becomes a draft.",
  },
];

export const integrations: IntegrationItem[] = [
  {
    key: "plex",
    name: "Plex API",
    status: "Mocked",
    tone: "signal",
    summary: "Server health, recent libraries, active sessions, and playlist hooks are all represented by mock services today.",
    requirements: "Base URL, token auth, library IDs, and a safe server-side fetch strategy.",
  },
  {
    key: "nas",
    name: "NAS status",
    status: "Mocked",
    tone: "warn",
    summary: "Storage health and shared folder summaries are placeholder-driven, ready for a real endpoint or export feed.",
    requirements: "Device endpoint, auth model, storage schema, and optional SMART/volume telemetry.",
  },
  {
    key: "archive",
    name: "Family archive index",
    status: "Planned",
    tone: "accent",
    summary: "Recent uploads, on-this-day prompts, and timeline events need a date-aware media index rather than raw folders.",
    requirements: "Metadata source, timestamp normalization, people tags, and durable IDs across media types.",
  },
];
