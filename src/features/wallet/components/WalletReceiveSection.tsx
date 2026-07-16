import { Copy, Image as ImageIcon, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import QRCodeStyled from "react-native-qrcode-styled";

import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import { AppText, colors, spacing } from "../../../shared/ui";
import {
  copyWalletAddress,
  shareWalletAddress,
  type WalletClipboardAdapter,
  type WalletTextShareAdapter,
} from "../workflow/walletReceiveActions";

type ReceiveActionState =
  | "idle"
  | "copying"
  | "sharing_text"
  | "sharing_image"
  | "copied"
  | "copy_error"
  | "share_error";

export function WalletReceiveSection({
  address,
  chain,
  clipboard,
  onShareImage,
  textShare,
}: {
  address: `0x${string}`;
  chain: PublicChainConfig;
  clipboard: WalletClipboardAdapter;
  onShareImage?: () => Promise<"shared" | "unavailable">;
  textShare: WalletTextShareAdapter;
}) {
  const [actionState, setActionState] = useState<ReceiveActionState>("idle");
  const busy = actionState === "copying" ||
    actionState === "sharing_text" ||
    actionState === "sharing_image";

  const copy = async () => {
    if (busy) return;
    setActionState("copying");
    const result = await copyWalletAddress({ address, clipboard });
    setActionState(result === "copied" ? "copied" : "copy_error");
  };

  const shareText = async () => {
    if (busy) return;
    setActionState("sharing_text");
    const result = await shareWalletAddress({ address, chain, share: textShare });
    setActionState(
      result === "unavailable" ? "share_error" : "idle",
    );
  };

  const shareImage = async () => {
    if (busy) return;
    setActionState("sharing_image");
    const result = await onShareImage?.() ?? "unavailable";
    setActionState(result === "shared" ? "idle" : "share_error");
  };

  return (
    <View accessibilityLabel="Receive wallet assets" style={styles.section}>
      <AppText style={styles.heading} variant="body">Receive</AppText>
      <AppText variant="caption">{chain.name} only</AppText>
      <View style={styles.qrFrame}>
        <QRCodeStyled
          backgroundColor="#FFFFFF"
          color={colors.text}
          data={address}
          errorCorrectionLevel="H"
          padding={12}
          pieceScale={1.02}
          pieceSize={5}
          style={styles.qr}
        />
      </View>
      <AppText
        accessibilityLabel={`Receive address ${address}`}
        selectable
        style={styles.address}
        variant="caption"
      >
        {address}
      </AppText>
      <View style={styles.actions}>
        <IconAction
          accessibilityHint="Copies the full wallet address"
          accessibilityLabel="Copy wallet address"
          disabled={busy}
          icon={<Copy color={colors.primary} size={20} strokeWidth={2.4} />}
          onPress={() => { void copy(); }}
        />
        <IconAction
          accessibilityHint="Opens the system text share sheet"
          accessibilityLabel="Share wallet address as text"
          disabled={busy}
          icon={<Share2 color={colors.primary} size={20} strokeWidth={2.4} />}
          onPress={() => { void shareText(); }}
        />
        <IconAction
          accessibilityHint="Opens the system image share sheet"
          accessibilityLabel="Share wallet address as image"
          disabled={busy}
          icon={<ImageIcon color={colors.primary} size={20} strokeWidth={2.4} />}
          onPress={() => { void shareImage(); }}
        />
      </View>
      {actionState === "copied" ? (
        <AppText variant="caption">Address copied</AppText>
      ) : actionState === "copy_error" ? (
        <AppText style={styles.error} variant="caption">
          Unable to copy address. Try again.
        </AppText>
      ) : actionState === "share_error" ? (
        <AppText style={styles.error} variant="caption">
          Unable to share address. Try again.
        </AppText>
      ) : null}
    </View>
  );
}

function IconAction({
  accessibilityHint,
  accessibilityLabel,
  disabled,
  icon,
  onPress,
}: {
  accessibilityHint: string;
  accessibilityLabel: string;
  disabled: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  address: {
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  heading: {
    fontWeight: "800",
  },
  qr: {
    backgroundColor: colors.surface,
    height: 220,
    width: 220,
  },
  qrFrame: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surface,
    height: 244,
    justifyContent: "center",
    width: 244,
  },
  section: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
