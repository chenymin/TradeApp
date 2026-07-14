import { Image, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { AssetDetailReadModel } from "../domain/assetDetailModels";

const STATUS_LABELS: Record<AssetDetailReadModel["saleStatus"], string> = {
  active: "进行中",
  completed: "已完成",
  paused: "已暂停",
  sold_out: "已售罄",
  upcoming: "即将开始",
};

export function AssetHero({ detail }: { detail: AssetDetailReadModel }) {
  return (
    <View style={styles.root}>
      {detail.imageUrl ? (
        <Image accessibilityLabel={`Asset image ${detail.title}`} resizeMode="cover" source={{ uri: detail.imageUrl }} style={styles.image} />
      ) : (
        <View accessibilityLabel={`Asset image placeholder ${detail.title}`} style={styles.placeholder}>
          <AppText variant="caption">TOKENIZED ART</AppText>
        </View>
      )}
      <View style={styles.heading}>
        <View style={styles.badges}>
          <View style={styles.status}><AppText style={styles.statusText} variant="caption">{STATUS_LABELS[detail.saleStatus]}</AppText></View>
          <AppText style={styles.token} variant="caption">{detail.tokenCode}</AppText>
        </View>
        <AppText variant="caption">{detail.artistName}</AppText>
        <AppText style={styles.title}>{detail.title}</AppText>
        <AppText style={styles.price}>{detail.priceText}</AppText>
      </View>
      <View style={styles.progressLabels}>
        <AppText variant="caption">发售进度</AppText>
        <AppText variant="caption">{detail.progressPercent}%</AppText>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${detail.progressPercent}%` }]} /></View>
      <View style={styles.metrics}>
        <Metric label="参与者" value={String(detail.participantsCount)} />
        <Metric label="已筹资" value={detail.fundedAmountText} />
        <Metric label="可购份额" value={detail.availableSharesText} />
      </View>
      <View style={styles.eligibility}>
        <AppText style={styles.eligibilityTitle}>{detail.eligibility.title}</AppText>
        <AppText variant="caption">{detail.eligibility.description}</AppText>
      </View>
      {detail.chainReadState === "error" ? (
        <View style={styles.warning}><AppText style={styles.warningText}>链上发售状态暂不可用</AppText></View>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><AppText variant="caption">{label}</AppText><AppText style={styles.metricValue}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  badges: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eligibility: { backgroundColor: colors.surfaceMuted, borderRadius: 6, gap: spacing.xs, padding: spacing.md },
  eligibilityTitle: { fontWeight: "700" },
  fill: { backgroundColor: colors.primary, borderRadius: 3, height: 6 },
  heading: { gap: spacing.sm },
  image: { aspectRatio: 1.25, backgroundColor: colors.surfaceMuted, borderRadius: 8, width: "100%" },
  metric: { flex: 1, gap: spacing.xs },
  metrics: { flexDirection: "row", gap: spacing.sm },
  metricValue: { fontSize: 14, fontWeight: "700" },
  placeholder: { alignItems: "center", aspectRatio: 1.25, backgroundColor: colors.surfaceMuted, borderRadius: 8, justifyContent: "center", width: "100%" },
  price: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  root: { gap: spacing.md },
  status: { backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  statusText: { color: colors.primary, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "800" },
  token: { color: colors.champagne, fontWeight: "700" },
  track: { backgroundColor: colors.surfaceMuted, borderRadius: 3, height: 6, overflow: "hidden" },
  warning: { backgroundColor: colors.dangerMuted, borderRadius: 6, padding: spacing.md },
  warningText: { color: colors.danger, fontWeight: "700" },
});
