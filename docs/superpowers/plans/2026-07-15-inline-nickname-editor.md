# Inline Nickname Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dashboard nickname editor's visible Save and Cancel buttons with a compact inline input that saves once on keyboard submission or focus loss.

**Architecture:** Keep the existing `nicknameUpdater`, RPC repository, validation, and profile refresh unchanged. `DashboardScreen` owns the interaction state and uses a ref-based in-flight guard so a keyboard submit followed by blur cannot create duplicate writes.

**Tech Stack:** React 19, React Native 0.86, TypeScript, Vitest, React Test Renderer

---

### Task 1: Lock The Buttonless Interaction With Failing Tests

**Files:**
- Modify: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Add a test for the buttonless editor and single write**

Add this test inside `describe("DashboardScreen", ...)`:

```tsx
it("edits the nickname without action buttons and saves once", async () => {
  const dependencies = createDependencies();
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = TestRenderer.create(
      <DashboardScreen {...dependencies} viewerState={viewerState()} />,
    );
    await Promise.resolve();
  });

  await act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: "Edit nickname" }).props.onPress();
  });

  expect(JSON.stringify(renderer!.toJSON())).not.toContain("Save");
  expect(JSON.stringify(renderer!.toJSON())).not.toContain("Cancel");

  await act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: "Nickname" }).props.onChangeText("Alicia");
  });

  await act(async () => {
    const input = renderer!.root.findByProps({ accessibilityLabel: "Nickname" });
    input.props.onSubmitEditing();
    input.props.onBlur();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(dependencies.nicknameRepository.updateNickname).toHaveBeenCalledTimes(1);
  expect(dependencies.nicknameRepository.updateNickname).toHaveBeenCalledWith("Alicia");
});
```

- [ ] **Step 2: Add an unchanged-value test**

```tsx
it("closes unchanged nickname editing without a write", async () => {
  const dependencies = createDependencies();
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = TestRenderer.create(
      <DashboardScreen {...dependencies} viewerState={viewerState()} />,
    );
    await Promise.resolve();
  });

  await act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: "Edit nickname" }).props.onPress();
  });

  await act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: "Nickname" }).props.onBlur();
    await Promise.resolve();
  });

  expect(dependencies.nicknameRepository.updateNickname).not.toHaveBeenCalled();
  expect(renderer!.root.findAllByProps({ accessibilityLabel: "Nickname" })).toHaveLength(0);
});
```

- [ ] **Step 3: Run the targeted test and confirm RED**

Run:

```bash
npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx
```

Expected: the new test fails because the current editor still renders `Save` and `Cancel`, and its input has no `onBlur` or `onSubmitEditing` handler.

### Task 2: Implement Inline Commit Behavior

**Files:**
- Modify: `src/features/dashboard/screens/DashboardScreen.tsx`
- Test: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Add a single-flight guard and unchanged-value exit**

Import `useRef`, remove the now-unused `Button` import, and create the guard beside the nickname state:

```tsx
const nicknameSaveInFlight = useRef(false);
```

Replace `saveNickname` with:

```tsx
const saveNickname = useCallback(async () => {
  if (nicknameSaveInFlight.current) return;
  nicknameSaveInFlight.current = true;

  try {
    const currentNickname = profile?.nickname ?? null;
    if (nicknameDraft.trim() === (currentNickname ?? "").trim()) {
      setEditingNickname(false);
      setNicknameError(null);
      return;
    }

    const result = await nicknameUpdater({
      currentNickname,
      draft: nicknameDraft,
    });

    if (!result.ok) {
      setNicknameError(nicknameErrorLabel(result.reason));
      return;
    }

    setEditingNickname(false);
    setNicknameError(null);
  } catch {
    setNicknameError("Unable to update nickname");
  } finally {
    nicknameSaveInFlight.current = false;
  }
}, [nicknameDraft, nicknameUpdater, profile?.nickname]);
```

- [ ] **Step 2: Replace the button group with inline input events**

Use the existing `Input` component with compact presentation and native keyboard behavior:

```tsx
<Input
  accessibilityLabel="Nickname"
  autoFocus
  onBlur={() => { void saveNickname(); }}
  onChangeText={setNicknameDraft}
  onSubmitEditing={() => { void saveNickname(); }}
  placeholder="Set nickname"
  returnKeyType="done"
  selectTextOnFocus
  style={styles.nicknameInput}
  submitBehavior="blurAndSubmit"
  value={nicknameDraft}
/>
```

Delete the `nicknameActions` view and its Save/Cancel buttons. Keep the existing inline error immediately below the input.

- [ ] **Step 3: Apply the compact underline style**

Replace the obsolete `nicknameActions` style and tighten `nicknameEditor`:

```tsx
nicknameEditor: {
  gap: spacing.xs,
  width: 220,
},
nicknameInput: {
  borderColor: colors.primary,
  borderRadius: 0,
  borderWidth: 0,
  borderBottomWidth: 1,
  fontSize: 14,
  minHeight: 36,
  paddingHorizontal: 0,
  paddingVertical: spacing.xs,
},
```

- [ ] **Step 4: Run the targeted test and confirm GREEN**

Run:

```bash
npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx
```

Expected: 6 tests pass, including one nickname write for simultaneous submit/blur and zero writes for unchanged blur.

### Task 3: Verify The Dashboard Regression Surface

**Files:**
- Verify: `src/features/dashboard/screens/DashboardScreen.tsx`
- Verify: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Run Dashboard/navigation tests and typecheck**

```bash
npm test -- src/app/navigation src/features/dashboard
npm run typecheck
```

Expected: all selected tests pass and TypeScript exits 0.

- [ ] **Step 2: Run full source verification and AI Delivery audit**

```bash
npm test -- src
npm run ai:audit -- rn-full-app-port
git diff --check
```

Expected: all source tests pass, AI Delivery audit passes, and no whitespace error is reported.

- [ ] **Step 3: Compile through the running iOS Metro service**

```bash
curl -sS -o /dev/null -w '%{http_code}' 'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false'
```

Expected: HTTP `200`.

- [ ] **Step 4: Leave implementation uncommitted with the existing Task 5 work**

The Dashboard screen and test are currently untracked Task 5 files. Do not create a partial commit that omits their imported services and domain modules. Report the verified working-tree change for inclusion in the eventual complete Task 5 commit.
