import { FlatList } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { DashboardScreen } from "../screens/DashboardScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("DashboardScreen", () => {
  it("renders the approved Dashboard tabs in exact order", async () => {
    const renderer = await renderDashboard();
    const tabs = renderer.root.findAll(
      (node) => typeof node.type === "string" &&
        node.props.accessibilityRole === "tab",
    );

    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
      "Holdings",
      "Transactions",
      "Whitelist",
      "Rewards",
    ]);
  });

  it("keeps four-tab touch targets and labels usable at phone width", async () => {
    const renderer = await renderDashboard();
    const transactionsTab = renderer.root.findAll(
      (node) => typeof node.type === "string" &&
        node.props.accessibilityLabel === "Transactions",
    )[0];
    const label = transactionsTab.findAll(
      (node) => typeof node.type === "string" &&
        node.children.includes("Transactions"),
    )[0];

    expect(flattenStyle(transactionsTab.props.style).minHeight)
      .toBeGreaterThanOrEqual(40);
    expect(flattenStyle(label.props.style).fontSize).toBeLessThanOrEqual(12);
  });

  it("embeds Whitelist and Rewards under the common Dashboard header", async () => {
    const dependencies = createDependencies();
    const renderer = await renderDashboard(dependencies);

    await press(renderer, "Whitelist");
    let output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Whitelist approved");
    expect(output).toContain("Alice");
    expect(output).toContain("4301**********8817");

    await press(renderer, "Rewards");
    output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("Total points");
    expect(output).toContain("friend@example.com");
    expect(output).toContain("Alice");
    expect(output).not.toContain("My Rewards");
    expect(dependencies.rewardsDependencies.kycLoader).not.toHaveBeenCalled();
  });

  it("keeps exactly one active vertical virtualized list", async () => {
    const renderer = await renderDashboard();

    expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);
    await press(renderer, "Transactions");
    expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);
    await press(renderer, "Whitelist");
    expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);
    await press(renderer, "Rewards");
    expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);
    await press(renderer, "Rewards tab Points");
    expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);
  });

  it("keeps horizontal content padding consistent across Dashboard tabs", async () => {
    const renderer = await renderDashboard();
    const activePadding = () => flattenStyle(
      renderer.root.findByType(FlatList).props.contentContainerStyle,
    ).paddingHorizontal;

    expect(activePadding()).toBe(16);
    await press(renderer, "Transactions");
    expect(activePadding()).toBe(16);
    await press(renderer, "Whitelist");
    expect(activePadding()).toBe(16);
    await press(renderer, "Rewards");
    expect(activePadding()).toBe(16);
  });

  it.each([
    ["holdings", "Artwork"],
    ["whitelist", "Whitelist approved"],
    ["rewards", "Total points"],
  ] as const)("starts on %s when requested", async (initialTab, expected) => {
    const renderer = await renderDashboard(createDependencies(), { initialTab });

    expect(JSON.stringify(renderer.toJSON())).toContain(expected);
    expect(renderer.root.findByProps({ accessibilityLabel: initialTabLabel(initialTab) })
      .props.accessibilityState).toEqual({ selected: true });
  });

  it("does not convert a KYC repository error into not started", async () => {
    const dependencies = createDependencies();
    dependencies.kycLoader = vi.fn().mockRejectedValue(new Error("unavailable"));
    const renderer = await renderDashboard(dependencies, { initialTab: "whitelist" });
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Whitelist status unavailable");
    expect(output).not.toContain("Whitelist not started");
  });

  it("unmounts Whitelist and reloads identity after switching away", async () => {
    let resolveSecond!: (value: typeof identityFixture) => void;
    const second = new Promise<typeof identityFixture>((resolve) => {
      resolveSecond = resolve;
    });
    const dependencies = createDependencies();
    dependencies.identityClient.fetchDetails = vi.fn()
      .mockResolvedValueOnce(identityFixture)
      .mockReturnValueOnce(second);
    const renderer = await renderDashboard(dependencies, { initialTab: "whitelist" });

    expect(JSON.stringify(renderer.toJSON())).toContain("Test User");
    await press(renderer, "Holdings");
    await press(renderer, "Whitelist");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Test User");
    expect(JSON.stringify(renderer.toJSON())).toContain("Loading identity details");

    await act(async () => {
      resolveSecond({ ...identityFixture, fullName: "Reloaded User" });
      await second;
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Reloaded User");
  });

  it("renders profile, portfolio summary, holdings, and KYC status", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen {...dependencies} viewerState={viewerState()} />,
      );
      await Promise.resolve();
    });

    const output = JSON.stringify(renderer?.toJSON());
    expect(output).toContain("Dashboard");
    expect(output).toContain("Alice");
    expect(output).toContain("$60.00");
    expect(output).toContain("Tier A");
    expect(output).toContain("34.50 points");
    expect(output).toContain("Verified");
    expect(output).toContain("Artwork");
    expect(output).not.toContain("Feature placeholder");
    expect(renderer!.root.findByProps({ accessibilityLabel: "Portfolio value metric" })).toBeTruthy();
    expect(renderer!.root.findByProps({ accessibilityLabel: "Total PnL metric" })).toBeTruthy();
    expect(renderer!.root.findByProps({ accessibilityLabel: "Tier and points metric" })).toBeTruthy();
    expect(renderer!.root.findByProps({ accessibilityLabel: "KYC metric" })).toBeTruthy();
    expect(renderer!.root.findByProps({ accessibilityLabel: "Commission summary" })).toBeTruthy();
  });

  it("switches to transactions and opens only validated explorer URLs", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen {...dependencies} viewerState={viewerState()} />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Transactions" }).props.onPress();
    });
    expect(JSON.stringify(renderer?.toJSON())).toContain("Buy");

    await act(async () => {
      await renderer!.root.findByProps({ accessibilityLabel: "Open transaction event-1" })
        .props.onPress();
    });
    expect(dependencies.externalLinkAdapter.open).toHaveBeenCalledWith(
      `https://testnet.bscscan.com/tx/0x${"a".repeat(64)}`,
    );
  });

  it("keeps the commission summary without duplicating reward point history", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen {...dependencies} viewerState={viewerState()} />,
      );
      await Promise.resolve();
    });

    expect(JSON.stringify(renderer?.toJSON())).toContain("$12.50 lifetime");
    expect(renderer!.root.findAllByProps({ accessibilityLabel: "Points" })).toHaveLength(0);
    expect(JSON.stringify(renderer?.toJSON())).not.toContain("Trading points");
  });

  it("edits the nickname without action buttons and saves once", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen {...dependencies} viewerState={viewerState()} />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Edit nickname" }).props.onPress();
    });

    expect(JSON.stringify(renderer!.toJSON())).not.toContain("Save");
    expect(JSON.stringify(renderer!.toJSON())).not.toContain("Cancel");

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Nickname" }).props.onChangeText("Alicia");
    });

    await act(async () => {
      const input = renderer!.root.findByProps({ accessibilityLabel: "Nickname" });
      input.props.onSubmitEditing();
      input.props.onBlur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(dependencies.nicknameRepository.updateNickname).toHaveBeenCalledTimes(1);
    expect(dependencies.nicknameRepository.updateNickname).toHaveBeenCalledWith("Alicia");
  });

  it("closes unchanged nickname editing without a write", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen {...dependencies} viewerState={viewerState()} />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Edit nickname" }).props.onPress();
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Nickname" }).props.onBlur();
      await Promise.resolve();
    });

    expect(dependencies.nicknameRepository.updateNickname).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ accessibilityLabel: "Nickname" })).toHaveLength(0);
  });

  it("saves the nickname when the dashboard background is pressed", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen {...dependencies} viewerState={viewerState()} />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Edit nickname" }).props.onPress();
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Nickname" }).props.onChangeText("Alicia");
    });

    await act(async () => {
      renderer!.root.findByProps({ testID: "dashboard-dismiss-surface" }).props.onTouchStart();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(dependencies.nicknameRepository.updateNickname).toHaveBeenCalledTimes(1);
    expect(dependencies.nicknameRepository.updateNickname).toHaveBeenCalledWith("Alicia");
    expect(renderer!.root.findAllByProps({ accessibilityLabel: "Nickname" })).toHaveLength(0);
  });

  it("shows session unavailable without running private loaders", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen
          {...dependencies}
          viewerState={{ isSessionReady: false, viewer: null }}
        />,
      );
      await Promise.resolve();
    });

    expect(JSON.stringify(renderer?.toJSON())).toContain("Session unavailable");
    expect(dependencies.profileLoader).not.toHaveBeenCalled();
    expect(dependencies.holdingsLoader).not.toHaveBeenCalled();
  });
});

async function renderDashboard(
  dependencies = createDependencies(),
  props: { initialTab?: "holdings" | "transactions" | "whitelist" | "rewards" } = {},
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(
      <DashboardScreen
        {...dependencies}
        {...props}
        viewerState={viewerState()}
      />,
    );
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Expected DashboardScreen to mount");
  return renderer;
}

async function press(renderer: ReactTestRenderer, accessibilityLabel: string) {
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel }).props.onPress();
    await Promise.resolve();
  });
}

function initialTabLabel(tab: "holdings" | "transactions" | "whitelist" | "rewards") {
  return tab[0].toUpperCase() + tab.slice(1);
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!Array.isArray(style)) {
    return style && typeof style === "object" ? style as Record<string, unknown> : {};
  }
  return Object.assign({}, ...style.map(flattenStyle));
}

function createDependencies() {
  return {
    commissionLoader: vi.fn().mockResolvedValue({
      status: "ready" as const,
      summary: {
        disputedTotalUsdt: "0",
        lifetimeTotalUsdt: "12.5",
        paidTotalUsdt: "5",
        paymentPendingTotalUsdt: "0",
        referredBuyerCount: 2,
        referredMintTotalUsdt: "100",
        reviewPendingTotalUsdt: "7.5",
        userConfirmationPendingTotalUsdt: "0",
      },
    }),
    externalLinkAdapter: { open: vi.fn().mockResolvedValue("opened" as const) },
    fetchAccessToken: vi.fn().mockResolvedValue("access-token"),
    holdingsLoader: vi.fn().mockResolvedValue({
      holdings: [{
        assetId: "asset-1",
        avgBuyPriceUsdt: "13",
        currentPriceUsdt: "15",
        currentShares: "4",
        gainPercent: "15.384615384615384615",
        imageUrl: null,
        symbol: "ART",
        title: "Artwork",
        valueUsdt: "60",
      }],
      summary: {
        holdingsCount: 1,
        pnlPercent: "15.384615384615384615",
        totalInvestedUsdt: "52",
        totalPnlUsdt: "8",
        totalValueUsdt: "60",
      },
      transactions: [{
        amountUsdt: "20",
        assetId: "asset-1",
        chainId: 97,
        explorerUrl: `https://testnet.bscscan.com/tx/0x${"a".repeat(64)}`,
        id: "event-1",
        priceUsdt: "10",
        shares: "2",
        symbol: "ART",
        timestamp: "2026-07-15T00:00:00.000Z",
        txHash: `0x${"a".repeat(64)}`,
        type: "buy" as const,
      }],
      warnings: [],
    }),
    kycLoader: vi.fn().mockResolvedValue({
      approved: true,
      notes: null,
      reasonCode: null,
      reviewedAt: null,
      status: "approved" as const,
    }),
    identityClient: {
      fetchDetails: vi.fn().mockResolvedValue(identityFixture),
    },
    nicknameRepository: { updateNickname: vi.fn() },
    profileLoader: vi.fn().mockResolvedValue({
      id: "viewer-1",
      inviteCode: "INVITE",
      nickname: "Alice",
      referralPoints: 10,
      reputationPoints: 0,
      taskPoints: 0,
      tier: "A",
      totalPoints: 34.5,
      tradingPoints: 24.5,
      userType: "investor",
    }),
    rewardsDependencies: {
      fetchAccessToken: vi.fn().mockResolvedValue("access-token"),
      kycLoader: vi.fn().mockResolvedValue({
        approved: true,
        notes: null,
        reasonCode: null,
        reviewedAt: "2026-07-10T00:00:00Z",
        status: "approved" as const,
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
          referredTier: "C" as const,
          referredUserType: "collector" as const,
          referredWalletAddress: null,
          status: "waiting_kyc" as const,
          totalPointsAwarded: 25,
        }]),
      },
      rewardsProfileRepository: {
        fetchProfile: vi.fn().mockResolvedValue({
          id: "viewer-1",
          inviteCode: "INVITE",
          referralPoints: 10,
          reputationPoints: 0,
          taskPoints: 0,
          tier: "A" as const,
          totalPoints: 34.5,
          tradingPoints: 24.5,
          userType: "investor" as const,
        }),
      },
    },
  };
}

const identityFixture = {
  country: "China",
  dateOfBirth: "2002-12-30",
  docNumber: "430181200212308817",
  docType: "Identity card",
  fullName: "Test User",
};

function viewerState() {
  return {
    isSessionReady: true,
    viewer: {
      email: "viewer@example.com",
      id: "viewer-1",
      walletAddress: "0x0000000000000000000000000000000000000008",
    },
  };
}
