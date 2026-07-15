import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import type { RewardsProfile } from "../domain/rewardModels";
import {
  RewardsScreen,
  type RewardsDataDependencies,
} from "../screens/RewardsScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const viewerState = {
  isSessionReady: true,
  viewer: {
    email: "viewer@example.com",
    id: "viewer-1",
    walletAddress: "0x0000000000000000000000000000000000000008",
  },
};

describe("RewardsScreen", () => {
  it("renders real reward data and switches virtualized lists", async () => {
    const onOpenInvite = vi.fn();
    const renderer = await renderRewards({
      dependencies: createDependencies(),
      onOpenInvite,
      publicWebOrigin: "https://test.artstarex.com",
    });

    let treeText = JSON.stringify(renderer.toJSON());
    expect(treeText).toContain("My Rewards");
    expect(treeText).toContain("Total points");
    expect(treeText).toContain("150");
    expect(treeText).toContain("Referral points");
    expect(treeText).toContain("Trading points");
    expect(treeText).toContain("Reputation points");
    expect(treeText).toContain("Task points");
    expect(treeText).toContain("Basic registration benefits");
    expect(treeText).toContain("friend@example.com");
    expect(treeText).toContain("Waiting for KYC");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Rewards tab Points" })
        .props.onPress();
    });
    treeText = JSON.stringify(renderer.toJSON());
    expect(treeText).toContain("Purchase reward");
    expect(treeText).toContain("+12.5");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Rewards tab Commission" })
        .props.onPress();
    });
    treeText = JSON.stringify(renderer.toJSON());
    expect(treeText).toContain("Commission data is temporarily unavailable");
    expect(treeText).toContain("Access controls are under security review");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Open invite options" })
        .props.onPress();
    });
    expect(onOpenInvite).toHaveBeenCalledWith({
      inviteCode: "INVITE-1",
      webOrigin: "https://test.artstarex.com",
    });
  });

  it("keeps successful sections visible when the profile fails", async () => {
    const dependencies = createDependencies();
    dependencies.rewardsProfileRepository.fetchProfile = vi.fn()
      .mockRejectedValue(new Error("profile unavailable"));

    const renderer = await renderRewards({ dependencies });
    const treeText = JSON.stringify(renderer.toJSON());

    expect(treeText).toContain("Rewards summary unavailable");
    expect(treeText).toContain("friend@example.com");
  });

  it("distinguishes empty data from errors and retries referral failures", async () => {
    const dependencies = createDependencies();
    dependencies.pointLedgerRepository.fetchRecent = vi.fn().mockResolvedValue([]);
    dependencies.referralRecordsClient.fetchRecords = vi.fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce([]);
    const renderer = await renderRewards({ dependencies });

    expect(JSON.stringify(renderer.toJSON())).toContain("Referral records unavailable");

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Retry referral records" })
        .props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("No referral records yet");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Rewards tab Points" })
        .props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("No point activity yet");
  });

  it("gates invitations when KYC or public origin is unavailable", async () => {
    const missingOrigin = await renderRewards({
      dependencies: createDependencies(),
      publicWebOrigin: undefined,
    });
    expect(JSON.stringify(missingOrigin.toJSON())).toContain(
      "Invite sharing is not configured",
    );

    const dependencies = createDependencies();
    dependencies.kycLoader = vi.fn().mockResolvedValue({
      approved: false,
      notes: null,
      reasonCode: null,
      reviewedAt: null,
      status: "pending",
    });
    const onOpenKyc = vi.fn();
    const unapproved = await renderRewards({
      dependencies,
      onOpenKyc,
      publicWebOrigin: "https://test.artstarex.com",
    });
    expect(JSON.stringify(unapproved.toJSON())).toContain(
      "Complete KYC to unlock invitations",
    );

    await act(async () => {
      unapproved.root.findByProps({ accessibilityLabel: "Open KYC" }).props.onPress();
    });
    expect(onOpenKyc).toHaveBeenCalledOnce();
  });

  it("does not inherit tier benefits for an unknown tier", async () => {
    const dependencies = createDependencies();
    dependencies.rewardsProfileRepository.fetchProfile = vi.fn()
      .mockResolvedValue({ ...profile, tier: null });

    const renderer = await renderRewards({ dependencies });
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "Tier benefits are unavailable for this account",
    );
    expect(JSON.stringify(renderer.toJSON())).not.toContain(
      "Basic registration benefits",
    );
  });
});

async function renderRewards({
  dependencies,
  onOpenInvite = vi.fn(),
  onOpenKyc = vi.fn(),
  publicWebOrigin,
}: {
  dependencies: RewardsDataDependencies;
  onOpenInvite?: (value: { inviteCode: string; webOrigin: string }) => void;
  onOpenKyc?: () => void;
  publicWebOrigin?: string;
}): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(
      <RewardsScreen
        dependencies={dependencies}
        onOpenInvite={onOpenInvite}
        onOpenKyc={onOpenKyc}
        publicWebOrigin={publicWebOrigin}
        viewerState={viewerState}
      />,
    );
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Expected RewardsScreen to mount");
  return renderer;
}

function createDependencies(): RewardsDataDependencies {
  return {
    fetchAccessToken: vi.fn().mockResolvedValue("access-token"),
    kycLoader: vi.fn().mockResolvedValue({
      approved: true,
      notes: null,
      reasonCode: null,
      reviewedAt: "2026-07-10T00:00:00Z",
      status: "approved",
    }),
    pointLedgerRepository: {
      fetchRecent: vi.fn().mockResolvedValue([{
        amount: "12.5",
        balanceAfter: "80.5",
        createdAt: "2026-07-15T08:30:00Z",
        id: "point-1",
        pointType: "task",
        source: "Purchase reward",
      }]),
    },
    referralRecordsClient: {
      fetchRecords: vi.fn().mockResolvedValue([{
        createdAt: "2026-07-14T08:30:00Z",
        id: "referral-1",
        referredEmail: "friend@example.com",
        referredId: "friend-1",
        referredTier: "C",
        referredUserType: "collector",
        referredWalletAddress: null,
        status: "waiting_kyc",
        totalPointsAwarded: 25,
      }]),
    },
    rewardsProfileRepository: {
      fetchProfile: vi.fn().mockResolvedValue(profile),
    },
  };
}

const profile: RewardsProfile = {
  id: "viewer-1",
  inviteCode: "INVITE-1",
  referralPoints: 40,
  reputationPoints: 30,
  taskPoints: 20,
  tier: "D",
  totalPoints: 150,
  tradingPoints: 60,
  userType: "investor",
};
