import { FlatList, SectionList } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { AppText } from "../../../shared/ui";
import type { KycIdentityDetails } from "../domain/kycIdentityDetails";
import type { DashboardKycStatus } from "../services/dashboardKycRepository";
import {
  WhitelistScreen,
  type WhitelistScreenProps,
  type WhitelistStatusState,
} from "../screens/WhitelistScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("WhitelistScreen", () => {
  it.each([
    [null, "Whitelist not started"],
    ["pending", "Complete KYC steps"],
    ["under_review", "Review in progress"],
    ["awaiting_resubmission", "More information required"],
    ["rejected", "Whitelist not approved"],
    ["approved", "Whitelist approved"],
  ] as const)("renders %s status", async (status, expected) => {
    const renderer = await renderWhitelist({ statusState: readyKyc(status) });

    expect(JSON.stringify(renderer.toJSON())).toContain(expected);
  });

  it("renders a status error separately from not-started", async () => {
    const renderer = await renderWhitelist({ statusState: { status: "error" } });
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("Whitelist status unavailable");
    expect(output).not.toContain("Whitelist not started");
  });

  it("renders an explicit loading state", async () => {
    const renderer = await renderWhitelist({ statusState: { status: "loading" } });

    expect(JSON.stringify(renderer.toJSON())).toContain("Loading whitelist status");
  });

  it.each([
    null,
    "pending",
    "under_review",
    "awaiting_resubmission",
    "rejected",
  ] as const)("does not request identity for %s", async (status) => {
    const identityClient = { fetchDetails: vi.fn() };
    const fetchAccessToken = vi.fn();

    await renderWhitelist({
      fetchAccessToken,
      identityClient,
      statusState: readyKyc(status),
    });

    expect(fetchAccessToken).not.toHaveBeenCalled();
    expect(identityClient.fetchDetails).not.toHaveBeenCalled();
  });

  it("loads approved identity with the access token and masks the document", async () => {
    const identityClient = {
      fetchDetails: vi.fn().mockResolvedValue(identityFixture),
    };
    const renderer = await renderWhitelist({
      identityClient,
      statusState: readyKyc("approved"),
    });
    const output = JSON.stringify(renderer.toJSON());

    expect(identityClient.fetchDetails).toHaveBeenCalledWith("access-token");
    expect(output).toContain("4301**********8817");
    expect(output).not.toContain("430181200212308817");
    expect(output).toContain("KYC verification");
    expect(output).toContain("Verification date");
    expect(output).toContain("Valid until");
    expect(output).toContain("Name");
    expect(output).toContain("Country / region");
    expect(output).toContain("Document type");
    expect(output).toContain("Document number");
    expect(output).toContain("Date of birth");
    expect(output).toContain("Permanent");
  });

  it("shows unavailable for an invalid verification date", async () => {
    const renderer = await renderWhitelist({
      statusState: readyKyc("approved", "invalid-date"),
    });

    expect(JSON.stringify(renderer.toJSON())).toContain("Unavailable");
  });

  it("keeps approved status visible when identity fails and retries only identity", async () => {
    const onRefreshCommon = vi.fn().mockResolvedValue(undefined);
    const identityClient = {
      fetchDetails: vi.fn()
        .mockRejectedValueOnce(new Error("unavailable"))
        .mockResolvedValueOnce(identityFixture),
    };
    const renderer = await renderWhitelist({
      identityClient,
      onRefreshCommon,
      statusState: readyKyc("approved"),
    });

    expect(JSON.stringify(renderer.toJSON())).toContain("Identity details unavailable");
    expect(JSON.stringify(renderer.toJSON())).toContain("Whitelist approved");

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: "Retry identity details",
      }).props.onPress();
    });

    expect(identityClient.fetchDetails).toHaveBeenCalledTimes(2);
    expect(onRefreshCommon).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Test User");
  });

  it("refreshes common and approved identity data together", async () => {
    const onRefreshCommon = vi.fn().mockResolvedValue(undefined);
    const identityClient = {
      fetchDetails: vi.fn().mockResolvedValue(identityFixture),
    };
    const renderer = await renderWhitelist({ identityClient, onRefreshCommon });

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: "Refresh dashboard",
      }).props.onPress();
    });

    expect(onRefreshCommon).toHaveBeenCalledOnce();
    expect(identityClient.fetchDetails).toHaveBeenCalledTimes(2);
  });

  it("discards identity when the viewer changes", async () => {
    let resolveSecond!: (value: KycIdentityDetails) => void;
    const second = new Promise<KycIdentityDetails>((resolve) => {
      resolveSecond = resolve;
    });
    const identityClient = {
      fetchDetails: vi.fn()
        .mockResolvedValueOnce(identityFixture)
        .mockReturnValueOnce(second),
    };
    const firstProps = createProps({ identityClient, viewerId: "viewer-1" });
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(<WhitelistScreen {...firstProps} />);
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer!.toJSON())).toContain("Test User");

    await act(async () => {
      renderer!.update(
        <WhitelistScreen
          {...createProps({ identityClient, viewerId: "viewer-2" })}
        />,
      );
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer!.toJSON())).not.toContain("Test User");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Loading identity details");

    await act(async () => {
      resolveSecond({ ...identityFixture, fullName: "Second Viewer" });
      await second;
    });
    expect(JSON.stringify(renderer!.toJSON())).toContain("Second Viewer");
  });

  it("ignores a late identity result after unmount", async () => {
    let resolveDetails!: (value: KycIdentityDetails) => void;
    const pending = new Promise<KycIdentityDetails>((resolve) => {
      resolveDetails = resolve;
    });
    const renderer = await renderWhitelist({
      identityClient: { fetchDetails: vi.fn().mockReturnValue(pending) },
    });

    await act(async () => renderer.unmount());
    await act(async () => {
      resolveDetails(identityFixture);
      await pending;
    });
  });

  it("uses one vertical virtualized list with stable fact ids", async () => {
    const renderer = await renderWhitelist();

    expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);
    expect(renderer.root.findAllByType(SectionList)).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: "whitelist-row-status:verification" }))
      .toBeTruthy();
    expect(renderer.root.findByProps({ testID: "whitelist-row-identity:document-number" }))
      .toBeTruthy();
  });
});

async function renderWhitelist(
  overrides: Partial<WhitelistScreenProps> = {},
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(
      <WhitelistScreen {...createProps(overrides)} />,
    );
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Expected WhitelistScreen to mount");
  return renderer;
}

function createProps(
  overrides: Partial<WhitelistScreenProps> = {},
): WhitelistScreenProps {
  return {
    fetchAccessToken: vi.fn().mockResolvedValue("access-token"),
    identityClient: {
      fetchDetails: vi.fn().mockResolvedValue(identityFixture),
    },
    onRefreshCommon: vi.fn().mockResolvedValue(undefined),
    renderHeader: (refresh) => (
      <AppText
        accessibilityLabel="Refresh dashboard"
        onPress={refresh}
      >
        Dashboard shared header
      </AppText>
    ),
    statusState: readyKyc("approved"),
    viewerId: "viewer-1",
    ...overrides,
  };
}

function readyKyc(
  status: DashboardKycStatus,
  reviewedAt = "2026-07-10T00:00:00Z",
): WhitelistStatusState {
  return {
    data: {
      approved: status === "approved",
      notes: null,
      reasonCode: null,
      reviewedAt,
      status,
    },
    status: "ready",
  };
}

const identityFixture: KycIdentityDetails = {
  country: "China",
  dateOfBirth: "2002-12-30",
  docNumber: "430181200212308817",
  docType: "Identity card",
  fullName: "Test User",
};
