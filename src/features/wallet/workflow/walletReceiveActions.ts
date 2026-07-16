import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";

export type WalletClipboardAdapter = {
  setString(value: string): Promise<void>;
};

export type WalletTextShareAdapter = {
  share(input: {
    message: string;
    title: string;
  }): Promise<"cancelled" | "shared">;
};

export type WalletActionResult =
  | "cancelled"
  | "copied"
  | "shared"
  | "unavailable";

export async function copyWalletAddress({
  address,
  clipboard,
}: {
  address: `0x${string}`;
  clipboard: WalletClipboardAdapter;
}): Promise<WalletActionResult> {
  try {
    await clipboard.setString(address);
    return "copied";
  } catch {
    return "unavailable";
  }
}

export async function shareWalletAddress({
  address,
  chain,
  share,
}: {
  address: `0x${string}`;
  chain: PublicChainConfig;
  share: WalletTextShareAdapter;
}): Promise<WalletActionResult> {
  try {
    return await share.share({
      message: `Receive on ${chain.name} only.\n${address}`,
      title: `Receive ${chain.nativeSymbol} wallet assets`,
    });
  } catch {
    return "unavailable";
  }
}
