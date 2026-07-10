import type { FamilyArchiveAdapter } from "@/adapters/contracts";

export const mockFamilyArchiveAdapter: FamilyArchiveAdapter = {
  async getFeaturedMemory() {
    return {
      title: "Summer driveway concert, 2018",
      story:
        "A phone video, a half-broken speaker, and kids turning a driveway into a stage. The kind of moment that deserves better than getting lost in Camera Roll entropy.",
      whyItMatters:
        "The point of the archive is not just saving files. It is saving context, character, and the pieces that tell your family what life actually felt like.",
    };
  },
};
