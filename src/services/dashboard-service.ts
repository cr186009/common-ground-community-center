import { mockFamilyArchiveAdapter } from "@/adapters/mock/family-archive-adapter";
import { mockPlexAdapter } from "@/adapters/mock/plex-adapter";
import { mockProjectsAdapter } from "@/adapters/mock/projects-adapter";
import { mockStorageAdapter } from "@/adapters/mock/storage-adapter";
import {
  activityFeed,
  alerts,
  dashboardSummary,
  integrations,
  quickLaunch,
  systemCards,
} from "@/data/mock-data";
import { formatFullDate, getGreetingLabel } from "@/lib/utils";

export async function getDashboardHomeData() {
  const now = new Date();
  const greeting = getGreetingLabel(now);

  return {
    greeting: {
      ...greeting,
      summary: `${formatFullDate(now)}. The command center is tuned for quick decisions, not busywork.`,
    },
    todaySummary: dashboardSummary,
    quickLaunch,
    systemCards,
    activityFeed,
    alerts,
  };
}

export async function getMediaHubData() {
  const [server, items] = await Promise.all([
    mockPlexAdapter.getServerStatus(),
    mockPlexAdapter.getRecentlyAdded(),
  ]);

  return {
    server,
    recentlyAdded: items,
    shortcuts: [
      { label: "Friday Night Picks", copy: "A hand-curated lane for low-effort family movie starts." },
      { label: "Kitchen Jazz", copy: "A placeholder for the playlists that make the house feel better." },
      { label: "Late Night Drift", copy: "The films and records for when the day finally gets quiet." },
    ],
    categories: [
      { label: "Movies", count: "684", copy: "The core library with space for better tags later." },
      { label: "Series", count: "119", copy: "Longform comfort watches and rewatch-worthy favorites." },
      { label: "Music", count: "2.4k", copy: "Albums, rips, and future room for deeper curation." },
    ],
  };
}

export async function getVaultData() {
  const storage = await mockStorageAdapter.getStorageSummary();

  return {
    storage,
    categories: [
      { label: "Photos", count: "148k", copy: "Family photos, phone dumps, edits, and future dedupe work." },
      { label: "Videos", count: "12k", copy: "Home movies, exports, and the stuff worth preserving carefully." },
      { label: "Music", count: "2.4k", copy: "Rips, stems, demos, and the listening library." },
      { label: "Documents", count: "8.7k", copy: "Scans, records, manuals, and the boring important things." },
      { label: "Artwork", count: "1.2k", copy: "Design scraps, scans, kid art, and future gallery potential." },
      { label: "Family History", count: "314", copy: "Genealogy notes, letters, stories, and research threads." },
    ],
    sharedFolders: [
      { name: "Family Photos", summary: "The highest-value shelf in the house.", lastTouched: "Updated today" },
      { name: "House Manuals", summary: "The practical archive for maintenance and repairs.", lastTouched: "Updated yesterday" },
      { name: "Studio Exports", summary: "Mixdowns, art drafts, and creative scratch files.", lastTouched: "Updated 3 days ago" },
      { name: "Legacy Scans", summary: "Old documents and photos that deserve better metadata.", lastTouched: "Updated last week" },
    ],
  };
}

export async function getCreativeProjectsData() {
  const projects = await mockProjectsAdapter.getProjects();

  return {
    projects,
    momentum: [
      { label: "Ready to finish", copy: "The ambient EP has the clearest next step and the least friction." },
      { label: "Needs structure", copy: "The archive playbook should become a real workflow doc next." },
      { label: "Safe to park", copy: "Longform writing can wait without becoming dead weight." },
    ],
    ideaBank: [
      { title: "Small-studio filming setup", copy: "A practical video about creator gear that doesn’t require buying new toys." },
      { title: "Media room curation notes", copy: "A post or video on building collections with taste instead of algorithm drift." },
      { title: "Family archive naming standards", copy: "The kind of nerdy system that quietly saves future you a lot of grief." },
    ],
  };
}

export async function getLifeDashboardData() {
  return {
    homeProjects: [
      { title: "Garage cleanup pass", status: "Queued", tone: "muted" as const, copy: "Break it into one shelf, one bin, one decision set." },
      { title: "Backyard light fix", status: "Due soon", tone: "warn" as const, copy: "Small repair, high quality-of-life return." },
      { title: "Office cable tidy", status: "In motion", tone: "signal" as const, copy: "A future-you kindness disguised as a boring chore." },
    ],
    maintenance: [
      { title: "HVAC filter", when: "This weekend", copy: "Low effort, high payoff. Keep this kind of job off the mental stack." },
      { title: "Smoke detector check", when: "Next month", copy: "A recurring safety rhythm should be automatic, not memory-based." },
      { title: "Vehicle fluid glance", when: "Next month", copy: "Just enough operational discipline to avoid preventable annoyance." },
    ],
    recurring: [
      { title: "Friday reset", copy: "A short house reset and inbox sweep before the weekend starts." },
      { title: "Monthly archive drop", copy: "Move recent family media into the right lane before it scatters." },
      { title: "Project sync", copy: "Check whether the studio board still reflects what you actually care about." },
      { title: "House stock check", copy: "One calm review of filters, batteries, and boring essentials." },
    ],
  };
}

export async function getLegacyData() {
  const featured = await mockFamilyArchiveAdapter.getFeaturedMemory();

  return {
    featured,
    onThisDay: [
      { year: "2014", tag: "Photo set", copy: "First apartment move-in photos with a lot more optimism than furniture." },
      { year: "2019", tag: "Audio clip", copy: "A backyard recording that captures family voices better than any posed image." },
      { year: "2022", tag: "Video", copy: "A short clip from a trip worth annotating before the details fade." },
    ],
    categories: [
      { title: "Photo stories", copy: "Albums with notes, not just date buckets." },
      { title: "Voice and video", copy: "The texture of family life that still images can’t hold alone." },
      { title: "Documents and letters", copy: "Scans that carry meaning once tagged and connected." },
      { title: "Milestone timeline", copy: "Birthdays, moves, trips, projects, and the tiny events that define eras." },
    ],
  };
}

export async function getSettingsData() {
  return {
    integrations,
    environment: [
      { name: "PLEX_BASE_URL", copy: "Server address for future read-only media visibility." },
      { name: "PLEX_TOKEN", copy: "Private auth token kept server-side once the Plex adapter goes real." },
      { name: "NAS_STATUS_URL", copy: "Endpoint or export feed for volume and health telemetry." },
      { name: "ARCHIVE_INDEX_PATH", copy: "Local file or service path for memory-vault metadata feeds." },
    ],
  };
}
