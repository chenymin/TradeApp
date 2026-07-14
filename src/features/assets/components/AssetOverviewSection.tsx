import { StyleSheet, View } from "react-native";
import { AppText, colors, spacing } from "../../../shared/ui";
import type { AssetDetailReadModel } from "../domain/assetDetailModels";

export function AssetOverviewSection({ detail }: { detail: AssetDetailReadModel }) {
  return <View style={styles.root}>
    <Section title="作品描述"><AppText>{detail.overview.description ?? "暂无作品描述"}</AppText></Section>
    <Section title="作品信息">
      <Fact label="艺术家" value={detail.artistName} />
      <Fact label="尺寸" value={detail.overview.dimensions} />
      <Fact label="年份" value={detail.overview.creationYear} />
      <Fact label="材质" value={detail.overview.material} />
      <Fact label="来源" value={detail.overview.provenance} />
    </Section>
  </View>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <View style={styles.section}><AppText style={styles.title}>{title}</AppText>{children}</View>; }
function Fact({ label, value }: { label: string; value: string | null }) { return <View style={styles.fact}><AppText variant="caption">{label}</AppText><AppText>{value ?? "--"}</AppText></View>; }
const styles = StyleSheet.create({ fact: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.xs, paddingVertical: spacing.sm }, root: { gap: spacing.xl }, section: { gap: spacing.sm }, title: { fontSize: 18, fontWeight: "700" } });
