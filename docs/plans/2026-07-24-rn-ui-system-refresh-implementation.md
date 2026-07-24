# React Native UI System Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Institutional Clarity visual system and restrained Apple Glass chrome, then migrate Dashboard and Wallet without changing their data, navigation, authentication, or wallet mutation behavior.

**Architecture:** Static design tokens, typography, `GlassSurface`, and grouped skeleton primitives form the only new shared layer. Navigation chrome consumes `GlassSurface`; Dashboard and Wallet own their summaries, rows, section headings, and content-shaped skeletons while continuing to consume the current loaders, Viewer, workflows, callbacks, and route state unchanged.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript 6, React 19, Vitest, React Native Testing Library, `expo-glass-effect`, `expo-blur`, React Native Animated, Lucide React Native.

---

日期：2026-07-24  
Feature slug：`rn-ui-system-refresh`  
状态：已规划

## 输入文档

- 需求：`docs/requirements/2026-07-24-rn-ui-system-refresh.md`
- 方案：`docs/plans/2026-07-24-rn-ui-system-refresh-design.md`
- 视觉证据：`.superpowers/brainstorm/34432-1784817100/content/dashboard-wallet-structure.html`

## Decision Notes

| 决策 | 来源 | 实现影响 |
| ---- | ---- | -------- |
| `Institutional Clarity` + `Restrained Apple Glass` | 用户确认 | 核心数据用实色高对比；glass 仅用于 Header、BottomTabBar、Dashboard segmented control 和 overlay 外层 |
| 共享层只包含 theme/AppText/GlassSurface/Skeleton | 工程评审选择 A | 不新增通用 `IconButton`、`SectionHeader`、金融数据行或业务摘要；现有 Button/Pressable 继续使用 |
| iOS 26 native glass，旧 iOS blur，Android static translucent | 方案设计 | 所有平台走一个 `GlassSurface` adapter；业务页面不得出现 Platform/native capability 分支 |
| 页面 skeleton 留在 feature 内 | 需求与方案 | `SkeletonGroup` 只管理一个动画值；具体摘要和行轮廓由 Dashboard/Wallet 自己表达 |
| 不修改业务行为 | 用户约束 | loaders、Viewer、wallet selection/unlink machine、action eligibility、route state、回调和数据格式全部保持现状 |
| 不把 loading 显示为 `$0.00` | 方案设计 | Dashboard 的 loading 分支必须渲染同形 skeleton；真实 0 只在 loader ready 后出现 |
| 保留真实五个底部 Tab | 当前导航契约 | route 名称、顺序、requiresAuth 和 callback 不变，只调整 presentation |

## 文件与职责

| 文件 | 动作 | 单一职责 |
| ---- | ---- | -------- |
| `DESIGN.md` | Create | 记录稳定视觉 token、材质边界、骨架与可访问性规则 |
| `package.json`, `package-lock.json` | Modify | 安装 Expo 57 对齐的 glass/blur 原生模块 |
| `src/shared/ui/theme.ts` | Modify | 静态颜色、排版、间距、圆角、motion、glass fallback token |
| `src/shared/ui/AppText.tsx` | Modify | 将有限的文本 variant 和 tabular number contract 映射为 RN Text style |
| `src/shared/ui/GlassSurface.tsx` | Create | 唯一 native glass/blur/static/opaque adapter 与纯 selector |
| `src/shared/ui/Skeleton.tsx` | Create | 一个 group 一个 Animated value，并提供无业务语义的 block |
| `src/shared/ui/SegmentedControl.tsx` | Modify | 新增 opt-in `surface="glass"`，默认外观和 value/onChange contract 不变 |
| `src/shared/ui/index.ts` | Modify | 只导出以上稳定共享能力 |
| `src/shared/ui/__tests__/visualPrimitives.test.tsx` | Create | selector、文字、骨架、segmented contract 的纯/component tests |
| `src/app/navigation/components/AppHeader.tsx` | Modify | brand/route title variant 与 glass chrome，不接 feature 副作用 |
| `src/app/navigation/components/BottomTabBar.tsx` | Modify | glass surface 与选中态，不改变 tab contract |
| `src/app/navigation/navigationState.ts` | Modify | Dashboard/Wallet header presentation metadata；不改变 route access/target |
| `src/app/navigation/__tests__/navigationChrome.test.tsx` | Modify | header variant、五 tab、44x44 与 callback 回归 |
| `src/app/navigation/__tests__/navigationState.test.ts` | Modify | route/header contract 回归 |
| `src/features/dashboard/components/DashboardSummarySkeleton.tsx` | Create | Dashboard 核心摘要和指标同形 loading UI |
| `src/features/dashboard/components/DashboardRowsSkeleton.tsx` | Create | 两条 feature-local 数据行 skeleton |
| `src/features/dashboard/components/DashboardHeader.tsx` | Modify | 页面身份、warning、ready/loading summary、glass tabs |
| `src/features/dashboard/components/DashboardSummary.tsx` | Modify | 一个 hero + 紧凑指标，保持输入 props 纯展示 |
| `src/features/dashboard/screens/DashboardScreen.tsx` | Modify | 仅将现有 status 映射为新版 presentation；继续拥有 loader/callback |
| `src/features/dashboard/__tests__/DashboardScreen.test.tsx` | Modify | loading/ready/empty/partial/long text/callback 回归 |
| `src/features/wallet/components/WalletBalanceSkeleton.tsx` | Create | token identity、辅助信息和金额同形 skeleton |
| `src/features/wallet/components/WalletBalanceSection.tsx` | Modify | 扁平余额行、刷新、partial failure 与 feature skeleton |
| `src/features/wallet/components/WalletIdentitySection.tsx` | Modify | active hero、linked row、稳定 action slots 与 danger semantics |
| `src/features/wallet/components/WalletReceiveSection.tsx` | Modify | 实色 QR、地址与既有 copy/share commands |
| `src/features/wallet/screens/WalletScreen.tsx` | Modify | 页面编排和 responsive layout，不改变 workflow 生命周期 |
| `src/features/wallet/__tests__/WalletScreen.test.tsx` | Modify | loading、linked/mutation/recovery、连续操作与长内容回归 |

## 结构约束

- `AppHeader`、`BottomTabBar`、`DashboardScreen`、`WalletScreen` 仍是组合入口，不允许加入新的数据读取、provider 调用、token/session 逻辑或 wallet eligibility 判断。
- `GlassSurface` 是唯一允许 import `expo-glass-effect` / `expo-blur` 的业务源文件；页面只传 `variant`、children 与 layout style。
- `SkeletonGroup` 是唯一创建 skeleton `Animated.Value`、loop 和 accessibility preference listener 的模块；`SkeletonBlock` 不创建 timer/listener。
- 业务摘要、区块标题、holding/transaction/balance/wallet rows 保留在各 feature，禁止为“看起来一致”建立跨领域 row model。
- 不新增 registry、strategy、handler map 或大型 action switch。presentation selector 是纯函数，workflow state machine 保持现状。
- `SegmentedControl` 的 glass 为 opt-in；Launchpad、Market、Rewards 在未迁移前不被迫使用新材质。

## 结构验收标准

- shared UI 不 import Auth Viewer、Supabase、Privy、Reown、wallet domain 或 Dashboard loader。
- `DashboardScreen` 的 Promise/load/nickname 流程和 `WalletScreen` 的 selection/unlink effect 结构不因视觉迁移而重写。
- 新共享抽象仅有 theme、AppText、GlassSurface、Skeleton；无 `IconButton.tsx`、`SectionHeader.tsx` 或 `FinancialRow.tsx`。
- 图标 Pressable 的最小触控范围为 `44 x 44`，保留明确 accessibility label、disabled 和 pressed feedback。
- feature-specific component 只接 presentation props；IO、业务状态与副作用仍由 screen/workflow 提供。
- 不出现大型 `if/else` / `switch` 统一处理所有页面或 wallet action；每个现有 action slot 仍绑定原 handler。

## 模块内聚与可测试性验收标准

- `selectGlassPresentation(input)` 与 `getSkeletonAnimationMode(reduceMotion)` 是不依赖 React/native module 的确定性纯函数。
- `GlassSurface` native branches 通过 Expo module mock 验证，fallback mode 可在 Node/Vitest 中渲染。
- Dashboard/Wallet component tests 继续使用 deterministic fake loaders/workflows，不需要网络、密钥、钱包 app 或 live Supabase。
- 状态、IO、副作用、数据转换、UI 展示保持分离；视觉组件不得把颜色或 spinner 当成业务成功依据。
- 每个现有 mutation handler 至少有一个连续 journey test 证明完成后下一个 `Use`/unlink 仍能 dispatch。
- screenshot/manual QA 使用脱敏 deterministic fixture；不记录完整地址、邮箱、token、signature、SIWE message 或 WalletConnect topic。

## 代码规则约束

| 规则 | 实现位置 | 验证方式 |
| ---- | -------- | -------- |
| 状态机 | Dashboard/Wallet 只消费现有 status/machine | 聚焦 component tests + `git diff` 确认 workflow/domain 无改动 |
| 可信边界 | visual mode 不能推导 session、active wallet 或成功 | import scan；Wallet continuous journey tests |
| 副作用 | glass/skeleton 只含 accessibility/native presentation 副作用 | shared unit tests 验证 listener cleanup 和 single animation group |
| 幂等性 | 不改 wallet operation id、retry 或 convergence | 现有 wallet workflow tests 全量通过 |
| 错误处理 | partial/error/recovery 文案和入口不可删除 | Dashboard/Wallet state matrix tests |
| 数据访问 | 不新增 table/RPC/provider/chain 请求 | UI direct-write/import scans |
| 性能 | Android 无 live blur；FlatList 保留；每 group 单动画值 | source scan + device QA + render count spot check |
| 测试追踪 | 每个需求验收场景映射到 Task/test/manual QA | 本文追踪矩阵 |
| 抽象 | 只共享稳定视觉能力 | file existence/forbidden file scan |
| 配置密钥 | 不新增 env，glass modules 无 secret | env/public config diff scan |
| 兼容回滚 | primitive、navigation、Dashboard、Wallet 分层提交 | 每 Task 独立 commit；glass 可单点回退 opaque |

## Forbidden Patterns

- 禁止修改 `src/features/wallet/workflow/**`、`src/features/wallet/services/**`、Dashboard service/domain、Auth/session、Supabase client、Edge Function 或数据库 migration。
- 禁止绕过约定的数据写入路径；本任务不新增写路径，UI 不得直接 INSERT/UPDATE/UPSERT/DELETE，也不得调用新的 RPC 或 provider write。
- 禁止在 shared UI import Supabase/Privy/Reown/Auth Viewer 或读取 token、storage、wallet provider response。
- 禁止页面直接 import `expo-glass-effect`、`expo-blur` 或复制 `Platform.OS` glass 分支。
- 禁止 Android live blur、列表行 blur、核心金额 glass、QR glass、error/recovery/danger surface glass。
- 禁止每个 skeleton block 创建 `Animated.Value`、loop、timer 或 accessibility listener。
- 禁止 loading 时渲染 `$0.00`、孤立小方块或与最终容器高度不一致的整块灰条。
- 禁止以 index 作为 FlatList/row key，禁止将 Dashboard 列表改为 ScrollView。
- 禁止新增通用 `IconButton`、`SectionHeader`、`FinancialRow` 或第三方 skeleton/UI/font library。
- 禁止删除或改名 wallet action accessibility labels、action-slot testID、retry/remove/delete confirmation、disabled 和互斥规则。
- 禁止改变五个底部 tab 的 route、顺序、requiresAuth、回调或 detail return target。
- 禁止在日志或视觉证据记录 token、session、完整钱包地址、邮箱、signature、SIWE message、provider body 或 WalletConnect topic。
- Do not infer WalletConnect chain support from a wallet's network-management UI; verify the wallet's approved namespace on the exact wallet version and platform. 本任务不改 connector，但真实钱包回归证据仍必须固定 wallet/OS/chain capability matrix。
- Do not collapse connector-selected, provider-linked, platform-primary, and Viewer-active wallets into one state or use one as an implicit substitute for another. UI 继续分别消费既有可信状态，不以视觉选中态替代任一 authority。
- Do not treat a visible button, completed first mutation, or passing unit workflow as proof that the next wallet mutation remains operable; verify the sequential UI journey. Task 5/6 必须验证连续 bind/switch/unlink/repeat。
- Each feature implementation plan must define its own additional forbidden patterns and machine verification commands, then promote stable patterns here with `npm run ai:remember -- feature-name --write`. 本计划已定义本功能禁止模式和扫描；只有经复盘证明稳定的新规则才允许 promote。

## Machine Verification

| 目标 | 命令 | 预期 |
| ---- | ---- | ---- |
| 类型 | `npm run typecheck` | exit 0 |
| shared primitives | `npm test -- --run src/shared/ui/__tests__/visualPrimitives.test.tsx` | 全部通过 |
| navigation | `npm test -- --run src/app/navigation/__tests__/navigationChrome.test.tsx src/app/navigation/__tests__/navigationState.test.ts` | 全部通过 |
| Dashboard | `npm test -- --run src/features/dashboard/__tests__/DashboardScreen.test.tsx` | 全部通过 |
| Wallet | `npm test -- --run src/features/wallet/__tests__/WalletScreen.test.tsx src/features/wallet/__tests__/walletSelectionMachine.test.ts src/features/wallet/__tests__/walletSelectionWorkflow.test.ts src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts` | 全部通过 |
| 全量回归 | `npm test -- --run` | 全部通过 |
| Expo 依赖一致 | `npx expo install --check` | 无版本不匹配 |
| 无 index key | `! rg -n 'key=\\{.*index' src --glob '*.tsx'` | 无匹配 |
| native glass 单入口 | `test "$(rg -l 'expo-glass-effect|expo-blur' src --glob '*.ts' --glob '*.tsx' | wc -l | tr -d ' ')" = "1" && rg -l 'expo-glass-effect|expo-blur' src --glob '*.ts' --glob '*.tsx' | rg 'src/shared/ui/GlassSurface.tsx'` | 只有 GlassSurface 匹配 |
| 无新共享过度抽象 | `test ! -e src/shared/ui/IconButton.tsx && test ! -e src/shared/ui/SectionHeader.tsx && test ! -e src/shared/ui/FinancialRow.tsx` | exit 0 |
| 无 UI 直写数据 | `! rg -n '\\.(insert|upsert|update|delete)\\(' src/shared/ui src/app/navigation src/features/dashboard/components src/features/dashboard/screens src/features/wallet/components src/features/wallet/screens` | 无匹配 |
| 无 auth/provider 进入 shared | `! rg -n 'supabase|Privy|Reown|AuthViewer|SecureStore|accessToken|sessionToken' src/shared/ui --glob '*.ts' --glob '*.tsx'` | 无匹配 |
| 无敏感日志 | `! rg -n 'console\\.(log|error).*?(token|session|signature|siwe|topic|wallet)' src/shared/ui src/app/navigation src/features/dashboard src/features/wallet --glob '*.ts' --glob '*.tsx'` | 无新增敏感匹配 |
| workflow/domain 未改 | `git diff --exit-code HEAD -- src/features/wallet/workflow src/features/wallet/services src/features/dashboard/domain src/features/dashboard/services src/app/auth src/lib/supabase` | 空输出；若基线含用户既有改动，改用任务起始 commit |
| 文档一致 | `npm run ai:audit -- rn-ui-system-refresh` | audit 通过 |
| patch 完整 | `git diff --check` | exit 0 |

## 任务依赖与执行顺序

```text
Task 1 theme/dependencies
       |
       v
Task 2 shared glass+skeleton
       |
       v
Task 3 navigation chrome
       |
       +----------------+
       v                v
Task 4 Dashboard     Task 5 Wallet
       +----------------+
                |
                v
Task 6 cross-platform and final verification
```

- 推荐第一个 Task：Task 1。它锁定 token/API 和原生依赖，后续页面才有稳定输入。
- Task 4 与 Task 5 在 Task 2/3 完成后可并行，但会同时消费 shared token；不得在各自分支再次修改 shared API。
- Task 6 必须等待所有代码合并；Android 最终设备验证可按用户要求集中在全部 Task 完成后执行。

## 任务拆分

### Task 1：锁定视觉 token、文字契约与原生依赖

- 业务场景：后续两个页面使用同一套稳定层级，且 native dependency 与 Expo 57 对齐。
- 范围内：`DESIGN.md`、theme、AppText、依赖安装、pure style tests。
- 范围外：glass adapter、页面布局、业务状态、路由。
- 预计影响文件：`DESIGN.md`、`package.json`、`package-lock.json`、`src/shared/ui/theme.ts`、`src/shared/ui/AppText.tsx`、`src/shared/ui/__tests__/visualPrimitives.test.tsx`。
- 结构约束：theme 只有静态 serializable token；AppText 只有 variant/number presentation。
- 结构验收：无业务 import、无远端字体、无 runtime configuration、现有 AppText 调用保持类型兼容。
- 内聚与可测试性：variant 映射可直接渲染和 flatten style 断言。
- 可追溯：需求“全 App 视觉规范”“长金额”“不新增字体 bundle”；方案 Color/Typography/Spacing/Motion。

- [x] **Step 1：写 theme/AppText RED tests**

在 `visualPrimitives.test.tsx` 断言 `display/pageTitle/sectionTitle/body/label/caption/micro/numberRow` 可渲染，并验证数字 variant：

```tsx
const tree = renderElement(<AppText numeric variant="numberRow">123456.78</AppText>);
expect(findByType(tree, "Text").props.style).toEqual(expect.arrayContaining([
  expect.objectContaining({ fontSize: 16, fontVariant: ["tabular-nums"] }),
]));
expect(colors).toMatchObject({ ink: "#172421", primary: "#176B58" });
expect(spacing).toMatchObject({ page: 20, section: 24 });
```

- [x] **Step 2：运行 RED test**

Run: `npm test -- --run src/shared/ui/__tests__/visualPrimitives.test.tsx`  
Expected: FAIL，缺少新 variants/tokens。

- [x] **Step 3：安装 Expo 对齐模块**

Run: `npx expo install expo-glass-effect expo-blur`  
Expected: `package.json` 与 lockfile 新增 Expo 57 兼容版本，不出现第二套 UI/skeleton/font dependency。

- [x] **Step 4：实现 theme 与兼容 AppText API**

保持旧 `title/subtitle` 为兼容 alias，新增稳定 variant 与 `numeric`：

```ts
export type AppTextVariant =
  | "display" | "pageTitle" | "sectionTitle" | "body"
  | "label" | "caption" | "micro" | "numberRow"
  | "subtitle" | "title";

export const typography = {
  body: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 17 },
  display: { fontSize: 32, fontWeight: "800", lineHeight: 38 },
  label: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: "700", lineHeight: 14 },
  numberRow: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  pageTitle: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
} as const;
```

- [x] **Step 5：写 `DESIGN.md`**

记录 token 值、一个焦点、glass allow/deny list、44x44、内容同形 skeleton、Reduce Motion/Transparency、Android opaque/translucent fallback、feature-local row 原则。不得包含实现进度或账号数据。

- [x] **Step 6：运行 GREEN 与依赖检查**

Run: `npm test -- --run src/shared/ui/__tests__/visualPrimitives.test.tsx && npm run typecheck && npx expo install --check`  
Expected: PASS；Expo 依赖对齐。

执行记录：focused test、全量 test 与 typecheck 均通过；新增 `expo-glass-effect` / `expo-blur` 与 Expo 57 对齐。`expo install --check` 仍报告主分支已存在的 `react-native-get-random-values@2.0.0` 与 `react-native-webview@14.0.1` 偏差，已在未包含本 Task 改动的主目录复现，因此本 Task 不擅自调整 wallet connector 依赖。

- [x] **Step 7：提交 Task 1**

```bash
git add DESIGN.md package.json package-lock.json src/shared/ui/theme.ts src/shared/ui/AppText.tsx src/shared/ui/__tests__/visualPrimitives.test.tsx
git commit -m "feat: define institutional mobile design tokens"
```

### Task 2：实现受控 GlassSurface 与内容同形 Skeleton primitives

- 业务场景：系统能力不同或用户降低动画/透明度时，UI 自动降级但布局和操作不变。
- 范围内：pure selector、glass adapter、single-animation skeleton group、exports/tests。
- 范围外：页面业务 skeleton 形状、wallet state、Android live blur。
- 预计影响文件：`src/shared/ui/GlassSurface.tsx`、`src/shared/ui/Skeleton.tsx`、`src/shared/ui/SegmentedControl.tsx`、`src/shared/ui/index.ts`、`src/shared/ui/__tests__/visualPrimitives.test.tsx`。
- 结构约束：Expo glass/blur import 只在 GlassSurface；one group/one Animated.Value；segmented glass opt-in。
- 结构验收：no Platform branches in feature pages；listener/animation cleanup；默认 SegmentedControl behavior 不变。
- 内聚与可测试性：selectors 纯函数，native modules 可 mock；block 没有 timer。
- 可追溯：需求“克制玻璃跨平台”“内容同形骨架”“Reduce Motion/Transparency”“性能风险”。

- [x] **Step 1：写 selector 与 skeleton RED tests**

```ts
expect(selectGlassPresentation({
  nativeGlassAvailable: true,
  platform: "ios",
  platformVersion: 26,
  reduceTransparency: false,
})).toBe("native_glass");
expect(selectGlassPresentation({
  nativeGlassAvailable: true,
  platform: "ios",
  platformVersion: 26,
  reduceTransparency: true,
})).toBe("opaque");
expect(selectGlassPresentation({
  nativeGlassAvailable: false,
  platform: "android",
  platformVersion: 36,
  reduceTransparency: false,
})).toBe("translucent");
expect(getSkeletonAnimationMode(true)).toBe("static");
```

渲染一个 group 内三个 block，断言只有 group 具有 `accessibilityRole="progressbar"`，block 都使用同一个 injected opacity。

- [x] **Step 2：运行 RED test**

Run: `npm test -- --run src/shared/ui/__tests__/visualPrimitives.test.tsx`  
Expected: FAIL，模块不存在。

- [x] **Step 3：实现 pure selectors 与 accessibility preference cleanup**

```ts
export function selectGlassPresentation(input: GlassCapabilityInput): GlassPresentation {
  if (input.reduceTransparency) return "opaque";
  if (input.platform === "ios" && input.platformVersion >= 26 && input.nativeGlassAvailable) {
    return "native_glass";
  }
  if (input.platform === "ios") return "blur";
  return "translucent";
}

export function getSkeletonAnimationMode(reduceMotion: boolean) {
  return reduceMotion ? "static" as const : "pulse" as const;
}
```

AccessibilityInfo event subscriptions must return cleanup functions; failure to query preferences defaults to opaque/static-safe presentation, not a crash.

- [x] **Step 4：实现 GlassSurface adapter**

`variant` 只允许 `header | navigation | control | overlay`。Native Liquid Glass、BlurView、translucent View 和 opaque View 必须共享同一 outer layout style；danger/data/QR variants 不存在。

- [x] **Step 5：实现 SkeletonGroup/SkeletonBlock**

```tsx
<SkeletonGroup accessibilityLabel="Wallet balances loading">
  <SkeletonBlock height={20} radius={4} width="40%" />
  <SkeletonBlock height={16} radius={4} width="65%" />
</SkeletonGroup>
```

一个 group 创建并 cleanup 一个 `Animated.loop`; static mode 不启动 loop；block 通过 context 消费 opacity。

- [x] **Step 6：给 SegmentedControl 增加 opt-in glass**

新增 `surface?: "solid" | "glass"`，默认 `solid`。只在 `surface === "glass"` 时用 `GlassSurface variant="control"` 包裹，options/value/onChange/key/accessibility contract 完全不变。

- [x] **Step 7：运行 GREEN、单入口与 cleanup tests**

Run: `npm test -- --run src/shared/ui/__tests__/visualPrimitives.test.tsx && npm run typecheck`  
Expected: PASS；unmount 后 animation/listener cleanup spy 各调用一次。

- [x] **Step 8：提交 Task 2**

```bash
git add src/shared/ui/GlassSurface.tsx src/shared/ui/Skeleton.tsx src/shared/ui/SegmentedControl.tsx src/shared/ui/index.ts src/shared/ui/__tests__/visualPrimitives.test.tsx
git commit -m "feat: add restrained glass and skeleton primitives"
```

### Task 3：迁移导航 chrome，保持 route contract

- 业务场景：Header 不再与页面重复标题，底部导航呈现清晰选中态但仍是五个真实 Tab。
- 范围内：brand/route-title header presentation、glass Header/BottomTabBar、selected style、44x44 commands。
- 范围外：route target、requiresAuth、screen content、Dashboard refresh、Wallet balance refresh。
- 预计影响文件：`src/app/navigation/components/AppHeader.tsx`、`src/app/navigation/components/BottomTabBar.tsx`、`src/app/navigation/navigationState.ts`、对应 tests。
- 结构约束：AppHeader 不接 feature callback；BottomTabBar props 和 onSelect signature 不变。
- 结构验收：五 tab 顺序完全相同；Back/Login 触控 >=44；Dashboard/Wallet brand variant 只有一个页面 H1。
- 内聚与可测试性：presentation metadata 由 navigationState 确定；components 只渲染与 dispatch props。
- 可追溯：需求“标题重复”“导航不变”“克制玻璃”“44x44”。

- [ ] **Step 1：写 navigation RED tests**

断言 Dashboard header 使用 `ARTSTAR` brand variant、Wallet 保留 Back、其他 route 保留 title；五 tab 精确顺序和一次 callback：

```ts
expect(getTabRoutes().map(({ routeName }) => routeName)).toEqual([
  "launchpad", "market", "referralPublic", "dashboard", "profile",
]);
await getPressHandler(tree, "Tab Dashboard")();
expect(onSelect).toHaveBeenCalledWith("dashboard");
expect(findByProps(tree, { accessibilityLabel: "Back" }).props.style)
  .toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 44, minWidth: 44 })]));
```

- [ ] **Step 2：运行 RED navigation tests**

Run: `npm test -- --run src/app/navigation/__tests__/navigationChrome.test.tsx src/app/navigation/__tests__/navigationState.test.ts`  
Expected: FAIL，缺少 brand/glass presentation。

- [ ] **Step 3：实现 Header variant 和 glass surface**

Header props新增 `variant: "brand" | "routeTitle"`；brand 显示 `ARTSTAR`，routeTitle 显示原 title。side/action slot 使用稳定宽度，Back/Login/Wallet status 语义不变。

- [ ] **Step 4：实现 BottomTabBar restrained glass**

用 `GlassSurface variant="navigation"` 替换 root surface；保留 route map/key/onPress。选中态只使用 primary icon/text 与 restrained fill，不改变 item 稳定尺寸。

- [ ] **Step 5：运行 GREEN 与 AppNavigator 回归**

Run: `npm test -- --run src/app/navigation/__tests__/navigationChrome.test.tsx src/app/navigation/__tests__/navigationState.test.ts src/app/navigation/__tests__/AppNavigator.test.tsx`  
Expected: PASS；protected/public route 和 detail back 全部不变。

- [ ] **Step 6：提交 Task 3**

```bash
git add src/app/navigation/components/AppHeader.tsx src/app/navigation/components/BottomTabBar.tsx src/app/navigation/navigationState.ts src/app/navigation/__tests__
git commit -m "feat: refresh application navigation chrome"
```

### Task 4：迁移 Dashboard 层级、状态和同形 loading

- 业务场景：投资者先看到 portfolio value，再扫描 PnL/等级/KYC/commission 和当前业务 tab；loading 不伪装成零值。
- 范围内：身份区、hero summary、紧凑指标、glass tabs、flat rows、loading/empty/partial/long content。
- 范围外：loader、nickname repository/updater、holdings calculation、Whitelist/Rewards 内容重排。
- 预计影响文件：Dashboard screen/components/tests 和两个 feature skeleton files。
- 结构约束：DashboardHeader 只接受现有数据/callback；screen load/saveNickname effects 保持不变；FlatList 保留。
- 结构验收：一个 hero；no four equal cards；feature skeleton 与 ready structure 同尺寸；warning/retry/refresh 不丢失。
- 内聚与可测试性：summary/skeleton 是纯 props；screen tests 使用当前 fakes；不访问真实网络。
- 可追溯：Dashboard normal/empty/partial/loading/long content/behavior regression 验收场景。

- [ ] **Step 1：补 Dashboard RED state matrix tests**

新增断言：loading 有 `Dashboard loading` progressbar 且没有 `$0.00`；ready zero 才显示 `$0.00`；partial warning 与 available data 共存；holding/transaction key 和 callbacks 不变；长 nickname/value 不溢出稳定 slots。

- [ ] **Step 2：运行 RED Dashboard tests**

Run: `npm test -- --run src/features/dashboard/__tests__/DashboardScreen.test.tsx`  
Expected: FAIL，当前 loading 显示 `Loading dashboard...` 且 summary 使用零值。

- [ ] **Step 3：实现 Dashboard content-shaped skeletons**

`DashboardSummarySkeleton` 复刻 hero + 2x2 metric grid；`DashboardRowsSkeleton` 复刻两条 title/subtitle/right-number row。二者只组合 shared Skeleton primitives，不接受业务数据。

- [ ] **Step 4：重排 DashboardHeader/DashboardSummary**

增加显式 `loading` prop；loading 渲染 skeleton，ready 渲染 hero + compact metrics。refresh 仍调用 `onRefresh`，nickname edit/blur 提交逻辑不移动。Tabs 设置 `surface="glass"`。

- [ ] **Step 5：将列表改为稳定分隔行与明确 empty/loading**

FlatList 的 `data/keyExtractor/onRefresh/refreshing/renderItem` 保持；loading empty component 换 `DashboardRowsSkeleton`，ready empty 保留原业务解释，partial warning 可见。

- [ ] **Step 6：运行 GREEN 与 Dashboard 关联测试**

Run: `npm test -- --run src/features/dashboard`  
Expected: PASS；nickname、holdings、KYC、commission 和 explorer tests 全部通过。

- [ ] **Step 7：提交 Task 4**

```bash
git add src/features/dashboard/components src/features/dashboard/screens/DashboardScreen.tsx src/features/dashboard/__tests__/DashboardScreen.test.tsx
git commit -m "feat: refresh dashboard information hierarchy"
```

### Task 5：迁移 Wallet 层级并锁住连续 mutation 行为

- 业务场景：用户先识别 active identity 和余额，再操作 linked wallet 的 Bind/Use/Connect/Retry/Remove/Delete，并且一次 mutation 后下一次仍可用。
- 范围内：active hero、balance rows/skeleton、linked rows/action slots、Bind、Receive、phone/wide layout、所有 existing mutation presentation。
- 范围外：selection/unlink workflow、Privy/Reown adapters、Viewer convergence、chain/RPC、QR payload。
- 预计影响文件：Wallet screen/components/tests 和 `WalletBalanceSkeleton.tsx`。
- 结构约束：WalletScreen 不出现 provider/RPC/session 逻辑；WalletIdentitySection 不改 handler eligibility；action slot testID 保持。
- 结构验收：danger/recovery 实色；spinner 不改变 slot 尺寸；QR 白底；active/linked/balance hierarchy clear；44x44 commands。
- 内聚与可测试性：balance skeleton纯展示；existing workflow fakes cover sequential journeys；no real wallet app in component tests。
- 可追溯：Wallet normal/mutation/failure recovery/content skeleton/long content/behavior regression 验收场景。

- [ ] **Step 1：扩展 Wallet RED tests**

保留现有 action label/testID 断言，并新增：balance loading 每行含 identity/subtitle/amount shapes；active hero 不使用 glass；error/recovery/danger 保持 solid；长地址 flex shrink；bind→switch→switch back→unlink→reload→repeat action 均能 dispatch。

- [ ] **Step 2：运行 RED Wallet tests**

Run: `npm test -- --run src/features/wallet/__tests__/WalletScreen.test.tsx`  
Expected: FAIL，当前 balance loading 是三个 64px block，层级与新结构不符。

- [ ] **Step 3：实现 WalletBalanceSkeleton 与扁平余额行**

每行固定 identity column、辅助 contract/native column、amount column；loading/ready/unavailable 使用同一 row metrics。Refresh 继续调用原 callback；partial token failure 不遮挡成功 rows。

- [ ] **Step 4：重排 active hero 与 linked wallet rows**

active hero 使用 `ink` 实色；linked row 保持 identity/selection/unlink 三个稳定 slot。复制现有 `disabled`, `pendingTarget`, `Retry`, `Remove link`, confirmation 和 spinner mapping，不把它们重新推导为新 booleans。

- [ ] **Step 5：整理 Bind 与 Receive**

Bind 保持主命令和既有 lock；Receive 的 QR 保持纯白背景、完整地址可选择、copy/text/image share 回调原样。图标 Pressable 增加 44x44 命中区但不改 label。

- [ ] **Step 6：保持 phone/wide layout 与 screen workflow effects**

phone 顺序为 active → balances → linked → Receive；`width >= 768` 的现有双列仍工作。只修改 JSX grouping/style，不重写 selection/unlink hooks/effects/ref convergence。

- [ ] **Step 7：运行 GREEN 与连续 wallet suite**

Run: `npm test -- --run src/features/wallet`  
Expected: PASS；selection machine/workflow/unlink/receive/balance/adapters 全部通过。

- [ ] **Step 8：提交 Task 5**

```bash
git add src/features/wallet/components src/features/wallet/screens/WalletScreen.tsx src/features/wallet/__tests__/WalletScreen.test.tsx
git commit -m "feat: refresh wallet presentation and loading states"
```

### Task 6：跨平台、性能、隐私与最终回归验证

- 业务场景：iOS/Android 用户在 capability/accessibility/窄屏差异下仍获得清楚稳定、业务不变的界面。
- 范围内：machine verification、native build、manual QA、脱敏 screenshots、delivery evidence。
- 范围外：Android live blur、tablet redesign、其他页面完整迁移、后端部署。
- 预计影响文件：测试修正（仅发现真实缺口时）、`docs/ai-delivery/runs/2026-07-24-rn-ui-system-refresh-verification.md`。
- 结构约束：验证失败先修 primitive/page presentation，不得删除状态或调整业务规则过关。
- 结构验收：no forbidden imports/files；native build通过；五 tab和 wallet sequential journey不回归。
- 内聚与可测试性：自动化优先，native-only材质与系统 preference 用设备证据补齐。
- 可追溯：所有验收场景与风险 playbook。

- [ ] **Step 1：运行静态和聚焦自动化门禁**

依次运行 Machine Verification 中 typecheck、shared、navigation、Dashboard、Wallet、forbidden scans。Expected: 全部 exit 0；任何失败先修复再继续。

- [ ] **Step 2：运行全量测试与 Expo dependency check**

Run: `npm test -- --run && npx expo install --check && git diff --check`  
Expected: 全部通过。

- [ ] **Step 3：同步并构建 iOS native project**

Run: `npx pod-install ios && npx expo run:ios --no-bundler`  
Expected: Debug build成功；若 development team 是唯一阻塞，记录 owner=human、证据=Xcode signing error、next action=选择 Team，不把 warning 当代码失败。

- [ ] **Step 4：构建 Android（集中到全部 Task 完成后）**

Run: `npx expo run:android --no-bundler`  
Expected: Debug build成功；Android 使用 static translucent/opaque fallback，没有 live blur。

- [ ] **Step 5：执行设备视觉与交互矩阵**

同一脱敏 fixture 验证 iOS native glass、旧 iOS/fallback、Reduce Transparency、Reduce Motion、Dynamic Type；Android narrow screen、长金额/地址、滚动、五 tab；Wallet 执行 bind→switch→switch back→unlink→reload→repeat。记录 revision、platform、device、bundle cwd 和结果。

- [ ] **Step 6：生成验证记录**

在 verification 文档记录命令、exit status、截图相对路径、残余风险、glass opaque rollback、人工 stop boundary。不得包含完整钱包地址、邮箱或敏感 provider 信息。

- [ ] **Step 7：运行 AI Delivery audit**

Run: `npm run ai:audit -- rn-ui-system-refresh`  
Expected: audit 通过；只有通过后才允许推进阶段。

- [ ] **Step 8：提交验证记录**

```bash
git add docs/ai-delivery/runs/2026-07-24-rn-ui-system-refresh-verification.md
git commit -m "docs: record ui system refresh verification"
```

## 业务追踪矩阵

| 需求场景 | 自动化 | 手动 QA | Task |
| -------- | ------ | ------- | ---- |
| Dashboard 正常数据 | DashboardScreen ready hierarchy test | iOS/Android first viewport | 4, 6 |
| Dashboard 空数据 | holdings/transactions empty tests | narrow screen | 4, 6 |
| Dashboard 部分失败 | partial warning + available data test | refresh interaction | 4, 6 |
| Wallet 正常数据 | active/linked/balance component tests | phone/wide | 5, 6 |
| Wallet mutation | action-slot + sequential journey tests | real wallet supported matrix | 5, 6 |
| Wallet 失败恢复 | Retry/Remove/Delete/disabled tests | cancellation/retry | 5, 6 |
| 内容同形骨架 | shared + Dashboard + Wallet skeleton tests | transition/layout shift | 2, 4, 5, 6 |
| 克制玻璃跨平台 | selector/native mock tests | iOS/Android/fallback | 2, 3, 6 |
| 长内容与窄屏 | style/component constraints | Dynamic Type/narrow device | 4, 5, 6 |
| 行为回归 | navigation + feature + full suite | five tabs + wallet sequence | 3, 4, 5, 6 |

## Security Review

- Pass by design：不修改 AuthProvider、session storage、token refresh、route authorization、wallet authorization 或后端。
- Visual/shared modules 不接收 secret/token/signature/SIWE/provider response，不新增日志、analytics 或持久化。
- Delete/Remove/Retry 保留现有 trusted workflow result、confirmation、danger color、accessible label 和 disabled rules。
- 必须执行 auth/provider import scan、敏感日志 scan 和 protected route regression；任一新增命中阻塞交付。

## Data / Supabase Review

- Schema/table/field/RLS/index/transaction/migration 全部不变；没有新增数据库工作。
- Dashboard loaders、Wallet services/workflows 是唯一数据来源；shared/navigation/presentation 不 import Supabase。
- 禁止 UI `.insert/.update/.upsert/.delete`，Machine Verification 必须为零匹配。
- Viewer active wallet 与 mutation convergence 不由视觉层推断；spinner/颜色不能提前表示持久化成功。

## Performance Review

- 两个 Expo SDK bundled modules 是唯一新增依赖；无 UI kit、font bundle、skeleton library。
- iOS 同时可见 glass 上限为 Header + 一个 segmented control + BottomTabBar；Android 无 live blur；list row 无 blur。
- 一个 SkeletonGroup 一个 Animated value；unmount cleanup；Reduce Motion 静态。
- Dashboard 保留 FlatList 和 domain key；高频状态不进入 Context；不为形式添加 useMemo/useCallback。
- 设备掉帧时先把 GlassSurface 回退 opaque，不允许删列表、状态或操作。

## Best Practices Review

- 复用现有 `Button`/`Pressable`、`SegmentedControl`、feature screen/workflow 测试，不预设无收益的通用组件。
- shared selector 确定、可测试；native capability 变化隔离在 adapter；feature-specific rows 保持业务内聚。
- TDD 顺序固定为 RED → GREEN → focused regression → commit；每 Task 可独立回滚。
- Loading/empty/partial/error/mutation/recovery 全状态进入追踪，不以 happy path 截图代替回归。

## Failure Modes

| codepath | 生产失败 | 测试 | 错误/降级 | 用户结果 |
| -------- | -------- | ---- | --------- | -------- |
| Glass capability | native module不可用 | selector/native mock | opaque fallback | 可读、可操作 |
| Accessibility listener | query失败或unmount泄漏 | rejection/cleanup test | safe default + cleanup | 静态/实色，不崩溃 |
| Skeleton animation | 多 timer/Reduce Motion未停 | single group test | static mode | 无不适/泄漏 |
| Dashboard loading | 假零值或布局跳动 | loading vs ready-zero test | content-shaped skeleton | 不误判资产 |
| Dashboard partial | warning 被隐藏 | partial test | available data + warning | 明确部分不可用 |
| Wallet action row | spinner 改尺寸/后续锁死 | sequential journey test | stable slots + current recovery | 下一操作可执行 |
| Long content | 地址/金额遮挡命令 | component constraint + device QA | flex shrink/stable slots | 无重叠 |
| Android glass | 半透明对比不足/掉帧 | selector + device QA | opaque fallback | 信息优先 |

Critical gaps：0。Native材质、Dynamic Type 和设备滚动无法完全由 Node tests 覆盖，已由 Task 6 阻塞式 manual QA 承接，不属于 silent unhandled path。

## NOT in scope

- Launchpad/Market/Referral/My/Login/KYC 内容迁移：本轮先验证两张高状态密度样板页。
- 暗色模式、tablet专用 composition、Web：需要独立设计和验收基线。
- Android live blur：没有低端设备性能证据，不以材质等价牺牲稳定性。
- 新 IconButton/SectionHeader/FinancialRow：当前重复不足以支撑公共抽象。
- Wallet、Auth、API、Edge Function、数据库、缓存逻辑：视觉任务不得扩大可信边界。
- PublicAssetList skeleton迁移：共享 primitive 可供后续使用，但该页面不在本轮完整迁移范围。

## What already exists

- `theme.ts`、`AppText`、`Button`、`SegmentedControl`：扩展兼容 API，不重建第二套 UI kit。
- `AppHeader`、`BottomTabBar` 和稳定 navigation state tests：只替换 presentation，复用路由契约。
- Dashboard deterministic loaders、FlatList、nickname callbacks 与 state tests：全部复用。
- Wallet selection/unlink state machine、stable action slot、continuous-operation regression tests：全部复用，不搬到 UI。
- `WalletBalanceSection` 的 loading state 与 partial result contract：只替换形状，不改 loader。

## Worktree Parallelization

| Step | Modules | Depends on |
| ---- | ------- | ---------- |
| Foundation | `src/shared/ui/`, root docs/dependencies | — |
| Navigation | `src/app/navigation/` | Foundation |
| Dashboard | `src/features/dashboard/` | Foundation, Navigation |
| Wallet | `src/features/wallet/` | Foundation, Navigation |
| Verification | tests/docs/native projects | Dashboard, Wallet |

Lane A：Foundation → Navigation。  
Lane B：Dashboard（等待 Lane A）。  
Lane C：Wallet（等待 Lane A，可与 Lane B 并行）。  
Lane D：Verification（等待 B + C）。

冲突提示：Dashboard 与 Wallet 并行 lane 都不得修改 `src/shared/ui/`；需要 shared API 调整时停止并回到 Lane A 串行修改。

## Consistency Check

- [x] Feature slug、需求、方案、实现计划路径一致。
- [x] 用户选择 A 已落实为精简共享层；方案与本计划都不新增 IconButton/SectionHeader。
- [x] 需求中的 auth/database/frontend-performance 风险均有 Review 与 machine gate。
- [x] 无 API、schema、字段、权限模型、migration、env 或 route contract 变化。
- [x] Dashboard 四业务 tab、底部五 tab、Wallet 全部既有 command 与 recovery 状态有测试追踪。
- [x] 每个 Task 包含业务场景、范围、结构、内聚/可测试性、验收、测试和需求追踪。
- [x] 未发现需求与方案冲突；Decision Notes 是实现取舍的唯一口径。

## Final Verification Required

完成前必须汇报：

1. `npm run typecheck`、聚焦 tests、`npm test -- --run` 的实际 exit status。
2. Expo dependency check、iOS/Android build 的实际结果和任何 human-owned signing blocker。
3. Forbidden Pattern scans 的零匹配证据；若有既有匹配，逐条说明基线与本 Task 是否新增。
4. iOS/Android 脱敏设备 QA：布局、滚动、Dynamic Type、Reduce Motion/Transparency、五 tab、Wallet sequential journey。
5. 残余风险：native material差异、设备性能、未迁移页面；回滚先把 GlassSurface 切 opaque，再按 Wallet→Dashboard→navigation→foundation 逆序回滚。
6. `npm run ai:audit -- rn-ui-system-refresh` 通过后才能推进阶段。
