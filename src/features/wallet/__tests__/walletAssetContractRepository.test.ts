import { getAddress } from "viem";
import { describe, expect, it } from "vitest";

import {
  createWalletAssetContractRepository,
  type WalletAssetContractRepositoryClient,
} from "../services/walletAssetContractRepository";

describe("wallet asset contract repository", () => {
  it("returns unique valid ART contracts for the configured chain", async () => {
    const duplicate = `0x${address(1).slice(2).toUpperCase()}`;
    const fake = createFakeClient([
      rawAsset("asset-1", address(1), " ART1 ", ["https://images.test/art.jpg"]),
      rawAsset("asset-2", duplicate, "DUP"),
      rawAsset("asset-3", "invalid", "BAD"),
    ]);

    const result = await createWalletAssetContractRepository(fake.client)
      .fetchByChain(97);

    expect(fake.calls).toContainEqual(["from", "art_assets"]);
    expect(fake.calls).toContainEqual([
      "select",
      "id, symbol, contract_address, artwork_submissions!submission_id(image_urls)",
    ]);
    expect(fake.calls).toContainEqual(["eq", "chain_id", 97]);
    expect(fake.calls).toContainEqual(["eq", "is_deleted", false]);
    expect(result).toEqual([{
      address: getAddress(address(1)),
      id: "asset-1",
      imageUrl: "https://images.test/art.jpg",
      symbol: "ART1",
    }]);
  });

  it("uses stable fallbacks for empty presentation metadata", async () => {
    const result = await createWalletAssetContractRepository(createFakeClient([
      rawAsset("asset-1", address(1), "   ", ["  "]),
    ]).client).fetchByChain(56);

    expect(result).toEqual([{
      address: getAddress(address(1)),
      id: "asset-1",
      imageUrl: null,
      symbol: "ART",
    }]);
  });

  it("normalizes query failures", async () => {
    const repository = createWalletAssetContractRepository(createFakeClient(
      [],
      { message: "permission denied" },
    ).client);

    await expect(repository.fetchByChain(97)).rejects.toThrow(
      "Unable to discover wallet assets: permission denied",
    );
  });
});

function rawAsset(
  id: string,
  contractAddress: string,
  symbol: string,
  imageUrls: string[] = [],
) {
  return {
    artwork_submissions: { image_urls: imageUrls },
    contract_address: contractAddress,
    id,
    symbol,
  };
}

function createFakeClient(
  data: unknown[],
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    select(columns: string) {
      calls.push(["select", columns]);
      return query;
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({ data, error }).then(resolve);
    },
  };

  return {
    calls,
    client: {
      from(table: string) {
        calls.push(["from", table]);
        return query;
      },
    } as unknown as WalletAssetContractRepositoryClient,
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
