import { Pressable, StyleSheet, View } from "react-native";
import { ExternalLink } from "lucide-react-native";
import { AppText, colors, spacing } from "../../../shared/ui";
import type { AssetDetailReadModel } from "../domain/assetDetailModels";

export function AssetOnchainSection({ detail, openExternalUrl }: { detail: AssetDetailReadModel; openExternalUrl(url: string): Promise<unknown> }) {
  return <View style={styles.root}>
    <AppText style={styles.title}>合约信息</AppText>
    <Row label="合约地址" value={detail.contractAddressShort} /><Row label="代币标准" value={detail.onchain.tokenStandard} /><Row label="网络" value={detail.onchain.chainName} />
    {detail.onchain.explorerUrl ? <Pressable accessibilityLabel="Open contract explorer" onPress={() => void openExternalUrl(detail.onchain.explorerUrl!)} style={styles.link}><AppText style={styles.linkText}>在区块浏览器查看</AppText><ExternalLink color={colors.primary} size={16} /></Pressable> : null}
    <AppText style={styles.title}>事件时间线</AppText>
    {detail.onchain.eventsStatus === "error" ? <AppText>链上事件暂时无法加载</AppText> : detail.onchain.eventsStatus === "empty" ? <AppText>暂无链上事件</AppText> : detail.onchain.events.map((event) => event.explorerUrl ? <Pressable accessibilityLabel={`Open transaction ${event.txHashShort}`} key={event.id} onPress={() => void openExternalUrl(event.explorerUrl!)} style={styles.event}><AppText style={styles.eventTitle}>{event.title}</AppText><AppText variant="caption">{event.occurredAtText}</AppText><AppText>{event.amountText}</AppText><AppText variant="caption">{event.txHashShort}</AppText></Pressable> : <View key={event.id} style={styles.event}><AppText style={styles.eventTitle}>{event.title}</AppText><AppText variant="caption">{event.occurredAtText}</AppText><AppText>{event.amountText}</AppText><AppText variant="caption">{event.txHashShort}</AppText></View>)}
  </View>;
}
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><AppText variant="caption">{label}</AppText><AppText>{value}</AppText></View>; }
const styles = StyleSheet.create({ event: { borderLeftColor: colors.primary, borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md, paddingVertical: spacing.sm }, eventTitle: { fontWeight: "700" }, link: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 44 }, linkText: { color: colors.primary, fontWeight: "700" }, root: { gap: spacing.md }, row: { gap: spacing.xs }, title: { fontSize: 18, fontWeight: "700" } });
