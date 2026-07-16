# Dashboard Tab Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Dashboard header and content at the same horizontal position when switching among Holdings, Transactions, Whitelist, and Rewards.

**Architecture:** Preserve the existing one-`FlatList`-per-active-tab structure. Add a regression assertion at the parent Dashboard boundary, then normalize the two divergent child list containers to the existing 16 px Dashboard padding.

**Tech Stack:** React Native, TypeScript, Vitest, react-test-renderer

---

### Task 1: Normalize Dashboard tab content padding

**Files:**
- Modify: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`
- Modify: `src/features/dashboard/screens/WhitelistScreen.tsx`
- Modify: `src/features/referral/screens/RewardsScreen.tsx`

- [ ] **Step 1: Write the failing regression test**

Add this test after the existing single-active-list test in `DashboardScreen.test.tsx`:

```tsx
it("keeps horizontal content padding consistent across Dashboard tabs", async () => {
  const renderer = await renderDashboard();
  const activePadding = () => flattenStyle(
    renderer.root.findByType(FlatList).props.contentContainerStyle,
  ).paddingHorizontal;

  expect(activePadding()).toBe(16);
  await press(renderer, "Transactions");
  expect(activePadding()).toBe(16);
  await press(renderer, "Whitelist");
  expect(activePadding()).toBe(16);
  await press(renderer, "Rewards");
  expect(activePadding()).toBe(16);
});
```

- [ ] **Step 2: Run the regression test and confirm RED**

Run:

```bash
npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx
```

Expected: FAIL in `keeps horizontal content padding consistent across Dashboard tabs` when Whitelist is active, with expected `16` and received `24`.

- [ ] **Step 3: Apply the minimal spacing fix**

In `src/features/dashboard/screens/WhitelistScreen.tsx`, change:

```tsx
content: {
  paddingBottom: spacing.xl,
  paddingHorizontal: spacing.md,
},
```

In `src/features/referral/screens/RewardsScreen.tsx`, change:

```tsx
content: {
  paddingBottom: spacing.xl,
  paddingHorizontal: spacing.md,
},
```

Do not change row padding, header gaps, segmented-control styles, or list structure.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run:

```bash
npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx src/features/dashboard/__tests__/WhitelistScreen.test.tsx src/features/referral/__tests__/RewardsScreen.test.tsx
```

Expected: all three test files pass, including the new padding regression test.

- [ ] **Step 5: Run static and delivery verification**

Run:

```bash
npm run typecheck
git diff --check
npm run ai:audit -- rn-full-app-port
npm run ai:verify -- rn-full-app-port --write
```

Expected: every command exits 0 and AI Delivery reports all configured checks passing.

- [ ] **Step 6: Commit the verified fix**

```bash
git add \
  docs/superpowers/plans/2026-07-16-dashboard-tab-spacing.md \
  src/features/dashboard/__tests__/DashboardScreen.test.tsx \
  src/features/dashboard/screens/WhitelistScreen.tsx \
  src/features/referral/screens/RewardsScreen.tsx \
  docs/ai-delivery/runs/2026-07-15-rn-full-app-port-verification.md
git commit -m "fix: align dashboard tab content spacing"
```

If AI Delivery updates a different tracked verification artifact, stage that named artifact instead of using a broad add command.
