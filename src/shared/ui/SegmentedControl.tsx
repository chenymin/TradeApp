import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";
import { GlassSurface } from "./GlassSurface";

export type SegmentedControlOption<TValue extends string> = {
  accessibilityLabel?: string;
  label: string;
  value: TValue;
};

export function SegmentedControl<TValue extends string>({
  compact = false,
  onChange,
  options,
  surface = "solid",
  value,
}: {
  compact?: boolean;
  onChange: (value: TValue) => void;
  options: SegmentedControlOption<TValue>[];
  surface?: "glass" | "solid";
  value: TValue;
}) {
  const optionsContent = (
    <>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              compact ? styles.compactOption : null,
              selected ? styles.selected : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                compact ? styles.compactLabel : null,
                selected ? styles.selectedLabel : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </>
  );

  if (surface === "glass") {
    return (
      <GlassSurface style={styles.root} variant="control">
        {optionsContent}
      </GlassSurface>
    );
  }

  return <View style={[styles.root, styles.solid]}>{optionsContent}</View>;
}

const styles = StyleSheet.create({
  compactLabel: {
    fontSize: 11,
  },
  compactOption: {
    minHeight: 40,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  option: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  root: {
    borderRadius: 8,
    flexDirection: "row",
    padding: 4,
  },
  solid: {
    backgroundColor: "#ECEFEB",
  },
  selected: {
    backgroundColor: colors.surface,
  },
  selectedLabel: {
    color: colors.text,
  },
});
