import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  AuthDisplayState,
  AuthProviderActions,
} from "../../../app/providers/AuthProvider";

const inFlightStatuses = new Set([
  "restoring_session",
  "privy_authenticating",
  "privy_authenticated",
  "exchanging_session",
  "logging_out",
]);

export function LoginScreen({
  actions,
  state,
}: {
  actions: AuthProviderActions;
  state: AuthDisplayState;
}) {
  const disabled = inFlightStatuses.has(state.status);
  const isRecovery = state.status === "orphaned_recovery";

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.title}>MyTradeApp</Text>
        <Text style={styles.subtitle}>
          {isRecovery ? "Registration recovery" : "Sign in to continue"}
        </Text>
        {isRecovery ? (
          <Text style={styles.recoveryCopy}>
            Your registration was interrupted. Continue as an Investor, or sign in
            again from the original invitation link.
          </Text>
        ) : null}
        {state.error ? (
          <View style={styles.errorGroup}>
            <Text style={styles.error}>{errorLabel(state.error.code)}</Text>
            <Text style={styles.errorCode}>Error code: {state.error.code}</Text>
            {state.error.details ? (
              <Text style={styles.errorCode}>Details: {state.error.details}</Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          accessibilityLabel="Sign in"
          disabled={disabled}
          onPress={actions.login}
          style={[styles.button, disabled ? styles.buttonDisabled : null]}
        >
          <Text style={styles.buttonText}>{disabled ? "Signing in..." : "Sign in"}</Text>
        </Pressable>
        {isRecovery ? (
          <Pressable
            accessibilityLabel="Continue as Investor"
            disabled={disabled}
            onPress={actions.recoverAsInvestor}
            style={[styles.button, styles.secondaryButton, disabled ? styles.buttonDisabled : null]}
          >
            <Text style={styles.secondaryButtonText}>Continue as Investor</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function errorLabel(code: string): string {
  if (code === "privy_cancelled") {
    return "Sign in was cancelled.";
  }

  if (code === "network_timeout" || code === "network_unavailable") {
    return "Network unavailable. Try again.";
  }

  return "Unable to sign in. Try again.";
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
  buttonDisabled: {
    backgroundColor: "#8FA9A2",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#A33A2D",
    fontSize: 14,
    textAlign: "center",
  },
  errorCode: {
    color: "#6E767D",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  errorGroup: {
    marginTop: 18,
  },
  panel: {
    alignItems: "stretch",
    maxWidth: 360,
    width: "100%",
  },
  recoveryCopy: {
    color: "#5A6670",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    textAlign: "center",
  },
  screen: {
    backgroundColor: "#F7F7F2",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  secondaryButton: {
    backgroundColor: "#E4F1ED",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#1E6B5C",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#5A6670",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  title: {
    color: "#172026",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
});
