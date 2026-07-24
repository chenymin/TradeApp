export type SkeletonAnimationMode = "pulse" | "static";

export function getSkeletonAnimationMode(
  reduceMotion: boolean,
): SkeletonAnimationMode {
  return reduceMotion ? "static" : "pulse";
}

const SkeletonOpacityContext = createContext<Animated.Value | null>(null);

export function SkeletonGroup({
  accessibilityLabel,
  children,
  reduceMotion,
  style,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  reduceMotion?: boolean;
  style?: ViewStyle;
}) {
  const systemReduceMotion = useReduceMotion(reduceMotion);
  const opacity = useRef(new Animated.Value(0.52)).current;

  useEffect(() => {
    if (getSkeletonAnimationMode(systemReduceMotion) === "static") return;

    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, {
        duration: motion.skeletonDurationMs / 2,
        easing: Easing.inOut(Easing.ease),
        toValue: 0.82,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        duration: motion.skeletonDurationMs / 2,
        easing: Easing.inOut(Easing.ease),
        toValue: 0.52,
        useNativeDriver: true,
      }),
    ]));

    animation.start();
    return () => animation.stop();
  }, [opacity, systemReduceMotion]);

  return (
    <SkeletonOpacityContext.Provider value={opacity}>
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="progressbar"
        style={style}
      >
        {children}
      </View>
    </SkeletonOpacityContext.Provider>
  );
}

export function SkeletonBlock({
  height,
  radius,
  testID,
  tone = "default",
  width,
}: {
  height: ViewStyle["height"];
  radius?: number;
  testID?: string;
  tone?: "default" | "strong";
  width: ViewStyle["width"];
}) {
  const opacity = useContext(SkeletonOpacityContext);

  return (
    <Animated.View
      style={[
        styles.block,
        tone === "strong" ? styles.strong : null,
        { borderRadius: radius ?? 4, height, width },
        { opacity: opacity ?? 1 },
      ]}
      testID={testID}
    />
  );
}

function useReduceMotion(override: boolean | undefined): boolean {
  const [preference, setPreference] = useState<boolean | null>(null);

  useEffect(() => {
    if (override !== undefined) return;

    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setPreference,
    );

    void AccessibilityInfo.isReduceMotionEnabled()
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
  }, [override]);

  return override ?? preference ?? true;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceSubtle,
  },
  strong: {
    backgroundColor: colors.border,
  },
});
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { colors, motion } from "./theme";
