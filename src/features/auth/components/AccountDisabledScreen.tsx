import { Pressable, StyleSheet, Text, View } from "react-native";

export function AccountDisabledScreen({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Account unavailable</Text>
      <Text style={styles.copy}>Please contact support before signing in again.</Text>
      <Pressable accessibilityLabel="Back to sign in" onPress={onLogout} style={styles.button}>
        <Text style={styles.buttonText}>Back to sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#1E6B5C",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  copy: {
    color: "#5A6670",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  screen: {
    alignItems: "center",
    backgroundColor: "#F7F7F2",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#172026",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
});
