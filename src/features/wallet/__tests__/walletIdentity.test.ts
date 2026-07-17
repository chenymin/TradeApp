import { describe, expect, it } from "vitest";

import type { AuthViewer } from "../../auth/domain/authViewer";
import {
  EMPTY_PRIVY_WALLET_METADATA,
  mapPrivyWalletMetadata,
  mapWalletIdentity,
} from "../domain/walletIdentity";

describe("wallet identity", () => {
  it("keeps the wallet-login viewer address authoritative", () => {
    const identity = mapWalletIdentity(
      viewer(address(8)),
      {
        passkeyMfaEnabled: true,
        wallets: [
          wallet(address(9), "embedded"),
          wallet(address(8), "external"),
        ],
      },
    );

    expect(identity?.activeAddress).toBe(address(8));
    expect(identity?.wallets.map(({ address: walletAddress, privyLinked, status }) => ({
      address: walletAddress,
      privyLinked,
      status,
    }))).toEqual([
      { address: address(8), privyLinked: true, status: "active" },
      { address: address(9), privyLinked: true, status: "linked" },
    ]);
    expect(identity?.passkeyMfaEnabled).toBe(true);
  });

  it.each([null, "", "not-an-address"])(
    "does not create identity for %s",
    (walletAddress) => {
      expect(mapWalletIdentity(
        viewer(walletAddress),
        EMPTY_PRIVY_WALLET_METADATA,
      )).toBeNull();
    },
  );

  it("adds a verified active wallet when Privy metadata does not contain it", () => {
    expect(mapWalletIdentity(viewer(address(8)), {
      passkeyMfaEnabled: false,
      wallets: [wallet(address(9), "embedded")],
    })).toEqual({
      activeAddress: address(8),
      passkeyMfaEnabled: false,
      wallets: [
        {
          address: address(8),
          kind: "external",
          privyLinked: false,
          providerLabel: "Verified wallet",
          status: "active",
        },
        {
          address: address(9),
          kind: "embedded",
          privyLinked: true,
          providerLabel: "Privy",
          status: "linked",
        },
      ],
    });
  });

  it("deduplicates linked wallets case-insensitively", () => {
    const lower = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const upper = `0x${lower.slice(2).toUpperCase()}`;
    const identity = mapWalletIdentity(viewer(lower), {
      passkeyMfaEnabled: false,
      wallets: [wallet(lower, "embedded"), wallet(upper, "external")],
    });

    expect(identity?.wallets).toHaveLength(1);
    expect(identity?.wallets[0]).toMatchObject({
      kind: "embedded",
      privyLinked: true,
      status: "active",
    });
  });
});

describe("Privy wallet metadata", () => {
  it("keeps valid EVM wallets and maps passkey MFA", () => {
    expect(mapPrivyWalletMetadata({
      linked_accounts: [
        {
          address: address(8),
          chain_type: "ethereum",
          connector_type: "embedded",
          type: "wallet",
          wallet_client_type: "privy",
        },
        {
          address: address(9),
          chain_type: "ethereum",
          connector_type: "injected",
          type: "wallet",
          wallet_client_type: "metamask",
        },
        { address: "solana-address", chain_type: "solana", type: "wallet" },
        { address: "invalid", chain_type: "ethereum", type: "wallet" },
        { type: "email" },
      ],
      mfa_methods: [{ type: "sms" }, { type: "passkey" }],
    })).toEqual({
      passkeyMfaEnabled: true,
      wallets: [
        wallet(address(8), "embedded"),
        {
          address: address(9),
          kind: "external",
          providerLabel: "metamask",
        },
      ],
    });
  });

  it("returns empty metadata when Privy has no authenticated user", () => {
    expect(mapPrivyWalletMetadata(null)).toEqual(EMPTY_PRIVY_WALLET_METADATA);
  });
});

function viewer(walletAddress: string | null): AuthViewer {
  return { email: null, id: "viewer-1", walletAddress };
}

function wallet(
  walletAddress: string,
  kind: "embedded" | "external",
) {
  return {
    address: walletAddress,
    kind,
    providerLabel: kind === "embedded" ? "Privy" : "External wallet",
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
