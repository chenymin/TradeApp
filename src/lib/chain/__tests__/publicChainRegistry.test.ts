import { describe, expect, it } from "vitest";

import {
  getPublicChainClient,
  getPublicChainConfig,
  getUsdtAddress,
} from "../publicChainRegistry";

describe("publicChainRegistry", () => {
  it.each([
    [
      56,
      "BNB Smart Chain",
      "https://bscscan.com",
      "0x55d398326f99059fF775485246999027B3197955",
    ],
    [
      97,
      "BNB Smart Chain Testnet",
      "https://testnet.bscscan.com",
      "0xd47c26E0D9657f654675F58E5EaF450d707a3F9e",
    ],
  ] as const)(
    "returns metadata for chain %s",
    (chainId, name, explorerOrigin, usdtAddress) => {
      expect(getPublicChainConfig(chainId)).toEqual({
        chainId,
        explorerOrigin,
        name,
        nativeDecimals: 18,
        nativeSymbol: "BNB",
        usdtAddress,
      });
    },
  );

  it("rejects unsupported chains", () => {
    expect(() => getPublicChainConfig(1)).toThrow(
      "Unsupported public chain: 1",
    );
    expect(() => getPublicChainClient(1)).toThrow(
      "Unsupported public chain: 1",
    );
  });

  it("keeps compatible USDT lookup behavior", () => {
    expect(getUsdtAddress(56)).toBe(getPublicChainConfig(56).usdtAddress);
    expect(getUsdtAddress(97)).toBe(getPublicChainConfig(97).usdtAddress);
    expect(getUsdtAddress(1)).toBeNull();
  });

  it("caches public clients by supported chain", () => {
    expect(getPublicChainClient(56)).toBe(getPublicChainClient(56));
    expect(getPublicChainClient(97)).toBe(getPublicChainClient(97));
    expect(getPublicChainClient(56)).not.toBe(getPublicChainClient(97));
  });
});
