import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radii, spacing } from "../../../shared/ui";

export function InviteSection({
  inviteCode,
  kycApproved,
  onOpenInvite,
  onOpenKyc,
  publicWebOrigin,
}: {
  inviteCode: string | null;
  kycApproved: boolean | null;
  onOpenInvite: (value: { inviteCode: string; webOrigin: string }) => void;
  onOpenKyc: () => void;
  publicWebOrigin?: string;
}) {
  let content: React.ReactNode;

  if (kycApproved === null) {
    content = <AppText variant="caption">Invitation status unavailable</AppText>;
  } else if (!kycApproved) {
    content = (
      <>
        <AppText variant="caption">Complete KYC to unlock invitations</AppText>
        <Pressable accessibilityLabel="Open KYC" onPress={onOpenKyc} style={styles.action}>
          <AppText style={styles.actionText} variant="body">Review KYC status</AppText>
        </Pressable>
      </>
    );
  } else if (!inviteCode) {
    content = <AppText variant="caption">Invite code unavailable</AppText>;
  } else if (!publicWebOrigin) {
    content = <AppText variant="caption">Invite sharing is not configured</AppText>;
  } else {
    content = (
      <>
        <View style={styles.codeRow}>
          <AppText variant="caption">Invite code</AppText>
          <AppText style={styles.code} variant="body">{inviteCode}</AppText>
        </View>
        <Pressable
          accessibilityLabel="Open invite options"
          onPress={() => onOpenInvite({ inviteCode, webOrigin: publicWebOrigin })}
          style={styles.action}
        >
          <AppText style={styles.actionText} variant="body">Invite someone</AppText>
        </Pressable>
      </>
    );
  }

  return (
    <View style={styles.root}>
      <AppText style={styles.title} variant="body">Invite network</AppText>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  code: {
    fontWeight: "800",
  },
  codeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  root: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  title: {
    fontWeight: "800",
  },
});
