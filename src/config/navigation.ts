import type { LucideIcon } from "lucide-react";
import {
  FolderKanban,
  HardDrive,
  House,
  Library,
  MapPinned,
  NotebookPen,
  Settings2,
  Sparkles,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
};

export const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Today Deck",
    shortLabel: "Today",
    icon: Sparkles,
    description: "The front door and quick scan.",
  },
  {
    href: "/campaign",
    label: "Campaign Desk",
    shortLabel: "Campaign",
    icon: MapPinned,
    description: "Weekly city trends and planning summaries.",
  },
  {
    href: "/media",
    label: "Media Room",
    shortLabel: "Media",
    icon: Library,
    description: "Plex pulse and recent adds.",
  },
  {
    href: "/vault",
    label: "Vault + NAS",
    shortLabel: "Vault",
    icon: HardDrive,
    description: "Storage and archive lanes.",
  },
  {
    href: "/projects",
    label: "Studio Board",
    shortLabel: "Studio",
    icon: FolderKanban,
    description: "Creative projects and ideas.",
  },
  {
    href: "/life",
    label: "House Ops",
    shortLabel: "Life",
    icon: House,
    description: "Maintenance and recurring systems.",
  },
  {
    href: "/legacy",
    label: "Memory Vault",
    shortLabel: "Legacy",
    icon: NotebookPen,
    description: "Family archive and timeline concepts.",
  },
  {
    href: "/settings",
    label: "Wiring Closet",
    shortLabel: "Settings",
    icon: Settings2,
    description: "Mocks, adapters, and config.",
  },
];
