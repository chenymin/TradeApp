import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { AssetListStatus, PublicAssetSummary } from "../domain/assetModels";
import { AssetCard } from "./AssetCard";

export function PublicAssetList({
  errorMessage,
  header,
  items,
  loadMore,
  onAssetPress,
  queryKey,
  refresh,
  retry,
  status,
  warningMessage,
}: {
  errorMessage: string | null;
  header: React.ReactElement;
  items: PublicAssetSummary[];
  loadMore(): void;
  onAssetPress(id: string): void;
  queryKey: string;
  refresh(): void;
  retry(): void;
  status: AssetListStatus;
  warningMessage: string | null;
}) {
  const listRef = useRef<FlatList<PublicAssetSummary>>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [queryKey]);

  const renderItem = useCallback(({ item }: { item: PublicAssetSummary }) => (
    <AssetCard asset={item} onPress={onAssetPress} />
  ), [onAssetPress]);

  return (
    <FlatList
      accessibilityLabel="Public asset list"
      contentContainerStyle={styles.content}
      data={items}
      ItemSeparatorComponent={ItemSeparator}
      keyExtractor={keyExtractor}
      ListEmptyComponent={(
        <EmptyState errorMessage={errorMessage} retry={retry} status={status} />
      )}
      ListFooterComponent={(
        <ListFooter status={status} warningMessage={warningMessage} />
      )}
      ListHeaderComponent={header}
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      onRefresh={refresh}
      ref={listRef}
      refreshing={status === "refreshing"}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

function EmptyState({
  errorMessage,
  retry,
  status,
}: {
  errorMessage: string | null;
  retry(): void;
  status: AssetListStatus;
}) {
  if (status === "initial_loading" || status === "idle") {
    return (
      <View accessibilityLabel="Asset list skeleton" style={styles.skeletonGroup}>
        {["first", "second", "third"].map((skeletonId, index) => (
          <View accessibilityLabel={`Asset skeleton ${index + 1}`} key={skeletonId} style={styles.skeleton} />
        ))}
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.state}>
        <AppText style={styles.stateTitle}>资产暂时无法加载</AppText>
        <AppText variant="caption">{errorMessage ?? "请稍后重试"}</AppText>
        <Pressable accessibilityLabel="Retry asset list" onPress={retry} style={styles.retryButton}>
          <AppText style={styles.retryLabel}>重试</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.state}>
      <AppText style={styles.stateTitle}>暂无公开资产</AppText>
      <AppText variant="caption">当前条件下没有可展示的艺术资产。</AppText>
    </View>
  );
}

function ListFooter({
  status,
  warningMessage,
}: {
  status: AssetListStatus;
  warningMessage: string | null;
}) {
  if (status === "loading_more") {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (warningMessage) {
    return (
      <View style={styles.footer}>
        <AppText style={styles.warning} variant="caption">{warningMessage}</AppText>
      </View>
    );
  }

  if (status === "end_reached") {
    return (
      <View style={styles.footer}>
        <AppText variant="caption">没有更多资产</AppText>
      </View>
    );
  }

  return null;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

function keyExtractor(item: PublicAssetSummary): string {
  return item.id;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    alignItems: "center",
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  retryLabel: {
    color: colors.surface,
    fontWeight: "700",
  },
  separator: {
    height: spacing.md,
  },
  skeleton: {
    aspectRatio: 1.15,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
  },
  skeletonGroup: {
    gap: spacing.md,
  },
  state: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    fontWeight: "700",
  },
  warning: {
    color: colors.danger,
  },
});
