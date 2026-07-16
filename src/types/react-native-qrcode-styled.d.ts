declare module "react-native-qrcode-styled" {
  import type { ComponentType } from "react";
  import type { ColorValue, StyleProp, ViewStyle } from "react-native";

  type QRCodeStyledProps = {
    backgroundColor?: ColorValue;
    color?: ColorValue;
    data: string;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    padding?: number;
    pieceScale?: number;
    pieceSize?: number;
    style?: StyleProp<ViewStyle>;
  };

  const QRCodeStyled: ComponentType<QRCodeStyledProps>;
  export default QRCodeStyled;
}
