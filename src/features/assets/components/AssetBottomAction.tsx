import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, colors, spacing } from "../../../shared/ui";
import type { AssetDetailActionState } from "../domain/assetDetailModels";

const LABELS: Record<AssetDetailActionState, string> = {
  connect_required: "Connect wallet", kyc_required: "Complete KYC", verifying_sale_status: "Verifying sale status", sale_status_unavailable: "Sale status unavailable", not_started: "Sale opens soon", not_eligible: "Not eligible", sale_open: "Subscribe", sold_out: "Sold out", sale_closed: "View market", read_only: "View details",
};

export function AssetBottomAction({ onLogin, onPurchasePreview, onViewMarket, state }: { onLogin(): void; onPurchasePreview(): void; onViewMarket(): void; state: AssetDetailActionState }) {
  const insets = useSafeAreaInsets();
  const enabled = state === "connect_required" || state === "sale_open" || state === "sale_closed";
  const run = () => { if (state === "connect_required") onLogin(); else if (state === "sale_open") onPurchasePreview(); else if (state === "sale_closed") onViewMarket(); };
  return <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}><Button accessibilityLabel={`Asset detail action ${LABELS[state]}`} disabled={!enabled} label={LABELS[state]} onPress={run} /></View>;
}
const styles = StyleSheet.create({ root: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, bottom: 0, left: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, position: "absolute", right: 0 } });
