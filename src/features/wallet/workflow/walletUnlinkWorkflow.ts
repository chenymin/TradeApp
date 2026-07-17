import type { WalletIdentity } from "../domain/walletModels";

export type WalletUnlinkTarget = WalletIdentity["wallets"][number];

export type WalletUnlinkDependencies = {
  confirm(input: {
    address: `0x${string}`;
    providerLabel: string;
  }): Promise<boolean>;
  refreshSession(): Promise<boolean>;
  unlink(address: `0x${string}`): Promise<void>;
};

export type WalletUnlinkResult =
  | "cancelled"
  | "complete"
  | "ineligible"
  | "sync_error"
  | "unlink_error";

export function canUnlinkWallet(
  identity: WalletIdentity,
  wallet: WalletUnlinkTarget,
): boolean {
  const belongsToIdentity = identity.wallets.some(
    (candidate) => sameAddress(candidate.address, wallet.address),
  );

  return belongsToIdentity &&
    identity.wallets.length > 1 &&
    wallet.kind === "external" &&
    wallet.status === "linked" &&
    !sameAddress(wallet.address, identity.activeAddress);
}

export async function requestWalletUnlink(
  identity: WalletIdentity,
  wallet: WalletUnlinkTarget,
  dependencies: WalletUnlinkDependencies,
): Promise<WalletUnlinkResult> {
  if (!canUnlinkWallet(identity, wallet)) return "ineligible";

  const confirmed = await dependencies.confirm({
    address: wallet.address,
    providerLabel: wallet.providerLabel,
  });
  if (!confirmed) return "cancelled";

  try {
    await dependencies.unlink(wallet.address);
  } catch {
    return "unlink_error";
  }

  return retryWalletSync(dependencies);
}

export async function retryWalletSync(
  dependencies: Pick<WalletUnlinkDependencies, "refreshSession">,
): Promise<"complete" | "sync_error"> {
  try {
    return await dependencies.refreshSession() ? "complete" : "sync_error";
  } catch {
    return "sync_error";
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
