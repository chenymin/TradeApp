import { StyleSheet, View } from "react-native";
import { AppText, colors, spacing } from "../../../shared/ui";
import type { AssetDetailReadModel } from "../domain/assetDetailModels";

export function AssetRulesSection({ detail }: { detail: AssetDetailReadModel }) {
  return <View style={styles.root}>
    <Group title="发行规则"><Row label="总发行量" value={`${detail.rules.totalSupplyText} 份`} /><Row label="公开发售" value={`${detail.rules.publicSaleText} 份`} /><Row label="预留份额" value={`${detail.rules.reservedText} 份`} /><Row label="结算资产" value={detail.rules.settlementAsset} /></Group>
    <Group title="白名单要求"><AppText>完成 KYC 身份认证</AppText><AppText>符合投资者资格要求</AppText><AppText>非受限制区域用户</AppText></Group>
    <Group title="发售后权益"><AppText>按份额比例享有艺术品相关权益</AppText><AppText>发售结束后可进入二级市场</AppText><AppText>参与艺术品相关治理与收益分配</AppText></Group>
  </View>;
}
function Group({ children, title }: { children: React.ReactNode; title: string }) { return <View style={styles.group}><AppText style={styles.title}>{title}</AppText>{children}</View>; }
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><AppText variant="caption">{label}</AppText><AppText>{value}</AppText></View>; }
const styles = StyleSheet.create({ group: { gap: spacing.sm }, root: { gap: spacing.xl }, row: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.xs, paddingVertical: spacing.sm }, title: { fontSize: 18, fontWeight: "700" } });
