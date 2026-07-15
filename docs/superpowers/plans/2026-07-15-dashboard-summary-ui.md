# Dashboard Summary UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dashboard's undifferentiated summary panel with the approved mobile two-by-two metric grid and secondary commission row.

**Architecture:** Keep `DashboardScreen` responsible for loading and display formatting, then pass display-ready values into a focused `DashboardSummary` presentation component. Keep the metric tile private to that component so visual hierarchy changes do not affect repositories, viewer identity, or chain reads.

**Tech Stack:** React 19, React Native 0.86, TypeScript, Lucide React Native, Vitest, React Test Renderer

---

### Task 1: Lock The Approved Summary Structure With A Failing Test

**Files:**
- Modify: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Add a test for four primary metrics and the separate commission row**

Add this assertion block to the existing `renders profile, portfolio summary, holdings, and KYC status` test after rendering:

```tsx
expect(renderer!.root.findByProps({ accessibilityLabel: "Portfolio value metric" })).toBeTruthy();
expect(renderer!.root.findByProps({ accessibilityLabel: "Total PnL metric" })).toBeTruthy();
expect(renderer!.root.findByProps({ accessibilityLabel: "Tier and points metric" })).toBeTruthy();
expect(renderer!.root.findByProps({ accessibilityLabel: "KYC metric" })).toBeTruthy();
expect(renderer!.root.findByProps({ accessibilityLabel: "Commission summary" })).toBeTruthy();
```

- [ ] **Step 2: Run the targeted test and confirm RED**

Run:

```bash
npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx
```

Expected: FAIL because no element currently has `accessibilityLabel="Portfolio value metric"`.

### Task 2: Implement The Approved Metric Grid

**Files:**
- Create: `src/features/dashboard/components/DashboardSummary.tsx`
- Modify: `src/features/dashboard/screens/DashboardScreen.tsx`
- Modify: `test/mocks/lucide-react-native.tsx`
- Test: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Create the presentation-only summary component**

Create `DashboardSummary.tsx` with a display-ready contract:

```tsx
import {
  LayoutGrid,
  ShieldCheck,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, colors, radii, spacing } from "../../../shared/ui";

type MetricTone = "default" | "negative" | "positive";

export type DashboardSummaryProps = {
  commissionValue: string;
  kycTone: MetricTone;
  kycValue: string;
  pnlAmount: string;
  pnlPercent: string;
  pnlTone: MetricTone;
  pointsValue: string;
  portfolioValue: string;
  tierValue: string;
};

type MetricTileProps = {
  accessibilityLabel: string;
  emphasized?: boolean;
  icon: LucideIcon;
  label: string;
  secondaryValue?: string;
  tone?: MetricTone;
  value: string;
};

export function DashboardSummary(props: DashboardSummaryProps) {
  return (
    <View style={styles.summary}>
      <View style={styles.metricGrid}>
        <MetricTile accessibilityLabel="Portfolio value metric" emphasized icon={Wallet} label="Portfolio value" value={props.portfolioValue} />
        <MetricTile accessibilityLabel="Total PnL metric" icon={TrendingUp} label="Total PnL" secondaryValue={props.pnlPercent} tone={props.pnlTone} value={props.pnlAmount} />
        <MetricTile accessibilityLabel="Tier and points metric" icon={LayoutGrid} label="Tier / points" secondaryValue={props.pointsValue} value={props.tierValue} />
        <MetricTile accessibilityLabel="KYC metric" icon={ShieldCheck} label="KYC status" tone={props.kycTone} value={props.kycValue} />
      </View>
      <View accessibilityLabel="Commission summary" style={styles.commissionRow}>
        <AppText variant="caption">Commission earned</AppText>
        <AppText style={styles.commissionValue}>{props.commissionValue}</AppText>
      </View>
    </View>
  );
}

function MetricTile({
  accessibilityLabel,
  emphasized = false,
  icon: Icon,
  label,
  secondaryValue,
  tone = "default",
  value,
}: MetricTileProps) {
  const statusStyle = tone === "negative"
    ? styles.negative
    : tone === "positive"
      ? styles.positive
      : undefined;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.metricTile, emphasized && styles.emphasizedTile]}
    >
      <View style={styles.metricHeading}>
        <Icon
          color={emphasized ? colors.primaryMuted : colors.muted}
          size={17}
          strokeWidth={2.2}
        />
        <AppText style={[styles.metricLabel, emphasized && styles.emphasizedLabel]}>
          {label}
        </AppText>
      </View>
      <View style={styles.metricNumbers}>
        <AppText
          style={[
            styles.metricValue,
            emphasized && styles.emphasizedValue,
            !emphasized && statusStyle,
          ]}
        >
          {value}
        </AppText>
        {secondaryValue ? (
          <AppText style={[styles.metricSecondary, statusStyle]}>
            {secondaryValue}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  commissionRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commissionValue: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
  },
  emphasizedLabel: {
    color: colors.primaryMuted,
  },
  emphasizedTile: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  emphasizedValue: {
    color: colors.surface,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  metricHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  metricNumbers: {
    gap: spacing.xs,
  },
  metricSecondary: {
    fontSize: 14,
    fontWeight: "700",
  },
  metricTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 116,
    padding: spacing.md,
    width: "48%",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  negative: {
    color: colors.danger,
  },
  positive: {
    color: colors.primary,
  },
  summary: {
    gap: spacing.sm,
  },
});
```

The component remains presentation-only and must not import repositories, Supabase, viem, or auth state.

Add `LayoutGrid`, `RefreshCw`, `ShieldCheck`, `TrendingUp`, and `Wallet` to the existing Lucide test mock using its `createIcon` helper so component tests exercise valid elements.

- [ ] **Step 2: Replace the old five-block summary in DashboardScreen**

Import `RefreshCw` and the new `DashboardSummary`. Replace the visible `Refresh` text with:

```tsx
<Pressable
  accessibilityLabel="Refresh dashboard"
  accessibilityRole="button"
  onPress={() => { void load(); }}
  style={styles.refreshButton}
>
  <RefreshCw color={colors.primary} size={19} strokeWidth={2.4} />
</Pressable>
```

Replace `styles.summaryBand` and all five `SummaryMetric` calls with:

```tsx
<DashboardSummary
  commissionValue={commissionLabel(commission)}
  kycTone={kyc?.approved ? "positive" : "default"}
  kycValue={kycLabel(kyc)}
  pnlAmount={signedMoney(holdings?.summary.totalPnlUsdt ?? "0")}
  pnlPercent={signedPercent(holdings?.summary.pnlPercent ?? "0")}
  pnlTone={isNegative(holdings?.summary.totalPnlUsdt) ? "negative" : "positive"}
  pointsValue={`${formatPoints(profile?.totalPoints)} points`}
  portfolioValue={money(holdings?.summary.totalValueUsdt ?? "0")}
  tierValue={`Tier ${formatTier(profile?.tier)}`}
/>
```

Delete the obsolete local `SummaryMetric`, `metric`, `metricValue`, `summaryBand`, and text refresh styles. Add a stable 40 by 40 `refreshButton` style with centered content, `colors.primarySoft`, and `radii.lg`.

- [ ] **Step 3: Run the targeted test and confirm GREEN**

Run:

```bash
npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 4: Run navigation regression tests**

Run:

```bash
npm test -- src/app/navigation src/features/dashboard
```

Expected: all navigation and Dashboard tests pass.

### Task 3: Verify Quality And Delivery Gates

**Files:**
- Verify: `src/features/dashboard/components/DashboardSummary.tsx`
- Verify: `src/features/dashboard/screens/DashboardScreen.tsx`
- Verify: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Run the full source test suite and typecheck**

Run:

```bash
npm test -- src
npm run typecheck
```

Expected: every source test passes and TypeScript exits 0.

- [ ] **Step 2: Run forbidden-pattern and whitespace scans**

Run:

```bash
rg "from.+supabase|from.+viem" src/features/dashboard/screens src/features/dashboard/components
rg "key=\{.*index\}" src/features/dashboard --type tsx
git diff --check
```

Expected: the first two scans return no matches; `git diff --check` exits 0.

- [ ] **Step 3: Run AI Delivery audit**

Run:

```bash
npm run ai:audit -- rn-full-app-port
```

Expected: audit passes with no cross-document consistency issue.

- [ ] **Step 4: Review responsive constraints**

Inspect the component styles and rendered Dashboard at narrow and standard phone widths. Confirm four tiles remain in two columns, metric text wraps within each tile, the refresh control stays 40 by 40, and no content overlaps.

- [ ] **Step 5: Commit only the Dashboard UI adjustment**

```bash
git add \
  docs/superpowers/plans/2026-07-15-dashboard-summary-ui.md \
  src/features/dashboard/components/DashboardSummary.tsx \
  src/features/dashboard/screens/DashboardScreen.tsx \
  src/features/dashboard/__tests__/DashboardScreen.test.tsx \
  test/mocks/lucide-react-native.tsx
git commit -m "feat: refine dashboard summary UI"
```

Expected: the commit contains only the approved Dashboard summary plan, component, screen integration, and test update.
