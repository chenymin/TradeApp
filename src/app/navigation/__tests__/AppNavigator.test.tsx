import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  findByProps,
  getPressHandler,
  renderElement,
  textContent,
} from "../../../test/renderElement";
import type { PublicAssetPageLoader, PublicAssetSummary } from "../../../features/assets/domain/assetModels";
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

  it("renders real public asset tabs and opens the asset detail placeholder", async () => {
    const loader = createAssetLoader([assetSummary()]);
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          assetPageLoader={loader}
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
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Asset details for asset-1");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Tab Market" }).props.onPress();
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("艺术资产市场");
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "completed" }));
  });

  it("renders authenticated users into global tabs with Dashboard active", () => {
    let testRenderer: ReactTestRenderer | undefined;

    act(() => {
      testRenderer = TestRenderer.create(
        <AppNavigator actions={createActions()} state={{ status: "authenticated" }} />,
      );
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
    expect(treeText).not.toContain("Portfolio");
    expect(testRenderer.root.findByProps({ accessibilityLabel: "Header title Home" })).toBeTruthy();
    expect(testRenderer.root.findByProps({ accessibilityLabel: "Wallet status" })).toBeTruthy();
    expect(testRenderer.root.findByProps({ accessibilityLabel: "Tab Dashboard" }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("switches protected tabs to My when the profile tab is pressed", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator actions={createActions()} state={{ status: "authenticated" }} />,
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
          state={{ status: "authenticated" }}
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

  it("opens an invite friend sheet from profile", async () => {
    let testRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <AppNavigator
          actions={createActions()}
          initialRouteName="profile"
          state={{ status: "authenticated" }}
        />,
      );
    });

    if (!testRenderer) {
      throw new Error("Expected AppNavigator test renderer to mount");
    }
    const renderer = testRenderer;

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Profile item 邀请好友" }).props.onPress();
    });

    expect(renderer.root.findByProps({ accessibilityLabel: "Invite friends overlay" }).props.style).toMatchObject({
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Invite friends");
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "https://app.mytrade.local/register?ref=DEMO-CODE&type=investor",
    );
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
