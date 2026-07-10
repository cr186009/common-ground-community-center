import type { CreativeProjectsAdapter } from "@/adapters/contracts";
import { projectCards } from "@/data/mock-data";

export const mockProjectsAdapter: CreativeProjectsAdapter = {
  async getProjects() {
    return projectCards;
  },
};
