import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { AssetDetailTab } from "../domain/assetDetailModels";

const TABS: Array<{ label: string; name: string; value: AssetDetailTab }> = [
  { label: "详情", name: "Overview", value: "overview" },
  { label: "估值", name: "Valuation", value: "valuation" },
  { label: "规则", name: "Rules", value: "rules" },
  { label: "链上", name: "On-chain", value: "onchain" },
];

export function AssetDetailTabs({ onChange, value }: { onChange(value: AssetDetailTab): void; value: AssetDetailTab }) {
  return (
    <View style={styles.root}>
      {TABS.map((tab) => {
        const selected = tab.value === value;
        return <Pressable accessibilityLabel={`Asset detail tab ${tab.name}`} key={tab.value} onPress={() => onChange(tab.value)} style={[styles.tab, selected ? styles.selected : null]}>
          <AppText style={selected ? styles.selectedText : styles.text}>{tab.label}</AppText>
        </Pressable>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surfaceMuted, borderRadius: 8, flexDirection: "row", padding: spacing.xs },
  selected: { backgroundColor: colors.surface },
  selectedText: { color: colors.text, fontWeight: "700" },
  tab: { alignItems: "center", borderRadius: 6, flex: 1, minHeight: 40, justifyContent: "center" },
  text: { color: colors.muted, fontSize: 14 },
});
