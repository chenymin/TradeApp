import { StyleSheet, View } from "react-native";

import {
  SkeletonBlock,
  SkeletonGroup,
  colors,
  radii,
  spacing,
} from "../../../shared/ui";

export function WalletBalanceSkeleton() {
  return (
    <SkeletonGroup accessibilityLabel="Wallet balances loading">
      <BalanceRowSkeleton />
      <BalanceRowSkeleton />
      <BalanceRowSkeleton />
    </SkeletonGroup>
  );
}

function BalanceRowSkeleton() {
  return (
    <View style={styles.row} testID="wallet-balance-skeleton-row">
      <View style={styles.identity}>
        <SkeletonBlock
          height={16}
          radius={radii.sm}
          testID="wallet-balance-skeleton-identity"
          tone="strong"
          width="44%"
        />
        <SkeletonBlock
          height={12}
          radius={radii.sm}
          testID="wallet-balance-skeleton-subtitle"
          width="72%"
        />
      </View>
      <SkeletonBlock
        height={20}
        radius={radii.sm}
        testID="wallet-balance-skeleton-amount"
        tone="strong"
        width={96}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    paddingRight: spacing.md,
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 72,
    paddingVertical: spacing.sm,
  },
});
