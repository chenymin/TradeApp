import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { DashboardScreen } from "../screens/DashboardScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("DashboardScreen", () => {
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

  it("shows commission summary and recent point transactions", async () => {
    const dependencies = createDependencies();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardScreen {...dependencies} viewerState={viewerState()} />,
      );
      await Promise.resolve();
    });

    expect(JSON.stringify(renderer?.toJSON())).toContain("$12.50 lifetime");

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: "Points" }).props.onPress();
    });
    const output = JSON.stringify(renderer?.toJSON());
    expect(output).toContain("Trading points");
    expect(output).toContain("-2.50");
    expect(output).toContain("Balance ");
    expect(output).toContain("10.25");
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
    nicknameRepository: { updateNickname: vi.fn() },
    pointsLoader: vi.fn().mockResolvedValue([{
      amount: "-2.5",
      balanceAfter: "10.25",
      createdAt: "2026-07-15T00:00:00.000Z",
      id: "point-1",
      pointType: "trading",
      source: "mint",
    }]),
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
  };
}

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
