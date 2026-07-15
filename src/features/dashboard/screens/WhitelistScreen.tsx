import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ShieldCheck } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import {
  formatIdentityDate,
  maskDocumentNumber,
  type KycIdentityDetails,
} from "../domain/kycIdentityDetails";
import type { DashboardKycSummary } from "../services/dashboardKycRepository";
import type { KycIdentityDetailsClient } from "../services/kycIdentityDetailsClient";

export type WhitelistStatusState =
  | { status: "loading" }
  | { status: "error" }
  | { data: DashboardKycSummary; status: "ready" };

export type WhitelistScreenProps = {
  fetchAccessToken(): Promise<string | null>;
  identityClient: KycIdentityDetailsClient;
  onRefreshCommon(): Promise<void>;
  renderHeader(onRefresh: () => Promise<void>): ReactNode;
  statusState: WhitelistStatusState;
  viewerId: string;
};

type IdentityState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { data: KycIdentityDetails; status: "ready" };

type WhitelistRow =
  | { id: string; kind: "fact"; label: string; value: string }
  | { id: string; kind: "section"; title: string }
  | { id: string; kind: "identity-state"; state: "error" | "loading" };

export function WhitelistScreen({
  fetchAccessToken,
  identityClient,
  onRefreshCommon,
  renderHeader,
  statusState,
  viewerId,
}: WhitelistScreenProps) {
  const [identity, setIdentity] = useState<IdentityState>({ status: "idle" });
  const [refreshing, setRefreshing] = useState(false);
  const requestGeneration = useRef(0);
  const approved = statusState.status === "ready" &&
    statusState.data.status === "approved";

  const loadIdentity = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!approved) {
      setIdentity({ status: "idle" });
      return;
    }

    setIdentity({ status: "loading" });
    try {
      const accessToken = await fetchAccessToken();
      if (!accessToken) {
        if (generation === requestGeneration.current) {
          setIdentity({ status: "error" });
        }
        return;
      }

      const data = await identityClient.fetchDetails(accessToken);
      if (generation === requestGeneration.current) {
        setIdentity({ data, status: "ready" });
      }
    } catch {
      if (generation === requestGeneration.current) {
        setIdentity({ status: "error" });
      }
    }
  }, [approved, fetchAccessToken, identityClient, viewerId]);

  useEffect(() => {
    if (approved) {
      void loadIdentity();
    } else {
      requestGeneration.current += 1;
      setIdentity({ status: "idle" });
    }

    return () => {
      requestGeneration.current += 1;
    };
  }, [approved, loadIdentity, viewerId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const identityRefresh = approved ? loadIdentity() : Promise.resolve();
    await Promise.allSettled([onRefreshCommon(), identityRefresh]);
    setRefreshing(false);
  }, [approved, loadIdentity, onRefreshCommon]);

  const rows = useMemo(
    () => buildRows(statusState, identity),
    [identity, statusState],
  );
  const presentation = statusPresentation(statusState);

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(row) => row.id}
      ListHeaderComponent={(
        <View style={styles.header}>
          {renderHeader(refresh)}
          <View accessibilityLabel="Whitelist status summary" style={styles.statusHeader}>
            <View style={[styles.icon, { backgroundColor: presentation.iconBackground }]}> 
              <ShieldCheck
                accessibilityLabel="Whitelist status shield"
                color={presentation.iconColor}
                size={25}
                strokeWidth={2.2}
              />
            </View>
            <View style={styles.statusCopy}>
              <AppText style={styles.statusTitle}>{presentation.title}</AppText>
              <AppText style={styles.statusDescription} variant="caption">
                {presentation.description}
              </AppText>
            </View>
          </View>
        </View>
      )}
      onRefresh={refresh}
      refreshing={refreshing}
      renderItem={({ item }) => {
        if (item.kind === "section") {
          return (
            <AppText style={styles.sectionTitle} testID={`whitelist-row-${item.id}`}>
              {item.title}
            </AppText>
          );
        }

        if (item.kind === "identity-state") {
          return (
            <View style={styles.inlineState} testID={`whitelist-row-${item.id}`}>
              <AppText style={styles.inlineTitle}>
                {item.state === "loading"
                  ? "Loading identity details"
                  : "Identity details unavailable"}
              </AppText>
              {item.state === "error" ? (
                <Pressable
                  accessibilityLabel="Retry identity details"
                  accessibilityRole="button"
                  onPress={() => { void loadIdentity(); }}
                  style={styles.retry}
                >
                  <AppText style={styles.retryText} variant="caption">Retry</AppText>
                </Pressable>
              ) : null}
            </View>
          );
        }

        return (
          <View style={styles.factRow} testID={`whitelist-row-${item.id}`}>
            <AppText style={styles.factLabel}>{item.label}</AppText>
            <AppText style={styles.factValue}>{item.value}</AppText>
          </View>
        );
      }}
    />
  );
}

function buildRows(
  statusState: WhitelistStatusState,
  identity: IdentityState,
): WhitelistRow[] {
  const presentation = statusPresentation(statusState);
  const reviewedAt = statusState.status === "ready"
    ? formatIdentityDate(statusState.data.reviewedAt)
    : "Unavailable";
  const approved = statusState.status === "ready" &&
    statusState.data.status === "approved";
  const rows: WhitelistRow[] = [
    {
      id: "status:verification",
      kind: "fact",
      label: "KYC verification",
      value: presentation.value,
    },
    {
      id: "status:verification-date",
      kind: "fact",
      label: "Verification date",
      value: reviewedAt,
    },
    {
      id: "status:valid-until",
      kind: "fact",
      label: "Valid until",
      value: approved ? "Permanent" : "Unavailable",
    },
  ];

  if (!approved) return rows;

  rows.push({ id: "identity:heading", kind: "section", title: "Identity details" });
  if (identity.status === "loading" || identity.status === "idle") {
    rows.push({ id: "identity:state", kind: "identity-state", state: "loading" });
    return rows;
  }
  if (identity.status === "error") {
    rows.push({ id: "identity:state", kind: "identity-state", state: "error" });
    return rows;
  }

  rows.push(
    identityRow("identity:name", "Name", identity.data.fullName),
    identityRow("identity:country", "Country / region", identity.data.country),
    identityRow("identity:document-type", "Document type", identity.data.docType),
    {
      id: "identity:document-number",
      kind: "fact",
      label: "Document number",
      value: maskDocumentNumber(identity.data.docNumber),
    },
    {
      id: "identity:date-of-birth",
      kind: "fact",
      label: "Date of birth",
      value: formatIdentityDate(identity.data.dateOfBirth),
    },
  );
  return rows;
}

function identityRow(
  id: string,
  label: string,
  value: string | null,
): WhitelistRow {
  return {
    id,
    kind: "fact",
    label,
    value: value ?? "Unavailable",
  };
}

function statusPresentation(state: WhitelistStatusState): {
  description: string;
  iconBackground: string;
  iconColor: string;
  title: string;
  value: string;
} {
  if (state.status === "loading") {
    return {
      description: "Your latest verification status is being loaded.",
      iconBackground: colors.surfaceMuted,
      iconColor: colors.muted,
      title: "Loading whitelist status",
      value: "Loading",
    };
  }
  if (state.status === "error") {
    return {
      description: "Your latest verification status could not be loaded.",
      iconBackground: colors.dangerMuted,
      iconColor: colors.danger,
      title: "Whitelist status unavailable",
      value: "Unavailable",
    };
  }

  switch (state.data.status) {
    case "approved":
      return {
        description: "Your identity verification is complete.",
        iconBackground: colors.primarySoft,
        iconColor: colors.primary,
        title: "Whitelist approved",
        value: "Approved",
      };
    case "pending":
      return {
        description: "Finish the remaining identity verification steps.",
        iconBackground: colors.surfaceMuted,
        iconColor: colors.champagne,
        title: "Complete KYC steps",
        value: "Pending",
      };
    case "under_review":
      return {
        description: "Your submitted information is being reviewed.",
        iconBackground: colors.surfaceMuted,
        iconColor: colors.champagne,
        title: "Review in progress",
        value: "Under review",
      };
    case "awaiting_resubmission":
      return {
        description: "The verification provider needs updated information.",
        iconBackground: colors.surfaceMuted,
        iconColor: colors.champagne,
        title: "More information required",
        value: "Resubmission required",
      };
    case "rejected":
      return {
        description: "Contact support if you need help with this decision.",
        iconBackground: colors.dangerMuted,
        iconColor: colors.danger,
        title: "Whitelist not approved",
        value: "Rejected",
      };
    default:
      return {
        description: "No KYC application is associated with this account.",
        iconBackground: colors.surfaceMuted,
        iconColor: colors.muted,
        title: "Whitelist not started",
        value: "Not started",
      };
  }
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  factLabel: {
    color: colors.muted,
    flexBasis: "42%",
    flexGrow: 0,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  factRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 56,
    paddingVertical: spacing.md,
  },
  factValue: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "right",
  },
  header: {
    gap: spacing.lg,
  },
  icon: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  inlineState: {
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  inlineTitle: {
    fontWeight: "700",
  },
  retry: {
    justifyContent: "center",
    minHeight: 40,
    paddingRight: spacing.lg,
  },
  retryText: {
    color: colors.primary,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    paddingBottom: spacing.sm,
    paddingTop: spacing.xl,
  },
  statusCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  statusDescription: {
    lineHeight: 18,
  },
  statusHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
});
