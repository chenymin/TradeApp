import { StrictMode } from "react";
import { FlatList } from "react-native";
import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import type { RewardsProfile } from "../domain/rewardModels";
import { AppText } from "../../../shared/ui";
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
  it("renders real reward data under the shared Dashboard header", async () => {
    const dependencies = createDependencies();
    const onRefreshCommon = vi.fn().mockResolvedValue(undefined);
    const renderer = await renderRewards({
      dependencies,
      onRefreshCommon,
    });

    let treeText = JSON.stringify(renderer.toJSON());
    expect(treeText).toContain("Dashboard shared header");
    expect(treeText).not.toContain("My Rewards");
    expect(treeText).not.toContain("Invite friends");
    expect(treeText).not.toContain("Open invite options");
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
    expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);
    expect(dependencies.kycLoader).not.toHaveBeenCalled();

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Refresh dashboard" })
        .props.onPress();
    });
    expect(onRefreshCommon).toHaveBeenCalledOnce();
    expect(dependencies.rewardsProfileRepository.fetchProfile).toHaveBeenCalledTimes(2);
    expect(dependencies.referralRecordsClient.fetchRecords).toHaveBeenCalledTimes(2);
    expect(dependencies.pointLedgerRepository.fetchRecent).toHaveBeenCalledTimes(2);
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

  it("retries failed profile and point sections independently", async () => {
    const dependencies = createDependencies();
    dependencies.rewardsProfileRepository.fetchProfile = vi.fn()
      .mockRejectedValueOnce(new Error("profile unavailable"))
      .mockResolvedValueOnce(profile);
    dependencies.pointLedgerRepository.fetchRecent = vi.fn()
      .mockRejectedValueOnce(new Error("points unavailable"))
      .mockResolvedValueOnce([]);
    const renderer = await renderRewards({ dependencies });

    expect(JSON.stringify(renderer.toJSON())).toContain("Rewards summary unavailable");
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Retry rewards summary" })
        .props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Total points");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Rewards tab Points" })
        .props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Point activity unavailable");
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Retry point activity" })
        .props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("No point activity yet");
  });

  it("loads reward data under React StrictMode", async () => {
    const renderer = await renderRewards({
      dependencies: createDependencies(),
      strict: true,
    });

    expect(JSON.stringify(renderer.toJSON())).toContain("Total points");
    expect(JSON.stringify(renderer.toJSON())).toContain("friend@example.com");
  });
});

async function renderRewards({
  dependencies,
  onRefreshCommon = vi.fn().mockResolvedValue(undefined),
  strict = false,
}: {
  dependencies: RewardsDataDependencies;
  onRefreshCommon?: () => Promise<void>;
  strict?: boolean;
}): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    const screen = (
      <RewardsScreen
        dependencies={dependencies}
        onRefreshCommon={onRefreshCommon}
        renderHeader={(refresh) => (
          <AppText
            accessibilityLabel="Refresh dashboard"
            onPress={refresh}
          >
            Dashboard shared header
          </AppText>
        )}
        viewerState={viewerState}
      />
    );
    renderer = TestRenderer.create(strict ? <StrictMode>{screen}</StrictMode> : screen);
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
