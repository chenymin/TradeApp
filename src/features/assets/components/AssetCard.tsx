import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { PublicAssetSummary } from "../domain/assetModels";

const STATUS_LABELS: Record<PublicAssetSummary["saleStatus"], string> = {
  active: "进行中",
  completed: "已完成",
  paused: "已完成",
  sold_out: "已售罄",
  upcoming: "即将开始",
};

export function AssetCard({
  asset,
  onPress,
}: {
  asset: PublicAssetSummary;
  onPress(asset: PublicAssetSummary): void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Open asset ${asset.title}`}
      onPress={() => onPress(asset)}
      style={styles.card}
    >
      {asset.imageUrl ? (
        <Image
          accessibilityLabel={`Asset image ${asset.title}`}
          resizeMode="cover"
          source={{ uri: asset.imageUrl }}
          style={styles.image}
        />
      ) : (
        <View
          accessibilityLabel={`Asset image placeholder ${asset.title}`}
          style={styles.imagePlaceholder}
        >
          <AppText variant="caption">ART ASSET</AppText>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.topLine}>
          <View style={styles.statusPill}>
            <AppText style={styles.statusText} variant="caption">
              {STATUS_LABELS[asset.saleStatus]}
            </AppText>
          </View>
          <AppText style={styles.tokenCode} variant="caption">
            {asset.tokenCode}
          </AppText>
        </View>

        <View style={styles.titleGroup}>
          <AppText variant="caption">{asset.artistName}</AppText>
          <AppText style={styles.title}>{asset.title}</AppText>
        </View>

        <View style={styles.valueRow}>
          <Value label="当前价格" value={asset.priceText} />
          <Value label="可购份额" value={asset.availableSharesText} align="right" />
        </View>

        <View style={styles.progressGroup}>
          <View style={styles.progressLabels}>
            <AppText variant="caption">发售进度</AppText>
            <AppText style={styles.progressValue} variant="caption">
              {asset.progressPercent}%
            </AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${asset.progressPercent}%` }]} />
          </View>
        </View>

        <View style={styles.footer}>
          <AppText variant="caption">{asset.participantsCount} 位参与者</AppText>
          <AppText variant="caption">{asset.remainingTimeText ?? "时间待确认"}</AppText>
        </View>

        {asset.chainStatus === "error" ? (
          <AppText style={styles.chainWarning} variant="caption">
            链上状态待确认
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function Value({
  align = "left",
  label,
  value,
}: {
  align?: "left" | "right";
  label: string;
  value: string;
}) {
  return (
    <View style={align === "right" ? styles.valueRight : styles.valueLeft}>
      <AppText variant="caption">{label}</AppText>
      <AppText style={styles.valueText}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  chainWarning: {
    color: colors.champagne,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  image: {
    aspectRatio: 1.6,
    backgroundColor: colors.surfaceMuted,
    width: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    aspectRatio: 1.6,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    width: "100%",
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: 6,
  },
  progressGroup: {
    gap: spacing.sm,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    height: 6,
    overflow: "hidden",
  },
  progressValue: {
    color: colors.primary,
    fontWeight: "700",
  },
  statusPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.primary,
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  titleGroup: {
    gap: spacing.xs,
  },
  tokenCode: {
    color: colors.champagne,
    fontWeight: "700",
  },
  topLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  valueLeft: {
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  valueRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  valueText: {
    fontWeight: "700",
  },
});
