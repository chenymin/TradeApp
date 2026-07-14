import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, SegmentedControl, colors, spacing } from "../../../shared/ui";
import { LaunchpadSummaryStrip } from "../components/LaunchpadSummaryStrip";
import { PublicAssetList } from "../components/PublicAssetList";
import type {
  AssetSaleFilter,
  PublicAssetPageLoader,
  PublicAssetSummary,
} from "../domain/assetModels";
import { usePublicAssetList } from "../hooks/usePublicAssetList";

const FILTERS = [
  { label: "全部", value: "all" },
  { label: "进行中", value: "active" },
  { label: "即将开始", value: "upcoming" },
  { label: "已完成", value: "completed" },
] satisfies Array<{ label: string; value: AssetSaleFilter }>;

export function LaunchpadScreen({
  loader,
  onAssetPress,
}: {
  loader: PublicAssetPageLoader;
  onAssetPress(id: string): void;
}) {
  const list = usePublicAssetList({ loader });
  const [summaryAssets, setSummaryAssets] = useState<PublicAssetSummary[]>([]);

  useEffect(() => {
    if (
      list.filter === "all" &&
      (list.status === "ready" || list.status === "end_reached" || list.status === "empty")
    ) {
      setSummaryAssets(list.items);
    }
  }, [list.filter, list.items, list.status]);

  return (
    <View style={styles.screen}>
      <PublicAssetList
        errorMessage={list.errorMessage}
        header={(
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <AppText style={styles.title}>艺术资产发行</AppText>
              <AppText style={styles.englishTitle}>Tokenized Art Launchpad</AppText>
              <AppText variant="caption">精选艺术品资产，按份额发行链上所有权凭证。</AppText>
            </View>
            <LaunchpadSummaryStrip assets={summaryAssets} />
            <SegmentedControl onChange={list.setFilter} options={FILTERS} value={list.filter} />
          </View>
        )}
        items={list.items}
        loadMore={list.loadMore}
        onAssetPress={onAssetPress}
        queryKey={`${list.filter}:${list.search}:${list.sort}`}
        refresh={list.refresh}
        retry={list.retry}
        status={list.status}
        warningMessage={list.warningMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  englishTitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  titleGroup: {
    gap: spacing.sm,
  },
});
