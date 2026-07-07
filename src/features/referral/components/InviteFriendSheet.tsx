import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { RegistrationUserType } from "../../registration/domain/registrationPayload";
import {
  createInviteShareWorkflow,
  type InviteClipboardAdapter,
  type InviteShareAdapter,
} from "../workflow/inviteShareWorkflow";
import { AppText, colors, spacing } from "../../../shared/ui";

const INVITE_TYPE_OPTIONS: Array<{
  accessibilityLabel: string;
  label: string;
  value: RegistrationUserType;
}> = [
  { accessibilityLabel: "投资者", label: "投资者", value: "investor" },
  {
    accessibilityLabel: "藏家",
    label: "藏家 - 需艺委会审核评级，授予声誉积分",
    value: "collector",
  },
  {
    accessibilityLabel: "艺术家",
    label: "艺术家 - 需艺委会审核评级，授予声誉积分",
    value: "creator",
  },
  {
    accessibilityLabel: "机构",
    label: "机构 - 需艺委会审核评级，授予声誉积分",
    value: "institution",
  },
];

export function InviteFriendSheet({
  clipboard,
  inviteCode,
  onClose,
  share,
  webOrigin,
}: {
  clipboard: InviteClipboardAdapter;
  inviteCode: string;
  onClose: () => void;
  share: InviteShareAdapter;
  webOrigin: string;
}) {
  const [selectedType, setSelectedType] = useState<RegistrationUserType>("investor");
  const [status, setStatus] = useState<"copied" | "idle" | "shared">("idle");
  const workflow = useMemo(
    () =>
      createInviteShareWorkflow({
        clipboard,
        inviteCode,
        share,
        webOrigin,
      }),
    [clipboard, inviteCode, share, webOrigin],
  );

  const handleCopy = async () => {
    await workflow.copy(selectedType);
    setStatus("copied");
  };

  const handleShare = async () => {
    await workflow.share(selectedType);
    setStatus("shared");
  };

  return (
    <View accessibilityLabel="Invite friends sheet" style={styles.sheet}>
      <View style={styles.header}>
        <AppText style={styles.title} variant="title">选择邀请类型</AppText>
        <Pressable accessibilityLabel="Close invite friends" onPress={onClose}>
          <AppText style={styles.close} variant="body">×</AppText>
        </Pressable>
      </View>
      <AppText style={styles.description} variant="body">
        复制链接发送给你的朋友即可完成邀请。
      </AppText>
      <View style={styles.options}>
        {INVITE_TYPE_OPTIONS.map((option) => (
          <Pressable
            accessibilityLabel={`Invite type ${option.accessibilityLabel}`}
            accessibilityState={{ selected: option.value === selectedType }}
            key={option.value}
            onPress={() => setSelectedType(option.value)}
            style={[
              styles.option,
              option.value === selectedType ? styles.optionSelected : null,
            ]}
          >
            <AppText
              style={[
                styles.optionText,
                option.value === selectedType ? styles.optionTextSelected : null,
              ]}
              variant="body"
            >
              {option.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.linkBox}>
        <AppText style={styles.linkText} variant="body">
          {workflow.links[selectedType]}
        </AppText>
        <Pressable
          accessibilityLabel="Copy invite link"
          onPress={handleCopy}
          style={styles.copyButton}
        >
          <AppText style={styles.copyButtonText} variant="body">Copy link</AppText>
        </Pressable>
      </View>
      {status !== "idle" ? (
        <AppText variant="caption">{status === "copied" ? "Copied" : "Shared"}</AppText>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Share invite link"
          onPress={handleShare}
          style={styles.shareButton}
        >
          <AppText style={styles.shareButtonText} variant="body">Share</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "flex-start",
  },
  close: {
    color: "#444444",
    fontSize: 34,
    lineHeight: 36,
  },
  copyButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#000000",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  description: {
    color: "#A6A6A6",
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkBox: {
    backgroundColor: "#F0F0F0",
    borderRadius: 18,
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  linkText: {
    color: "#777777",
    fontSize: 14,
    lineHeight: 20,
  },
  option: {
    alignItems: "center",
    borderColor: "#E7E7E7",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  optionText: {
    color: "#000000",
    fontSize: 16,
    textAlign: "center",
  },
  optionSelected: {
    backgroundColor: "#E4F1DE",
    borderColor: "#159100",
    borderWidth: 2,
  },
  optionTextSelected: {
    color: "#159100",
    fontWeight: "700",
  },
  options: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  shareButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  shareButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
  },
  title: {
    color: "#000000",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "left",
  },
});
