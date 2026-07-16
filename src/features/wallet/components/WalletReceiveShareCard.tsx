import { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import QRCodeStyled from "react-native-qrcode-styled";

import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import { AppText, colors, spacing } from "../../../shared/ui";

export const WalletReceiveShareCard = forwardRef<View, {
  address: `0x${string}`;
  chain: PublicChainConfig;
}>(function WalletReceiveShareCard({ address, chain }, ref) {
  return (
    <View
      accessibilityLabel="Wallet receive share card"
      collapsable={false}
      ref={ref}
      style={styles.card}
    >
      <AppText style={styles.brand} variant="title">ArtStar</AppText>
      <AppText style={styles.heading} variant="body">Receive wallet assets</AppText>
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
      <AppText style={styles.address} variant="caption">{address}</AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  address: {
    textAlign: "center",
  },
  brand: {
    color: colors.primary,
    fontSize: 24,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    gap: spacing.sm,
    padding: spacing.lg,
    width: 320,
  },
  heading: {
    fontWeight: "800",
  },
  qr: {
    height: 220,
    width: 220,
  },
  qrFrame: {
    alignItems: "center",
    backgroundColor: colors.surface,
    height: 244,
    justifyContent: "center",
    width: 244,
  },
});
