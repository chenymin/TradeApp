import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  AuthProviderActions,
  AuthProviderState,
} from "../../../app/providers/AuthProvider";
import { AccountDisabledScreen } from "./AccountDisabledScreen";
import { LoginScreen } from "./LoginScreen";

export function AuthGate({
  actions,
  state,
}: {
  actions: AuthProviderActions;
  state: AuthProviderState;
}) {
  if (state.status === "restoring_session") {
    return <CenteredLabel label="Restoring session" />;
  }

  if (state.status === "account_disabled") {
    return <AccountDisabledScreen onLogout={actions.logout} />;
  }

  if (state.status === "authenticated") {
    return <AuthenticatedHome onLogout={actions.logout} />;
  }

  return <LoginScreen actions={actions} state={state} />;
}

function AuthenticatedHome({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Dashboard</Text>
      <Pressable accessibilityLabel="Sign out" onPress={onLogout} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function CenteredLabel({ label }: { label: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{label}</Text>
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
