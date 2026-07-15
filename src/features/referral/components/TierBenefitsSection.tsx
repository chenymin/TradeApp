import { StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import { getTierBenefitKeys, type RewardTier } from "../domain/tierBenefits";

const BENEFIT_LABELS: Record<string, string> = {
  "referral.tierBenefits.A.1": "Launchpad priority and exclusive subscriptions",
  "referral.tierBenefits.A.2": "Dedicated account manager and advisor",
  "referral.tierBenefits.A.3": "Invitations to private art salons",
  "referral.tierBenefits.A.4": "Points redemption discounts",
  "referral.tierBenefits.B.1": "Growth tasks and badges",
  "referral.tierBenefits.B.2": "Priority access to art investment education",
  "referral.tierBenefits.B.3": "Community identity badge",
  "referral.tierBenefits.B.4": "Small-amount Launchpad eligibility",
  "referral.tierBenefits.C.1": "VIP trial benefits",
  "referral.tierBenefits.C.2": "Personalized art content recommendations",
  "referral.tierBenefits.C.3": "Access to limited invite campaigns",
  "referral.tierBenefits.D.1": "Basic registration benefits",
  "referral.tierBenefits.D.2": "Access to basic platform features",
  "referral.tierBenefits.S.1": "Customized RWA issuance service",
  "referral.tierBenefits.S.2": "Participation in the strategic committee",
  "referral.tierBenefits.S.3": "Global joint brand campaigns",
  "referral.tierBenefits.S.4": "RWA trading fee sharing",
};

export function TierBenefitsSection({ tier }: { tier: RewardTier | null }) {
  const keys = getTierBenefitKeys(tier);
  return (
    <View style={styles.root}>
      <AppText style={styles.title} variant="body">Current tier benefits</AppText>
      {keys.length === 0 ? (
        <AppText variant="caption">Tier benefits are unavailable for this account</AppText>
      ) : keys.map((key) => (
        <View key={key} style={styles.row}>
          <View style={styles.marker} />
          <AppText style={styles.label} variant="caption">{BENEFIT_LABELS[key]}</AppText>
        </View>
      ))}
      <AppText variant="caption">
        Eligibility is confirmed by the relevant platform service.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    flex: 1,
  },
  marker: {
    backgroundColor: colors.champagne,
    height: 6,
    marginTop: 4,
    width: 6,
  },
  root: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  title: {
    fontWeight: "800",
  },
});
