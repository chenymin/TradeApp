import { RefreshCw } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { WalletBalanceLoadResult } from "../domain/walletModels";
import { WalletBalanceSkeleton } from "./WalletBalanceSkeleton";

export type WalletLoadState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { data: WalletBalanceLoadResult; status: "ready" }
  | { status: "error" };

export function WalletBalanceSection({
  onRefresh,
  state,
}: {
  onRefresh: () => void;
  state: WalletLoadState;
}) {
  return (
    <View accessibilityLabel="Wallet balances" style={styles.section}>
      <View style={styles.header}>
        <AppText variant="sectionTitle">Balances</AppText>
        {state.status === "ready" || state.status === "error" ? (
          <Pressable
            accessibilityLabel="Refresh wallet balances"
            onPress={onRefresh}
            style={styles.refresh}
          >
            <RefreshCw color={colors.primary} size={18} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {state.status === "loading" ? (
        <WalletBalanceSkeleton />
      ) : state.status === "error" ? (
        <AppText variant="body">Balances unavailable</AppText>
      ) : state.status === "ready" ? (
        <View style={styles.rows}>
          {state.data.rows.map((row) => (
            <View key={row.id} style={styles.balanceRow}>
              <View style={styles.tokenDetails}>
                <AppText style={styles.symbol} variant="body">{row.symbol}</AppText>
                <AppText numberOfLines={1} variant="caption">
                  {row.contractAddress
                    ? `${row.contractAddress.slice(0, 8)}...${row.contractAddress.slice(-6)}`
                    : "Native token"}
                </AppText>
              </View>
              <AppText
                adjustsFontSizeToFit
                minimumFontScale={0.68}
                numberOfLines={1}
                numeric
                style={styles.amount}
                variant="numberRow"
              >
                {row.status === "ready" ? row.displayAmount : "Unavailable"}
              </AppText>
            </View>
          ))}
          {state.data.artDiscoveryStatus === "unavailable" ? (
            <AppText style={styles.warning} variant="caption">
              ART token discovery unavailable
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    flexShrink: 1,
    fontWeight: "800",
    maxWidth: "52%",
    textAlign: "right",
  },
  balanceRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 72,
    paddingVertical: spacing.sm,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  refresh: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  rows: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  symbol: {
    fontWeight: "800",
  },
  tokenDetails: {
    flex: 1,
    minWidth: 0,
  },
  warning: {
    color: colors.danger,
    paddingVertical: spacing.sm,
  },
});
