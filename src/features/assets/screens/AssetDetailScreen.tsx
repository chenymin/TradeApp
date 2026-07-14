import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText, colors, spacing } from "../../../shared/ui";
import type { ExternalLinkResult } from "../../../shared/platform/linkingAdapter";
import { AssetBottomAction } from "../components/AssetBottomAction";
import { AssetDetailTabs } from "../components/AssetDetailTabs";
import { AssetHero } from "../components/AssetHero";
import { AssetOnchainSection } from "../components/AssetOnchainSection";
import { AssetOverviewSection } from "../components/AssetOverviewSection";
import { AssetRulesSection } from "../components/AssetRulesSection";
import { AssetValuationSection } from "../components/AssetValuationSection";
import type { AssetDetailLoader, AssetDetailTab, AssetDetailViewer } from "../domain/assetDetailModels";
import type { PublicAssetSummary } from "../domain/assetModels";
import { usePublicAssetDetail } from "../hooks/usePublicAssetDetail";

export function AssetDetailScreen({ assetId, loader, onLogin, onPurchasePreview, onViewMarket, openExternalUrl, placeholder, viewer }: { assetId: string; loader: AssetDetailLoader; onLogin(): void; onPurchasePreview(): void; onViewMarket(): void; openExternalUrl(url: string): Promise<ExternalLinkResult | unknown>; placeholder?: PublicAssetSummary; viewer: AssetDetailViewer }) {
  const [tab, setTab] = useState<AssetDetailTab>("overview");
  const state = usePublicAssetDetail({ assetId, loader, placeholder, viewer });
  if (!state.detail && state.status === "loading") return placeholder ? <View style={styles.loadingPlaceholder}><View style={styles.loadingImage}><AppText variant="caption">TOKENIZED ART</AppText></View><AppText variant="caption">{placeholder.artistName}</AppText><AppText style={styles.loadingTitle}>{placeholder.title}</AppText><AppText style={styles.loadingPrice}>{placeholder.priceText}</AppText><View style={styles.loadingStatus}><ActivityIndicator color={colors.primary} /><AppText variant="caption">正在加载完整详情</AppText></View></View> : <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText>正在加载资产详情</AppText></View>;
  if (!state.detail && state.status === "error") return <View style={styles.center}><AppText style={styles.error}>资产详情无法加载</AppText><AppText variant="caption">{state.error}</AppText><Pressable accessibilityLabel="Retry asset detail" onPress={state.retry} style={styles.retry}><AppText style={styles.retryText}>重试</AppText></Pressable></View>;
  if (!state.detail) return null;
  const detail = state.detail;
  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <AssetHero detail={detail} />
      <AssetDetailTabs onChange={setTab} value={tab} />
      {tab === "overview" ? <AssetOverviewSection detail={detail} /> : null}
      {tab === "valuation" ? <AssetValuationSection openExternalUrl={openExternalUrl} valuation={detail.valuation} /> : null}
      {tab === "rules" ? <AssetRulesSection detail={detail} /> : null}
      {tab === "onchain" ? <AssetOnchainSection detail={detail} openExternalUrl={openExternalUrl} /> : null}
      {state.status === "refreshing" ? <AppText variant="caption">正在刷新</AppText> : <Pressable accessibilityLabel="Refresh asset detail" onPress={state.refresh}><AppText style={styles.refresh}>刷新数据</AppText></Pressable>}
    </ScrollView>
    <AssetBottomAction onLogin={onLogin} onPurchasePreview={onPurchasePreview} onViewMarket={onViewMarket} state={detail.actionState} />
  </View>;
}

const styles = StyleSheet.create({ center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.lg }, content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 120 }, error: { color: colors.danger, fontWeight: "700" }, loadingImage: { alignItems: "center", aspectRatio: 1.25, backgroundColor: colors.surfaceMuted, borderRadius: 8, justifyContent: "center", width: "100%" }, loadingPlaceholder: { backgroundColor: colors.background, flex: 1, gap: spacing.sm, padding: spacing.lg }, loadingPrice: { color: colors.primary, fontSize: 20, fontWeight: "800" }, loadingStatus: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }, loadingTitle: { fontSize: 24, fontWeight: "800" }, refresh: { color: colors.primary, fontWeight: "700", paddingVertical: spacing.md }, retry: { backgroundColor: colors.primary, borderRadius: 8, minWidth: 120, padding: spacing.md }, retryText: { color: colors.surface, fontWeight: "700", textAlign: "center" }, screen: { backgroundColor: colors.background, flex: 1 } });
