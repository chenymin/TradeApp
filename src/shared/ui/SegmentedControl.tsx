import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";

export type SegmentedControlOption<TValue extends string> = {
  label: string;
  value: TValue;
};

export function SegmentedControl<TValue extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: TValue) => void;
  options: SegmentedControlOption<TValue>[];
  value: TValue;
}) {
  return (
    <View style={styles.root}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected ? styles.selected : null]}
          >
            <Text style={[styles.label, selected ? styles.selectedLabel : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#ECEFEB",
    borderRadius: 8,
    flexDirection: "row",
    padding: 4,
  },
  selected: {
    backgroundColor: colors.surface,
  },
  selectedLabel: {
    color: colors.text,
  },
});
