import type {
  AssetDetailActionInput,
  AssetDetailActionState,
} from "./assetDetailModels";

export function resolveAssetDetailActionState(
  input: AssetDetailActionInput,
): AssetDetailActionState {
  if (input.sale.chainStatus === "loading") {
    return "verifying_sale_status";
  }

  if (
    !input.sale.canTrustForPurchase ||
    input.sale.chainStatus !== "ready" ||
    input.sale.source !== "chain"
  ) {
    return "sale_status_unavailable";
  }

  if (input.soldPercent >= 100) {
    return "sold_out";
  }

  if (input.sale.displayStatus === "completed") {
    return "sale_closed";
  }

  if (!input.isLoggedIn) {
    return "connect_required";
  }

  if (input.kycApproved === false) {
    return "kyc_required";
  }

  if (input.kycApproved === "unknown" || input.whitelisted === "unknown") {
    return "read_only";
  }

  if (!input.whitelisted) {
    return "not_eligible";
  }

  if (input.sale.displayStatus === "upcoming") {
    return "not_started";
  }

  return input.sale.displayStatus === "active" ? "sale_open" : "read_only";
}
