import { describe, expect, it, vi } from "vitest";

import type { DashboardKycSummary } from "../../dashboard/services/dashboardKycRepository";
import type { RewardsProfile } from "../domain/rewardModels";
import type { RewardsDataDependencies } from "../screens/RewardsScreen";
import { runInviteFriendCommand } from "../workflow/inviteFriendCommand";

describe("runInviteFriendCommand", () => {
  it("returns session unavailable without private reads", async () => {
    const dependencies = createDependencies();

    await expect(runInviteFriendCommand({
      dependencies,
      publicWebOrigin: "https://test.artstarex.com",
      viewerState: { isSessionReady: false, viewer: null },
    })).resolves.toEqual({ status: "session_unavailable" });
    expect(dependencies.rewardsProfileRepository.fetchProfile).not.toHaveBeenCalled();
    expect(dependencies.kycLoader).not.toHaveBeenCalled();
  });

  it("starts profile and KYC reads before either one resolves", async () => {
    const profile = deferred<RewardsProfile>();
    const kyc = deferred<DashboardKycSummary | null>();
    const dependencies = createDependencies();
    dependencies.rewardsProfileRepository.fetchProfile = vi.fn()
      .mockReturnValue(profile.promise);
    dependencies.kycLoader = vi.fn().mockReturnValue(kyc.promise);

    const result = runInviteFriendCommand({
      dependencies,
      publicWebOrigin: "https://test.artstarex.com",
      viewerState,
    });

    expect(dependencies.rewardsProfileRepository.fetchProfile).toHaveBeenCalledOnce();
    expect(dependencies.kycLoader).toHaveBeenCalledOnce();
    profile.resolve(profileFixture);
    kyc.resolve(approvedKyc);
    await expect(result).resolves.toEqual({
      inviteCode: "REAL-CODE",
      status: "ready",
      webOrigin: "https://test.artstarex.com",
    });
  });

  it("returns KYC required for every non-approved status", async () => {
    const dependencies = createDependencies();
    dependencies.kycLoader = vi.fn().mockResolvedValue({
      ...approvedKyc,
      approved: false,
      status: "under_review",
    });

    await expect(runInviteFriendCommand({
      dependencies,
      publicWebOrigin: "https://test.artstarex.com",
      viewerState,
    })).resolves.toEqual({ status: "kyc_required" });
  });

  it("returns invite-code unavailable for a profile without a real code", async () => {
    const dependencies = createDependencies();
    dependencies.rewardsProfileRepository.fetchProfile = vi.fn()
      .mockResolvedValue({ ...profileFixture, inviteCode: " " });

    await expect(runInviteFriendCommand({
      dependencies,
      publicWebOrigin: "https://test.artstarex.com",
      viewerState,
    })).resolves.toEqual({ status: "invite_code_unavailable" });
  });

  it.each([
    undefined,
    "http://test.artstarex.com",
    "https://user:pass@test.artstarex.com",
    "https://test.artstarex.com/register",
    "https://test.artstarex.com?source=app",
    "https://test.artstarex.com#invite",
    "not-a-url",
  ])("rejects unsafe public origin %s", async (publicWebOrigin) => {
    await expect(runInviteFriendCommand({
      dependencies: createDependencies(),
      publicWebOrigin,
      viewerState,
    })).resolves.toEqual({ status: "origin_unavailable" });
  });

  it.each(["profile", "kyc"] as const)(
    "returns unavailable when the %s repository fails",
    async (dependency) => {
      const dependencies = createDependencies();
      if (dependency === "profile") {
        dependencies.rewardsProfileRepository.fetchProfile = vi.fn()
          .mockRejectedValue(new Error("profile unavailable"));
      } else {
        dependencies.kycLoader = vi.fn()
          .mockRejectedValue(new Error("KYC unavailable"));
      }

      await expect(runInviteFriendCommand({
        dependencies,
        publicWebOrigin: "https://test.artstarex.com",
        viewerState,
      })).resolves.toEqual({ status: "unavailable" });
    },
  );

  it("returns trimmed real invite values", async () => {
    const dependencies = createDependencies();
    dependencies.rewardsProfileRepository.fetchProfile = vi.fn()
      .mockResolvedValue({ ...profileFixture, inviteCode: " REAL-CODE " });

    await expect(runInviteFriendCommand({
      dependencies,
      publicWebOrigin: "https://test.artstarex.com/",
      viewerState,
    })).resolves.toEqual({
      inviteCode: "REAL-CODE",
      status: "ready",
      webOrigin: "https://test.artstarex.com",
    });
  });
});

function createDependencies(): RewardsDataDependencies {
  return {
    fetchAccessToken: vi.fn().mockResolvedValue("access-token"),
    kycLoader: vi.fn().mockResolvedValue(approvedKyc),
    pointLedgerRepository: { fetchRecent: vi.fn().mockResolvedValue([]) },
    referralRecordsClient: { fetchRecords: vi.fn().mockResolvedValue([]) },
    rewardsProfileRepository: {
      fetchProfile: vi.fn().mockResolvedValue(profileFixture),
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

const viewerState = {
  isSessionReady: true,
  viewer: {
    email: "viewer@example.com",
    id: "viewer-1",
    walletAddress: "0x0000000000000000000000000000000000000008",
  },
};

const approvedKyc: DashboardKycSummary = {
  approved: true,
  notes: null,
  reasonCode: null,
  reviewedAt: "2026-07-10T00:00:00Z",
  status: "approved",
};

const profileFixture: RewardsProfile = {
  id: "viewer-1",
  inviteCode: "REAL-CODE",
  referralPoints: 40,
  reputationPoints: 30,
  taskPoints: 20,
  tier: "D",
  totalPoints: 150,
  tradingPoints: 60,
  userType: "investor",
};
