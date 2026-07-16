# Profile Invite Loading Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Profile invite command's heavy loading feedback card with a stable, accessible two-line skeleton placeholder.

**Architecture:** Keep the existing invite command state machine and render a dedicated skeleton only for `inviteFeedback === "loading"`. Preserve the existing text and Retry presentation for every closed-gate and error result so no authentication, KYC, invite, or sharing behavior changes.

**Tech Stack:** React Native, TypeScript, Vitest, react-test-renderer

---

### Task 1: Render an accessible invite loading skeleton

**Files:**
- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`
- Modify: `src/app/navigation/AppNavigator.tsx`

- [ ] **Step 1: Write the failing loading-state test**

Add this test before `opens the invite sheet directly from Profile with real values` in `src/app/navigation/__tests__/AppNavigator.test.tsx`:

```tsx
it("shows a stable skeleton while invite details are loading", async () => {
  const rewardsDependencies = createRewardsDependencies();
  rewardsDependencies.rewardsProfileRepository.fetchProfile = vi.fn()
    .mockReturnValue(new Promise<never>(() => undefined));
  const renderer = await renderProfile({
    publicWebOrigin: "https://test.artstarex.com",
    rewardsDependencies,
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: "Profile item 邀请好友" })
      .props.onPress();
    await Promise.resolve();
  });

  const skeleton = renderer.root.findByProps({
    accessibilityLabel: "Loading invite details",
  });
  expect(skeleton.props.accessibilityRole).toBe("progressbar");
  expect(skeleton.props.style).toMatchObject({ minHeight: 64 });
  expect(renderer.root.findByProps({ testID: "invite-loading-primary" }))
    .toBeTruthy();
  expect(renderer.root.findByProps({ testID: "invite-loading-secondary" }))
    .toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: "Invite command status" }))
    .toHaveLength(0);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx
```

Expected: FAIL in `shows a stable skeleton while invite details are loading` because no node has accessibility label `Loading invite details`.

- [ ] **Step 3: Add the minimal loading-only render branch**

In `ProfileRoute` within `src/app/navigation/AppNavigator.tsx`, replace the current single feedback conditional with:

```tsx
{inviteFeedback === "loading" ? (
  <View
    accessibilityLabel="Loading invite details"
    accessibilityRole="progressbar"
    style={styles.inviteSkeleton}
  >
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.inviteSkeletonLines}
    >
      <View testID="invite-loading-primary" style={styles.inviteSkeletonPrimary} />
      <View testID="invite-loading-secondary" style={styles.inviteSkeletonSecondary} />
    </View>
  </View>
) : inviteFeedback !== "idle" ? (
  <View accessibilityLabel="Invite command status" style={styles.inviteFeedback}>
    <AppText style={styles.inviteFeedbackText} variant="body">
      {inviteFeedbackLabel(inviteFeedback)}
    </AppText>
    {inviteFeedback === "unavailable" ? (
      <Pressable
        accessibilityLabel="Retry invite"
        accessibilityRole="button"
        onPress={onInvitePress}
        style={styles.inviteRetry}
      >
        <AppText style={styles.inviteRetryText} variant="caption">Retry</AppText>
      </Pressable>
    ) : null}
  </View>
) : null}
```

Add these styles next to the existing invite feedback styles:

```tsx
inviteSkeleton: {
  backgroundColor: colors.surface,
  justifyContent: "center",
  marginHorizontal: spacing.lg,
  minHeight: 64,
  paddingHorizontal: spacing.lg,
},
inviteSkeletonLines: {
  gap: spacing.sm,
},
inviteSkeletonPrimary: {
  backgroundColor: colors.border,
  borderRadius: 4,
  height: 12,
  width: "58%",
},
inviteSkeletonSecondary: {
  backgroundColor: colors.border,
  borderRadius: 4,
  height: 12,
  width: "36%",
},
```

Do not modify `handleInvitePress`, `runInviteFriendCommand`, closed-gate messages, Retry behavior, or invite sheet behavior.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx
```

Expected: the navigator test file passes, including the new loading skeleton test and existing error/Retry tests.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run typecheck
npm test
git diff --check
npm run ai:audit -- rn-full-app-port
npm run ai:verify -- rn-full-app-port --write
```

Expected: TypeScript exits 0, all Vitest files pass, the diff has no whitespace errors, AI Delivery audit passes, and all configured verification checks pass.

- [ ] **Step 6: Review the scoped diff**

Confirm that the production diff changes only the Profile invite loading presentation and that no `.env`, `.gstack/`, or `.superpowers/brainstorm/` files are staged.

- [ ] **Step 7: Commit the verified change**

```bash
git add \
  docs/superpowers/plans/2026-07-16-profile-invite-loading-skeleton.md \
  src/app/navigation/AppNavigator.tsx \
  src/app/navigation/__tests__/AppNavigator.test.tsx \
  docs/ai-delivery/runs/2026-07-15-rn-full-app-port-verification.md
git commit -m "style: refine profile invite loading state"
```

If AI Delivery updates a different tracked verification artifact, stage that exact artifact instead of using a broad add command.
