import type { StorageAdapter } from "@/adapters/contracts";

export const mockStorageAdapter: StorageAdapter = {
  async getStorageSummary() {
    return {
      title: "Vault Array",
      summary:
        "This summary is mocked today, but the adapter is designed for future volume telemetry, shared-folder reporting, and long-term archive checks.",
      metrics: [
        { label: "Capacity", value: "78%", note: "Comfortable for now, but worth watching." },
        { label: "Free space", value: "22 TB", note: "Plenty of runway for short-term growth." },
        { label: "Last index", value: "6 hr ago", note: "Family photo lane is the first automation candidate." },
      ],
    };
  },
};
