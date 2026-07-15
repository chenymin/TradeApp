import { describe, expect, it, vi } from "vitest";

import { createDashboardProfileLoader } from "../services/dashboardProfileLoader";

describe("dashboard profile loader", () => {
  it("does not query private data until both viewer and session are ready", async () => {
    const repository = { fetchProfile: vi.fn() };
    const load = createDashboardProfileLoader(repository);

    await expect(load({ isSessionReady: false, viewer: viewer() })).resolves.toBeNull();
    await expect(load({ isSessionReady: true, viewer: null })).resolves.toBeNull();
    expect(repository.fetchProfile).not.toHaveBeenCalled();
  });

  it("queries by the verified viewer id once the session is ready", async () => {
    const profile = { id: "viewer-1" };
    const repository = { fetchProfile: vi.fn().mockResolvedValue(profile) };

    await expect(createDashboardProfileLoader(repository)({
      isSessionReady: true,
      viewer: viewer(),
    })).resolves.toBe(profile);
    expect(repository.fetchProfile).toHaveBeenCalledWith("viewer-1");
  });
});

function viewer() {
  return { email: null, id: "viewer-1", walletAddress: null };
}
