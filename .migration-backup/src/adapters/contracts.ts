import type { MediaItem, ProjectItem } from "@/types/dashboard";

export interface PlexAdapter {
  getServerStatus(): Promise<{
    name: string;
    summary: string;
    stats: Array<{ label: string; value: string; note: string }>;
  }>;
  getRecentlyAdded(): Promise<MediaItem[]>;
}

export interface StorageAdapter {
  getStorageSummary(): Promise<{
    title: string;
    summary: string;
    metrics: Array<{ label: string; value: string; note: string }>;
  }>;
}

export interface CreativeProjectsAdapter {
  getProjects(): Promise<ProjectItem[]>;
}

export interface FamilyArchiveAdapter {
  getFeaturedMemory(): Promise<{
    title: string;
    story: string;
    whyItMatters: string;
  }>;
}
