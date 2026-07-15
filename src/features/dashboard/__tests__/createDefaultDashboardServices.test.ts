import { describe, expect, it, vi } from "vitest";

const supabaseFrom = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/supabase/client", () => ({
  supabase: { from: supabaseFrom },
}));

import { createDefaultDashboardCommissionLoader } from "../services/createDefaultDashboardServices";

describe("default Dashboard services", () => {
  it("keeps commission reads disabled until the view authorization gate passes", async () => {
    const loader = createDefaultDashboardCommissionLoader();

    await expect(loader({
      isSessionReady: true,
      viewer: { email: null, id: "viewer-1", walletAddress: null },
    })).resolves.toEqual({ status: "unavailable" });
    expect(supabaseFrom).not.toHaveBeenCalled();
  });
});
