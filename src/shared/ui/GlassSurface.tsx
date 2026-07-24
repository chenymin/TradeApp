import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { forwardRef, useEffect, useState, type ReactNode, type Ref } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { colors, radii } from "./theme";

export type GlassPresentation =
  | "blur"
  | "native_glass"
  | "opaque"
  | "translucent";

export type GlassCapabilityInput = {
  nativeGlassAvailable: boolean;
  platform: "android" | "ios" | "web";
  platformVersion: number;
  reduceTransparency: boolean;
};

export type GlassSurfaceVariant = "control" | "header" | "navigation" | "overlay";

export type GlassSurfaceProps = Omit<ViewProps, "children"> & {
  children: ReactNode;
  variant: GlassSurfaceVariant;
};

export function selectGlassPresentation(
  input: GlassCapabilityInput,
): GlassPresentation {
  if (input.reduceTransparency) {
    return "opaque";
  }

  if (
    input.platform === "ios" &&
    input.platformVersion >= 26 &&
    input.nativeGlassAvailable
  ) {
    return "native_glass";
  }

  if (input.platform === "ios") {
    return "blur";
  }

  return "translucent";
}

export const GlassSurface = forwardRef<View, GlassSurfaceProps>(function GlassSurface(
  { children, variant, ...props },
  ref,
) {
  const reduceTransparency = useReduceTransparency();
  const presentation = selectGlassPresentation({
    nativeGlassAvailable: safelyCheckNativeGlass(),
    platform: normalizePlatform(Platform.OS),
    platformVersion: normalizePlatformVersion(Platform.Version),
    reduceTransparency,
  });

  return (
    <GlassSurfaceView
      {...props}
      forwardedRef={ref}
      presentation={presentation}
      variant={variant}
    >
      {children}
    </GlassSurfaceView>
  );
});

export function GlassSurfaceView({
  children,
  forwardedRef,
  presentation,
  style,
  variant,
  ...props
}: GlassSurfaceProps & {
  forwardedRef?: Ref<View>;
  presentation: GlassPresentation;
}) {
  const surfaceStyle = [styles.base, styles[variant], style];
  const testID = `glass-surface-${presentation}`;

  if (presentation === "native_glass") {
    return (
      <View {...props} ref={forwardedRef} style={surfaceStyle} testID={testID}>
        <GlassView
          glassEffectStyle="regular"
          isInteractive={false}
          pointerEvents="none"
          style={styles.effect}
          tintColor={colors.glassFill}
        />
        {children}
      </View>
    );
  }

  if (presentation === "blur") {
    return (
      <View {...props} ref={forwardedRef} style={surfaceStyle} testID={testID}>
        <BlurView
          intensity={32}
          pointerEvents="none"
          style={styles.effect}
          tint="systemUltraThinMaterialLight"
        />
        {children}
      </View>
    );
  }

  return (
    <View
      {...props}
      ref={forwardedRef}
      style={[
        surfaceStyle,
        presentation === "opaque" ? styles.opaque : styles.translucent,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

function useReduceTransparency(): boolean {
  const [preference, setPreference] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setPreference,
    );

    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (mounted) setPreference(enabled);
      })
      .catch(() => {
        if (mounted) setPreference(null);
      });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return preference !== false;
}

function safelyCheckNativeGlass(): boolean {
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

function normalizePlatform(platform: string): GlassCapabilityInput["platform"] {
  if (platform === "ios" || platform === "android") return platform;
  return "web";
}

function normalizePlatformVersion(version: number | string): number {
  const numericVersion = typeof version === "number" ? version : Number.parseFloat(version);
  return Number.isFinite(numericVersion) ? numericVersion : 0;
}

const variants = StyleSheet.create<Record<GlassSurfaceVariant, ViewStyle>>({
  control: {
    borderRadius: radii.lg,
  },
  header: {},
  navigation: {},
  overlay: {
    borderRadius: radii.lg,
  },
});

const styles = StyleSheet.create({
  base: {
    borderColor: colors.glassBorder,
    borderWidth: 1,
    overflow: "hidden",
  },
  effect: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  ...variants,
  opaque: {
    backgroundColor: colors.surface,
  },
  translucent: {
    backgroundColor: colors.glassFill,
  },
});
