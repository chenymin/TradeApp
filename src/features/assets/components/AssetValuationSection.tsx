import { Pressable, StyleSheet, View } from "react-native";
import { ExternalLink } from "lucide-react-native";
import { AppText, colors, spacing } from "../../../shared/ui";
import type { AssetDetailValuation } from "../domain/assetDetailModels";

const VALUATION_DISCLAIMER = "本估值报告仅供参考，不构成投资建议。艺术品市场具有波动性，实际交易价格可能与估值存在差异。投资者应自行评估风险并做出独立判断。";

export function AssetValuationSection({ openExternalUrl, valuation }: { openExternalUrl(url: string): Promise<unknown>; valuation: AssetDetailValuation }) {
  if (valuation.status === "error") return <LocalState text="估值报告暂时无法加载" />;
  if (valuation.status === "empty") return <LocalState text="暂无估值报告" />;
  return <View style={styles.root}>
    <AppText style={styles.title}>估值信息</AppText>
    <Fact label="估值机构" value={valuation.appraiser} /><Fact label="估值日期" value={valuation.reportDate} />
    <Fact label="估值金额" value={valuation.valuationText} /><Fact label="报告编号" value={valuation.reportNumber} />
    <AppText style={styles.title}>市场分析</AppText>
    <Fact label="市场趋势" value={valuation.marketTrend} /><Fact label="需求水平" value={valuation.demandLevel} />
    {valuation.notes && valuation.notes !== VALUATION_DISCLAIMER ? <AppText>{valuation.notes}</AppText> : null}
    <View style={styles.disclaimer}><AppText variant="caption">{VALUATION_DISCLAIMER}</AppText></View>
    {valuation.reportUrl ? <Pressable accessibilityLabel="Open valuation report" onPress={() => void openExternalUrl(valuation.reportUrl!)} style={styles.link}><AppText style={styles.linkText}>查看完整报告</AppText><ExternalLink color={colors.primary} size={16} /></Pressable> : null}
  </View>;
}
function LocalState({ text }: { text: string }) { return <View style={styles.localState}><AppText>{text}</AppText></View>; }
function Fact({ label, value }: { label: string; value: string | null }) { return <View style={styles.fact}><AppText variant="caption">{label}</AppText><AppText>{value ?? "--"}</AppText></View>; }
const styles = StyleSheet.create({ disclaimer: { backgroundColor: colors.surfaceMuted, borderRadius: 6, padding: spacing.md }, fact: { gap: spacing.xs }, link: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 44 }, linkText: { color: colors.primary, fontWeight: "700" }, localState: { paddingVertical: spacing.xl }, root: { gap: spacing.md }, title: { fontSize: 18, fontWeight: "700" } });
