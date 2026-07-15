const EXPLORER_BASE_URLS = new Map<number, string>([
  [56, "https://bscscan.com"],
  [97, "https://testnet.bscscan.com"],
]);

export function getDashboardTransactionUrl(
  txHash: string,
  chainId: number | null,
): string | null {
  const baseUrl = chainId === null ? null : EXPLORER_BASE_URLS.get(chainId);

  if (!baseUrl || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return null;
  }

  return `${baseUrl}/tx/${txHash}`;
}
