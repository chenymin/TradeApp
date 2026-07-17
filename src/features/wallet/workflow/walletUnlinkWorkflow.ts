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
  const canonicalWallet = identity.wallets.find(
    (candidate) => sameAddress(candidate.address, wallet.address),
  );
  if (!canonicalWallet) return false;

  return canonicalWallet.privyLinked &&
    identity.wallets.filter((candidate) => candidate.privyLinked).length > 1 &&
    canonicalWallet.kind === "external" &&
    canonicalWallet.status === "linked" &&
    !sameAddress(canonicalWallet.address, identity.activeAddress);
}

export async function requestWalletUnlink(
  identity: WalletIdentity,
  wallet: WalletUnlinkTarget,
  dependencies: WalletUnlinkDependencies,
): Promise<WalletUnlinkResult> {
  const canonicalWallet = identity.wallets.find(
    (candidate) => sameAddress(candidate.address, wallet.address),
  );
  if (!canonicalWallet || !canUnlinkWallet(identity, wallet)) {
    return "ineligible";
  }

  const confirmed = await dependencies.confirm({
    address: canonicalWallet.address,
    providerLabel: canonicalWallet.providerLabel,
  });
  if (!confirmed) return "cancelled";

  try {
    await dependencies.unlink(canonicalWallet.address);
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
