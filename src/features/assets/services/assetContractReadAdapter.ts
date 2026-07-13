import { hasSupportedContractAddress } from "../domain/assetDisplayStatus";
import type { AssetChainReadState, AssetDatabaseRow } from "../domain/assetModels";

const ASSET_LIST_ABI = [
  viewFunction("saleActive", "bool"),
  viewFunction("sold", "uint256"),
  viewFunction("SALE_CAP", "uint256"),
  viewFunction("saleStartTime", "uint256"),
  viewFunction("saleEndTime", "uint256"),
] as const;

const FUNCTION_NAMES = [
  "saleActive",
  "sold",
  "SALE_CAP",
  "saleStartTime",
  "saleEndTime",
] as const;

const EMPTY_CHAIN_STATE: AssetChainReadState = {
  saleActive: false,
  saleCap: 0n,
  saleEndTime: 0n,
  saleStartTime: 0n,
  sold: 0n,
  status: "error",
};

type MulticallResult =
  | { result: unknown; status: "success" }
  | { error?: unknown; status: "failure" };

export type AssetReadClient = {
  multicall(input: {
    allowFailure: true;
    contracts: Array<{
      abi: typeof ASSET_LIST_ABI;
      address: `0x${string}`;
      functionName: (typeof FUNCTION_NAMES)[number];
    }>;
  }): Promise<MulticallResult[]>;
};

export type AssetContractReadAdapter = {
  readListState(rows: AssetDatabaseRow[]): Promise<Map<string, AssetChainReadState>>;
};

export function createAssetContractReadAdapter({
  createClient,
}: {
  createClient(chainId: number): AssetReadClient;
}): AssetContractReadAdapter {
  return {
    async readListState(rows) {
      const states = new Map<string, AssetChainReadState>();
      const groups = new Map<number, AssetDatabaseRow[]>();

      for (const row of rows) {
        if (!hasSupportedContractAddress(row.contractAddress)) {
          states.set(row.id, { ...EMPTY_CHAIN_STATE, status: "unsupported" });
          continue;
        }

        const chainId = row.chainId ?? 97;
        groups.set(chainId, [...(groups.get(chainId) ?? []), row]);
      }

      await Promise.all([...groups.entries()].map(async ([chainId, assets]) => {
        try {
          const results = await createClient(chainId).multicall({
            allowFailure: true,
            contracts: assets.flatMap((asset) => FUNCTION_NAMES.map((functionName) => ({
              abi: ASSET_LIST_ABI,
              address: asset.contractAddress as `0x${string}`,
              functionName,
            }))),
          });

          assets.forEach((asset, index) => {
            states.set(asset.id, mapResultSlice(results.slice(index * 5, index * 5 + 5)));
          });
        } catch {
          assets.forEach((asset) => states.set(asset.id, { ...EMPTY_CHAIN_STATE }));
        }
      }));

      return states;
    },
  };
}

function mapResultSlice(results: MulticallResult[]): AssetChainReadState {
  if (results.length !== 5 || results.some((result) => result.status !== "success")) {
    return { ...EMPTY_CHAIN_STATE };
  }

  const values = results.map((result) => result.status === "success" ? result.result : undefined);
  const [saleActive, sold, saleCap, saleStartTime, saleEndTime] = values;

  if (
    typeof saleActive !== "boolean" ||
    typeof sold !== "bigint" ||
    typeof saleCap !== "bigint" ||
    typeof saleStartTime !== "bigint" ||
    typeof saleEndTime !== "bigint"
  ) {
    return { ...EMPTY_CHAIN_STATE };
  }

  return {
    saleActive,
    saleCap,
    saleEndTime,
    saleStartTime,
    sold,
    status: "ready",
  };
}

function viewFunction(name: string, outputType: "bool" | "uint256") {
  return {
    inputs: [],
    name,
    outputs: [{ type: outputType }],
    stateMutability: "view",
    type: "function",
  } as const;
}
