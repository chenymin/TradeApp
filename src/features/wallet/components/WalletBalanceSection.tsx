import { RefreshCw } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { WalletBalanceLoadResult } from "../domain/walletModels";

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
        <AppText style={styles.heading} variant="body">Balances</AppText>
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
        <View
          accessibilityLabel="Wallet balances loading"
          accessibilityRole="progressbar"
          style={styles.rows}
        >
          {["native", "usdt", "art"].map((id) => (
            <View key={id} testID="wallet-balance-skeleton" style={styles.skeleton} />
          ))}
        </View>
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
                style={styles.amount}
                variant="body"
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
    minHeight: 64,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heading: {
    fontWeight: "800",
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
    backgroundColor: colors.surface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  skeleton: {
    backgroundColor: colors.border,
    height: 64,
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
