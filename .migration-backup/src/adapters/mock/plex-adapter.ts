import type { PlexAdapter } from "@/adapters/contracts";
import { recentlyAdded } from "@/data/mock-data";

export const mockPlexAdapter: PlexAdapter = {
  async getServerStatus() {
    return {
      name: "Basement Plex Stack",
      summary:
        "The server card is mocked, but the contract is shaped for the real Plex API: server health, transcode load, and library pulse without clutter.",
      stats: [
        { label: "Libraries", value: "7", note: "Film, series, music, and room to expand." },
        { label: "Recent adds", value: "3", note: "Enough movement to keep the room feeling alive." },
        { label: "Sessions", value: "0", note: "Now playing will wake up once the real hook is wired." },
      ],
    };
  },
  async getRecentlyAdded() {
    return recentlyAdded;
  },
};
