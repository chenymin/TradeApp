import { StyleSheet, View } from "react-native";

import { AppText, Input, SegmentedControl, colors, spacing } from "../../../shared/ui";
import { PublicAssetList } from "../components/PublicAssetList";
import type { AssetSort, PublicAssetPageLoader } from "../domain/assetModels";
import { usePublicAssetList } from "../hooks/usePublicAssetList";

const SORTS = [
  { label: "最新", value: "recent" },
  { label: "价格升序", value: "price_asc" },
  { label: "价格降序", value: "price_desc" },
  { label: "进度", value: "progress_desc" },
] satisfies Array<{ label: string; value: AssetSort }>;

export function MarketScreen({
  loader,
  onAssetPress,
}: {
  loader: PublicAssetPageLoader;
  onAssetPress(id: string): void;
}) {
  const list = usePublicAssetList({
    initialFilter: "completed",
    loader,
    searchDebounceMs: 300,
  });

  return (
    <View style={styles.screen}>
      <PublicAssetList
        errorMessage={list.errorMessage}
        header={(
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <AppText style={styles.title}>艺术资产市场</AppText>
              <AppText variant="caption">浏览已完成发行的公开艺术资产。</AppText>
            </View>
            <Input
              accessibilityLabel="Search market assets"
              onChangeText={list.setSearch}
              placeholder="搜索作品、艺术家或代币代码"
              returnKeyType="search"
              value={list.searchInput}
            />
            <SegmentedControl onChange={list.setSort} options={SORTS} value={list.sort} />
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
  header: {
    gap: spacing.md,
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
