import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  findByProps,
  getPressHandler,
  renderElement,
  textContent,
} from "../../../test/renderElement";
import type { PublicAssetPageLoader, PublicAssetSummary } from "../../../features/assets/domain/assetModels";
import type { AssetDetailLoader } from "../../../features/assets/domain/assetDetailModels";
import { toAssetDetailReadModel } from "../../../features/assets/domain/assetDetailMappers";
import type { RewardsDataDependencies } from "../../../features/referral/screens/RewardsScreen";
import { AppNavigator } from "../AppNavigator";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("AppNavigator", () => {
  it("shows a restoring state while auth is being restored", () => {
    const tree = renderElement(
      <AppNavigator actions={createActions()} state={{ status: "restoring_session" }} />,
    );

    expect(textContent(tree)).toContain("Restoring session");
  });

  it("renders logged out users into global tabs with the public Launchpad active", async () => {
    const actions = createActions();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator actions={actions} assetPageLoader={createAssetLoader()} state={{ status: "logged_out" }} />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    const treeText = JSON.stringify(renderer.toJSON());

    expect(treeText).toContain("Launchpad");
    expect(treeText).toContain("Market");
    expect(treeText).toContain("Referral");
    expect(treeText).toContain("Dashboard");
    expect(treeText).toContain("My");
    expect(treeText).toContain("艺术资产发行");
    expect(treeText).toContain("Sign in");
    expect(renderer.root.findByProps({ accessibilityLabel: "Tab Launchpad" }).props.accessibilityState).toEqual({
      selected: true,
    });

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Tab Dashboard" }).props.onPress();
    });

    expect(actions.login).toHaveBeenCalledOnce();
  });

  it("lets logged out users switch between public tabs without signing in", async () => {
    const actions = createActions();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator actions={actions} assetPageLoader={createAssetLoader()} state={{ status: "logged_out" }} />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Tab Referral" }).props.onPress();
    });

    expect(renderer.root.findByProps({ accessibilityLabel: "Tab Referral" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Public referral rules");
    expect(actions.login).not.toHaveBeenCalled();

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Tab My" }).props.onPress();
    });

    expect(renderer.root.findByProps({ accessibilityLabel: "Tab My" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Wallet");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Sign out");
    expect(actions.login).not.toHaveBeenCalled();
  });

  it("allows logged out users to start on My", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          initialRouteName="profile"
          state={{ status: "logged_out" }}
        />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    expect(renderer.root.findByProps({ accessibilityLabel: "Tab My" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Wallet");
  });

  it("requires login before opening My Rewards from the public profile", async () => {
    const actions = createActions();
    const rewardsDependencies = createRewardsDependencies();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={actions}
          initialRouteName="profile"
          rewardsDependencies={rewardsDependencies}
          state={{ status: "logged_out" }}
        />,
      );
    });

    await act(async () => {
      testRenderer!.root.findByProps({ accessibilityLabel: "Profile item 邀请好友" })
        .props.onPress();
    });

    expect(actions.login).toHaveBeenCalledOnce();
    expect(rewardsDependencies.rewardsProfileRepository.fetchProfile)
      .not.toHaveBeenCalled();
    expect(JSON.stringify(testRenderer?.toJSON())).not.toContain("My Rewards");
  });

  it("falls back to Launchpad when logged out users start on a protected tab", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          assetPageLoader={createAssetLoader()}
          initialRouteName="dashboard"
          state={{ status: "logged_out" }}
        />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    expect(renderer.root.findByProps({ accessibilityLabel: "Tab Launchpad" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("艺术资产发行");
  });

  it("opens real asset detail, hides tabs, and returns to the originating tab", async () => {
    const loader = createAssetLoader([assetSummary()]);
    const detailLoader = createAssetDetailLoader();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          assetDetailLoader={detailLoader}
          assetPageLoader={loader}
          externalLinkAdapter={{ open: vi.fn().mockResolvedValue("opened") }}
          state={{ status: "logged_out" }}
        />,
      );
      await Promise.resolve();
    });

    if (!testRenderer) throw new Error("Expected AppNavigator test renderer to mount");
    const renderer = testRenderer;

    expect(JSON.stringify(renderer.toJSON())).toContain("Morning Mist");
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Open asset Morning Mist" }).props.onPress();
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Detail Morning Mist");
    expect(detailLoader).toHaveBeenCalledWith({
      assetId: "asset-1",
      placeholder: assetSummary(),
      viewer: {
        isLoggedIn: false,
        kycApproved: "unknown",
        walletAddress: null,
        whitelisted: "unknown",
      },
    });
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Tab Market" })).toHaveLength(0);

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Back" }).props.onPress();
    });
    expect(renderer.root.findByProps({ accessibilityLabel: "Tab Launchpad" }).props.accessibilityState).toEqual({ selected: true });

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Tab Market" }).props.onPress();
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("艺术资产市场");
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "completed" }));

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Open asset Morning Mist" }).props.onPress();
      await Promise.resolve();
    });
    await act(async () => renderer.root.findByProps({ accessibilityLabel: "Back" }).props.onPress());
    expect(renderer.root.findByProps({ accessibilityLabel: "Tab Market" }).props.accessibilityState).toEqual({ selected: true });
  });

  it("renders authenticated users into global tabs with Dashboard active", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator actions={createActions()} state={authenticatedState()} />,
      );
      await Promise.resolve();
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }

    const treeText = JSON.stringify(testRenderer.toJSON());

    expect(treeText).toContain("Launchpad");
    expect(treeText).toContain("Market");
    expect(treeText).toContain("Referral");
    expect(treeText).toContain("Dashboard");
    expect(treeText).not.toContain("Tab Wallet");
    expect(treeText).toContain("My");
    expect(treeText).toContain("Portfolio value");
    expect(testRenderer.root.findByProps({ accessibilityLabel: "Header title Home" })).toBeTruthy();
    expect(testRenderer.root.findByProps({ accessibilityLabel: "Wallet status" })).toBeTruthy();
    expect(testRenderer.root.findByProps({ accessibilityLabel: "Tab Dashboard" }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("renders the real authenticated dashboard instead of the feature placeholder", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          dashboardDependencies={createDashboardDependencies()}
          state={{
            isSessionReady: true,
            status: "authenticated",
            viewer: {
              email: "viewer@example.com",
              id: "viewer-1",
              walletAddress: "0x0000000000000000000000000000000000000008",
            },
          }}
        />,
      );
      await Promise.resolve();
    });

    const output = JSON.stringify(testRenderer?.toJSON());
    expect(output).toContain("Alice");
    expect(output).toContain("No holdings yet");
    expect(output).not.toContain("Feature placeholder");
  });

  it("renders the protected My Rewards route with real reward dependencies", async () => {
    const rewardsDependencies = createRewardsDependencies();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          initialRouteName="referral"
          publicWebOrigin="https://test.artstarex.com"
          rewardsDependencies={rewardsDependencies}
          state={authenticatedState()}
        />,
      );
      await Promise.resolve();
    });

    const output = JSON.stringify(testRenderer?.toJSON());
    expect(output).toContain("My Rewards");
    expect(output).toContain("150");
    expect(output).not.toContain("Feature placeholder");
    expect(rewardsDependencies.rewardsProfileRepository.fetchProfile)
      .toHaveBeenCalledWith("viewer-1");
  });

  it("offers a working re-login action for an upgraded legacy session", async () => {
    const actions = createActions();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={actions}
          state={{ isSessionReady: true, status: "authenticated", viewer: null }}
        />,
      );
    });

    expect(JSON.stringify(testRenderer?.toJSON())).toContain("Session needs to be refreshed");

    await act(async () => {
      await testRenderer!.root.findByProps({ accessibilityLabel: "Sign in again" })
        .props.onPress();
    });

    expect(actions.logout).toHaveBeenCalledOnce();
    expect(actions.login).toHaveBeenCalledOnce();
    expect(actions.logout.mock.invocationCallOrder[0])
      .toBeLessThan(actions.login.mock.invocationCallOrder[0]);
  });

  it("switches protected tabs to My when the profile tab is pressed", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator actions={createActions()} state={authenticatedState()} />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    expect(renderer.root.findByProps({ accessibilityLabel: "Tab Dashboard" }).props.accessibilityState).toEqual({
      selected: true,
    });

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Tab My" }).props.onPress();
    });

    expect(renderer.root.findByProps({ accessibilityLabel: "Tab My" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Wallet");
  });

  it("renders profile as the container for wallet kyc invite settings and logout", async () => {
    const actions = createActions();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={actions}
          initialRouteName="profile"
          state={authenticatedState()}
        />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    const treeText = JSON.stringify(renderer.toJSON());

    expect(treeText).toContain("KYC");
    expect(treeText).toContain("Wallet");
    expect(treeText).toContain("邀请好友");
    expect(treeText).toContain("Settings");
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item 邀请好友" })).toBeTruthy();
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Profile item Referral" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Profile item Security" })).toHaveLength(0);
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item Wallet arrow" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item KYC arrow" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item 邀请好友 arrow" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item Settings arrow" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item Wallet arrow" }).props.style).toMatchObject({
      borderRightWidth: 2,
      borderTopWidth: 2,
      transform: [{ rotate: "45deg" }],
    });
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item Wallet divider" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item KYC divider" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item 邀请好友 divider" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile item Settings divider" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile action section" })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: "Profile menu section" }).findAllByProps({
      accessibilityLabel: "Sign out",
    })).toHaveLength(0);

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Sign out" }).props.onPress();
    });

    expect(actions.logout).toHaveBeenCalledOnce();
  });

  it("opens My Rewards from profile and uses only the real invite values", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          initialRouteName="profile"
          publicWebOrigin="https://test.artstarex.com"
          rewardsDependencies={createRewardsDependencies()}
          state={authenticatedState()}
        />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Profile item 邀请好友" }).props.onPress();
      await Promise.resolve();
    });

    expect(JSON.stringify(renderer.toJSON())).toContain("My Rewards");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Open invite options" }).props.onPress();
    });

    expect(renderer.root.findByProps({ accessibilityLabel: "Invite friends overlay" }).props.style).toMatchObject({
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Invite friends");
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "https://test.artstarex.com/register?ref=REAL-CODE&type=investor",
    );
    expect(JSON.stringify(renderer.toJSON())).not.toContain("DEMO-CODE");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("app.mytrade.local");
  });

  it("renders the account disabled screen for disabled accounts", () => {
    const tree = renderElement(
      <AppNavigator actions={createActions()} state={{ status: "account_disabled" }} />,
    );

    expect(textContent(tree)).toContain("Account unavailable");
  });

  it("shows the registration recovery screen for orphaned accounts", async () => {
    const actions = createActions();
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator actions={actions} state={{ status: "orphaned_recovery" }} />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    expect(JSON.stringify(renderer.toJSON())).toContain("Registration recovery");

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: "Continue as Investor" }).props.onPress();
    });

    expect(actions.recoverAsInvestor).toHaveBeenCalledOnce();
  });
});

function createActions() {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    recoverAsInvestor: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(undefined),
  };
}

function createRewardsDependencies(): RewardsDataDependencies {
  return {
    fetchAccessToken: vi.fn().mockResolvedValue("access-token"),
    kycLoader: vi.fn().mockResolvedValue({
      approved: true,
      notes: null,
      reasonCode: null,
      reviewedAt: null,
      status: "approved",
    }),
    pointLedgerRepository: { fetchRecent: vi.fn().mockResolvedValue([]) },
    referralRecordsClient: { fetchRecords: vi.fn().mockResolvedValue([]) },
    rewardsProfileRepository: {
      fetchProfile: vi.fn().mockResolvedValue({
        id: "viewer-1",
        inviteCode: "REAL-CODE",
        referralPoints: 40,
        reputationPoints: 30,
        taskPoints: 20,
        tier: "D",
        totalPoints: 150,
        tradingPoints: 60,
        userType: "investor",
      }),
    },
  };
}

function authenticatedState() {
  return {
    isSessionReady: true,
    status: "authenticated" as const,
    viewer: {
      email: "viewer@example.com",
      id: "viewer-1",
      walletAddress: "0x0000000000000000000000000000000000000008",
    },
  };
}

function createAssetLoader(items: PublicAssetSummary[] = []): ReturnType<typeof vi.fn<PublicAssetPageLoader>> {
  return vi.fn<PublicAssetPageLoader>().mockResolvedValue({ items, nextCursor: null });
}

function assetSummary(): PublicAssetSummary {
  return {
    artistName: "Lin Wei",
    availableSharesText: "750",
    chainId: 97,
    chainStatus: "ready",
    contractAddress: null,
    id: "asset-1",
    imageUrl: null,
    participantsCount: 8,
    paymentSymbol: "USDT",
    priceAmount: "0.1",
    priceText: "$0.1 USDT",
    progressPercent: 25,
    remainingTimeText: "3 分钟",
    saleCapText: "1,000",
    saleStatus: "active",
    soldSharesText: "250",
    title: "Morning Mist",
    tokenCode: "ART-MIST",
    totalSupplyText: "2,000",
  };
}

function createAssetDetailLoader(): ReturnType<typeof vi.fn<AssetDetailLoader>> {
  return vi.fn<AssetDetailLoader>().mockResolvedValue({
    detail: toAssetDetailReadModel({
      contract: { status: "error" },
      database: {
        artistName: "Lin Wei",
        chainId: 97,
        contractAddress: "0x1111111111111111111111111111111111111111",
        creationYear: "2025",
        description: "Detail description",
        dimensions: "120 x 80 cm",
        id: "asset-1",
        imageUrl: null,
        material: "Oil on canvas",
        participantsCount: 8,
        provenance: "Studio archive",
        saleEnd: null,
        saleStart: null,
        status: "active",
        symbol: "ART-MIST",
        title: "Detail Morning Mist",
        tokenPriceUsdt: "0.1",
        totalSupply: "2000",
      },
      events: { events: [], warning: null },
      nowSeconds: 1_000,
      valuation: null,
      valuationUnavailable: false,
      viewer: {
        isLoggedIn: false,
        kycApproved: "unknown",
        walletAddress: null,
        whitelisted: "unknown",
      },
    }),
    warnings: ["chain_unavailable"],
  });
}

function createDashboardDependencies() {
  return {
    commissionLoader: vi.fn().mockResolvedValue({ status: "unavailable" as const }),
    holdingsLoader: vi.fn().mockResolvedValue({
      holdings: [],
      summary: {
        holdingsCount: 0,
        pnlPercent: "0",
        totalInvestedUsdt: "0",
        totalPnlUsdt: "0",
        totalValueUsdt: "0",
      },
      transactions: [],
      warnings: [],
    }),
    kycLoader: vi.fn().mockResolvedValue({
      approved: false,
      notes: null,
      reasonCode: null,
      reviewedAt: null,
      status: null,
    }),
    nicknameRepository: { updateNickname: vi.fn() },
    pointsLoader: vi.fn().mockResolvedValue([]),
    profileLoader: vi.fn().mockResolvedValue({
      id: "viewer-1",
      inviteCode: "INVITE",
      nickname: "Alice",
      referralPoints: 0,
      reputationPoints: 0,
      taskPoints: 0,
      tier: "A",
      totalPoints: 0,
      tradingPoints: 0,
      userType: "investor",
    }),
  };
}
