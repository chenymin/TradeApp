# 移动端受控钱包解绑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留已合并的移动端受控解绑实现，完成自动化、Review 和明确的离线设备证据 waiver，最后统一完成 Android QA 与交付证据。

**Architecture:** 移动端继续使用 Wallet workflow -> Privy address-targeted unlink -> Auth refresh -> 已部署 `wallet-login` 的既有路径。本 feature 不修改 ArtStarFront、数据库 schema、RLS 或 Edge Function；剩余工作只包含 MyTradeApp 自动化回归、设备 QA 和证据归档。

**Tech Stack:** React Native 0.86、Expo 57、TypeScript、`@privy-io/expo`、Supabase client、Vitest、React Test Renderer、iOS/Android development build

日期：2026-07-18
最后更新：2026-07-19
Feature slug：`rn-wallet-controlled-unlink`
状态：已规划，剩余设备 QA 与证据门禁

---

## 输入文档

- 需求文档：`docs/requirements/2026-07-18-rn-wallet-controlled-unlink.md`
- 方案设计：`docs/plans/2026-07-18-rn-wallet-controlled-unlink-design.md`
- 原始实现计划：`docs/superpowers/plans/2026-07-17-mobile-wallet-controlled-unlink.md`
- 当前验证证据：`docs/ai-delivery/runs/2026-07-17-rn-wallet-controlled-unlink-verification.md`

## 实现策略

不重新实现已通过 84 files / 437 tests、TypeScript 和真实 iOS 解绑验证的移动端流程。现有 baseline、当前 main 自动化、安全和数据 Review均已完成。`sync_error -> Retry sync` 由自动化证明，用户于 2026-07-19 明确不再为设备级离线路径执行第二次不可逆解绑；Android confirm/cancel 与最终 AI Delivery closure 统一后续执行。

Privy unlink 使用 canonical wallet address，不依赖 Privy 钱包数组顺序。当前继续调用已部署的 `wallet-login`，不修改 ArtStarFront；其 primary 选择和详细日志属于独立后端技术债，不阻塞本 feature。

本计划不实现 `sync-wallets`、`wallet-select`、钱包切换、连接、转账、签名、schema migration、新 RLS policy 或 Edge Function hardening。

## Decision Notes

| 决策 | 来源 | 原因 | 实现影响 |
| ---- | ---- | ---- | -------- |
| 保留已合并的移动端 workflow/UI/Auth | 既有 Task 8D 计划与验证 | canonical target、单次 unlink、retry-only-sync、generation guard 已有 red-green 证据 | Task 1 只登记 baseline，不重写生产代码 |
| 继续沿用已部署 `wallet-login` | 需求与用户确认 | 当前不引入 `sync-wallets` / `wallet-select` | 客户端 endpoint 和响应解析保持不变 |
| 不修改 ArtStarFront | 2026-07-19 用户确认 | Privy unlink 按明确 address 执行，与 linked account 数组顺序无关 | 后端 primary/logging 问题移为独立技术债 |
| 不持久化或授权性使用 refresh-token 占位 | 需求、RN exchange parser 与既有 session adapter | 顶层响应只返回 access token + expiry；`setSession` 仍有历史瞬时兼容 | SecureStore 继续只保存 accessToken、expiresAt、Viewer；移除 adapter 占位另立 auth 任务 |
| 真实解绑需要逐次批准 | controlled-write 规则 | Privy unlink 不可逆 | 离线 QA 不再执行真实 unlink；Android Confirm 后续仍需当次明确批准 |

## 文件地图

| 仓库 | 文件 | 变化 | 职责 |
| ---- | ---- | ---- | ---- |
| MyTradeApp | `docs/ai-delivery/runs/2026-07-17-rn-wallet-controlled-unlink-verification.md` | Modify | 记录 Android、offline waiver 和最终 gate 证据 |
| MyTradeApp | `docs/ai-delivery/runs/2026-07-18-rn-full-app-port-verification.md` | Modify | 汇总 Task 8D 最终状态和残余风险 |
| MyTradeApp | AI verify 生成的 run artifact | Generate | 保存 AI Delivery 机器验证结果 |

设备 QA 发现缺陷时，必须先记录复现，再新增一个具体 TDD 修复 Task；本计划不预设未经复现的生产代码改动。

## 结构约束

- 现有 `walletUnlinkWorkflow.ts` 继续负责 canonical target、confirm -> unlink -> refresh 和 retry-only-sync。
- `createWalletUnlinkDependencies.ts` 继续只适配 React Native Alert、Privy hook 和 Auth action。
- `WalletScreen.tsx` 只持页面 mutation state 与 single-flight guard，不直接访问 Edge Function URL、session storage 或数据库。
- Auth refresh 继续由 auth workflow/provider 完成；失败时保留已有 authenticated snapshot。
- 不创建新的 repository、registry、sync endpoint、Edge Function 或跨仓 worktree。

## 结构验收标准

- UI 不包含 Edge Function URL、token parsing、Supabase table write 或 service key。
- unlink 与 retry sync 仍通过同一 workflow 编排，不复制到 Screen 或 AppRoot。
- 未登录 navigation tree 不注入 unlink dependencies。
- `sync-wallets`、`wallet-select`、schema、RLS 和 ArtStarFront 文件保持不变。
- 设备证据只修改 verification artifacts，不混入无关生产代码。

## 模块内聚与可测试性验收标准

- eligibility、canonical lookup、single unlink 和 retry-only-sync 由确定性 workflow tests 覆盖。
- Auth replacement、失败保留旧 session 和 logout generation guard 由 auth/provider tests 覆盖。
- Android Alert 属于待执行设备 QA；真实网络阻断经用户 waiver，不用自动化结果冒充设备 pass。
- 每个失败路径都对应自动化断言、可观察 UI 状态或 stop-for-human 证据。
- 发现 bug 后执行 RED -> GREEN -> focused regression，不直接修改实现猜测原因。

## 代码规则约束

- 状态模型保持 `idle -> confirming -> unlinking -> syncing -> complete`，以及 `unlink_error` / `sync_error`。
- target 必须从当前 Privy metadata 按 canonical address 重新查找，不能来自 route、输入或过期对象。
- 每次确认最多调用一次 Privy unlink；Retry sync 只调用 session refresh。
- Privy unlink 成功而同步失败时保留当前 session/Viewer，不补偿 relink，不退出登录。
- Viewer 变化或登出后，旧异步结果不得持久化到新认证代次。
- 移动端不得直接写 `investor_wallets`、`investors`，不得包含 service-role secret。
- artifact 不记录 Privy token、Supabase JWT、完整地址、email、user id 或原始 provider body。
- 已解绑钱包无法通过客户端代码回滚；真实写入前必须再次获得批准。

## Forbidden Patterns

- 禁止绕过约定的数据写入路径：移动端不得直接写 `investor_wallets`、`investors` 或使用 service-role client。
- 禁止仅依赖前端权限判断：UI eligibility 不得代替 Privy 和 `wallet-login` 的身份验证。
- 禁止在 `sync_error` 或 Retry sync 路径再次调用 Privy unlink。
- 禁止在 TSX 中出现 `wallet-login` URL、`privyToken`、`accessToken` 或 Edge Function 直连。
- 禁止添加 `wallet-select`、`sync-wallets`、`useActiveWallet`、`switchChain`、`sendTransaction`、`writeContract` 或签名入口。
- 禁止把 ArtStarFront primary 选择或日志硬化混入本 feature。
- 禁止 artifact 记录 token、session、secret、完整身份数据或原始 provider response。
- 禁止未经明确批准执行真实 unlink、push、merge、deploy 或 production rollout。

## Machine Verification

| 验证目标 | 命令 | 预期结果 |
| -------- | ---- | -------- |
| RN focused workflow/UI/Auth | `npx vitest run src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts src/features/wallet/__tests__/createWalletUnlinkDependencies.test.ts src/features/wallet/__tests__/WalletScreen.test.tsx src/features/auth/__tests__/authWorkflow.test.ts src/app/providers/__tests__/AuthProvider.test.tsx src/app/navigation/__tests__/AppNavigator.test.tsx` | exit 0 |
| RN full suite | `npm test` | 所有测试通过 |
| RN TypeScript | `npm run typecheck` | exit 0 |
| UI 不直连写接口/token | `node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "privyToken" -e "accessToken" -e "wallet-select" -e "sync-wallets" src/features/wallet --glob "*.tsx"` | no matches |
| 禁止绕过数据写入路径 | `node scripts/verify-no-match.mjs -e "investor_wallets" -e ".from(\"investors\")" -e ".from('investors')" src --glob "*.ts" --glob "*.tsx"` | no matches |
| 禁止仅依赖前端权限 | `node scripts/verify-no-match.mjs -e "isAdmin" -e "investorId" -e "investor_id" src/features/wallet --glob "*.tsx"` | no matches |
| 无转账/切换/签名扩展 | `node scripts/verify-no-match.mjs -e "writeContract" -e "sendTransaction" -e "switchChain" -e "useActiveWallet" -e "useWallets" src/features/wallet src/app/AppRoot.tsx --glob "*.ts" --glob "*.tsx"` | no matches |
| 客户端生产源码无 service role | `node scripts/verify-no-match.mjs -e "service_role" -e "SUPABASE_SERVICE_ROLE_KEY" -e "WALLET_LOGIN_SECRET_KEY" src --glob "*.ts" --glob "*.tsx" --glob "!**/__tests__/**"` | no matches；测试中的负向安全断言不计为生产泄漏 |
| 文档一致性 | `npm run ai:audit -- rn-wallet-controlled-unlink --stage 任务拆分` | audit pass；未完成 QA Task 只作为 readiness 提醒 |
| Diff whitespace | `git diff --check` | exit 0 |

## Consistency Check

- [x] 需求、方案、实现计划明确复用已部署 `wallet-login`，不修改 Edge Function。
- [x] Privy unlink 的 target 由 canonical address 决定，不从数组索引推导。
- [x] 13 个验收场景全部进入业务追踪矩阵。
- [x] 每个 Forbidden Pattern 都有机器扫描、自动化测试、设备 QA 或 Review 检查。
- [x] 后端 primary/logging hardening 已移出当前 feature；离线设备 QA 已明确 waiver，只剩 Android QA。

## 任务拆分

### Task 1: 冻结并验证已合并的移动端解绑 baseline

- 状态：Completed，历史提交 `eb762d4..4ebe881` 已合并至 main。
- 业务场景：eligible external wallet 经确认只 unlink 一次；平台失败只 retry sync。
- 范围内：Auth refresh、wallet workflow、native adapter、Screen state、navigation binding、自动化和 iOS evidence。
- 范围外：不重写已通过测试的移动端模块，不修改后端。
- 预计影响文件：无生产代码变化。
- 验收标准：focused tests、full suite、typecheck 和 iOS evidence 已有可重复证据。
- 需求追踪：正常、取消、Embedded、active、final、forged、Privy failure、sync failure、rapid press、logout、dependency unavailable。

- [x] **Step 1:** 确认历史实现提交和验证文档存在。
- [x] **Step 2:** 合并后 `npm test` 记录为 84 files / 437 tests passed。
- [x] **Step 3:** 合并后 `npm run typecheck` 记录为 exit 0。
- [x] **Step 4:** iOS confirm/cancel 和一次真实 Privy/platform convergence 已记录。

### Task 2: 当前 main 自动化与安全/数据 Review

- 状态：Completed，2026-07-19 当前 main 验证与 scoped Review 已完成。
- 业务场景：在不依赖设备和真实写入的情况下，重新证明 canonical target、single unlink、retry-only-sync、auth generation 和权限边界。
- 范围内：focused/full tests、typecheck、forbidden scans、Security Review、Data Review。
- 范围外：不修改生产代码、后端或设备状态；发现缺陷后另走 TDD fix。
- 预计影响文件：verification docs。
- 结构约束：验证当前 main，不在 QA Task 中生成新功能实现。
- 验收标准：所有机器 gate exit 0；没有未解决 Critical/Important finding；失败结果如实记录。
- 需求追踪：全部 13 个验收场景的自动化部分。

- [x] **Step 1:** Machine Verification focused tests 为 6 files / 74 tests passed；`npm run typecheck` exit 0。
- [x] **Step 2:** `npm test` 为 84 files / 437 tests passed。
- [x] **Step 3:** forbidden scans 通过；service-role 初次匹配仅为测试中的负向断言，排除 `__tests__` 后生产源码扫描 exit 0。
- [x] **Step 4:** auth、permission、database/RLS scoped Security/Data Review 完成，无 Critical/Important finding；既有 `setSession` 瞬时占位作为非阻塞 auth 技术债记录。
- [x] **Step 5:** controlled-unlink verification 已记录当前 main 的命令、计数、Review 和残余风险。

### Task 3: 离线 sync_error 与 Retry sync 证据闭环

- 状态：Closed with explicit device-QA waiver，2026-07-19。
- 业务场景：Privy 已解绑但 `wallet-login` 失败时，只允许同步重试，不第二次解绑。
- 已验证范围：workflow、Screen、AuthProvider 自动化；一次正常真实 iOS unlink/platform convergence。
- 未执行范围：不创建第二个 external wallet，不安装代理，不执行第二次不可逆真实 unlink，不声称离线设备 pass。
- 预计影响文件：verification docs。
- 验收标准：自动化明确证明 `sync_error` 保留旧 Viewer、Retry 只 refresh、unlink count 不增加；用户接受设备证据缺口为残余风险。
- 需求追踪：平台同步失败、离线恢复、快速重复操作、Viewer 变化或登出、权益隔离。

- [x] **Step 1:** 正常 iOS 真实 unlink 与 `wallet-login` convergence 已于 2026-07-18 通过。
- [x] **Step 2:** workflow/Screen/Auth tests 覆盖同步失败、旧 session/Viewer 保留、Retry-only-sync 和 logout generation guard。
- [x] **Step 3:** 2026-07-19 用户明确决定不为离线路径准备第二个 disposable wallet 或执行第二次真实 unlink。
- [x] **Step 4:** verification artifact 将设备路径标记为 waived residual risk，而不是 pass。

### Task 4: Android QA 与最终 AI Delivery closure

- 状态：Planned，最后统一执行。
- 业务场景：Android 用户看到明确 destructive confirmation；取消无写入；经批准 Confirm 只执行一次，随后完成全 feature closure。
- 范围内：JDK/Android SDK/AVD、development build、eligible wallet confirm/cancel、布局/accessibility、AI audit/verify 和最终 artifacts。
- 范围外：不修改 ArtStarFront，不自动 commit、push、merge、deploy 或 rollout。
- 预计影响文件：verification docs、AI verify run artifact；隔离 QA worktree 中的生成 Android 工程不进入 main。
- 结构约束：使用真实 protected Wallet route，不使用静态 mock；证据不记录完整身份或 token。
- 验收标准：Alert 包含 provider/缩略地址；Cancel 无请求；经批准 Confirm 只请求一次；Viewer/account 不变；AI gates pass。
- 需求追踪：全部 13 个验收场景，重点为正常、取消、Embedded、active、final wallet 和跨平台 closure。
- 当前环境（2026-07-19）：JDK 17 已安装；Android SDK/AVD、生成的 `android/` 工程和 APK/AAB 尚未安装或创建，按用户决定留到最后。

- [ ] **Step 1:** 安装 Android command-line tools、platform-tools、emulator 和匹配 system image，在隔离 QA worktree 生成 development build。
- [ ] **Step 2:** 启动 Android emulator，安装 build 并登录测试账户。
- [ ] **Step 3:** 验证 embedded、active、final wallet 不显示 unlink action，记录不含完整地址的截图。
- [ ] **Step 4:** 对 eligible external wallet 打开确认并点 Cancel；确认行保持，代理/日志中无 Privy unlink request。
- [ ] **Step 5:** 获得本次目标缩略地址的明确批准后执行一次 Confirm；验证 unlink count=1、目标消失、Viewer/account 未变。
- [ ] **Step 6:** 更新 controlled-unlink run artifact 与 full-app 汇总，保留全部机器和设备证据。
- [ ] **Step 7:** 运行 `npm run ai:audit -- rn-wallet-controlled-unlink` 和 `npm run ai:verify -- rn-wallet-controlled-unlink --write`，必须 pass。
- [ ] **Step 8:** 展示 diff、验证结果、残余风险和客户端 rollback 步骤，等待用户决定 commit/push/merge。

## 业务追踪矩阵

| 业务场景 | 实现位置 | 测试 / 验证 | 状态 |
| -------- | -------- | ----------- | ---- |
| 正常路径：解绑外部非活跃钱包 | wallet workflow/UI/Auth | workflow/Screen/Auth tests；iOS passed；Task 4 Android | Partial |
| 取消确认 | native adapter + WalletScreen | adapter/Screen tests；iOS passed；Task 4 Android | Partial |
| Embedded Wallet | `canUnlinkWallet` + identity UI | workflow/Screen tests；Task 4 device visibility | Implemented |
| 当前活跃钱包 | `canUnlinkWallet` + `AuthViewer.walletAddress` | workflow test；Task 3/4 Viewer comparison | Partial |
| 最后一个 Privy Ethereum 钱包 | `canUnlinkWallet` 的 `privyLinked` count | workflow regression test | Implemented |
| 非 Privy 或伪造目标 | canonical lookup in `requestWalletUnlink` | forged/unknown workflow tests | Implemented |
| Privy 解绑失败 | `requestWalletUnlink` -> `unlink_error` | workflow + Screen error tests | Implemented |
| 平台同步失败 | Auth refresh preservation + `sync_error` | Auth/Provider/Screen tests；设备级故障注入 waived | Verified with residual risk |
| 离线后恢复同步 | `retryWalletSync` | workflow/Screen tests；真实 proxy QA waived | Verified with residual risk |
| 快速重复操作 | WalletScreen in-flight ref | rapid press and retry count tests | Implemented |
| Viewer 变化或登出 | Auth generation guard + route reset | AuthWorkflow/AuthProvider/AppNavigator tests | Implemented |
| 运行时依赖不可用 | optional unlink dependencies | WalletScreen/AppNavigator tests | Implemented |
| 权益隔离 | same account + Viewer comparison | iOS evidence；Task 2/3 post-check | Partial |

## 安全与数据 Review 门禁

- Auth：Privy token 由服务端 `/users/me` 验证；客户端不提交 investor id。
- Permission：未登录 tree 不注入 unlink dependencies；eligible UI 不是最终授权。
- Database：移动端不直接写 wallet/investor 表；平台同步继续经过已部署 `wallet-login`。
- RLS：移动端 bundle 不含 service role；后续本人数据继续受现有 RLS 约束。
- Consistency：Privy unlink 成功后只允许 `wallet-login` retry，不做第二次 unlink 或客户端补写。
- Privacy：artifacts 不包含 token、email、id、完整地址或原始 provider payload。
- Rollback：客户端回滚不能恢复已从 Privy 解绑的钱包。
- Stop-for-human：真实 unlink、push、merge 和 rollout 分别需要明确批准；本 feature 无 backend deploy。

## 依赖关系与执行顺序

```text
Task 1 baseline (complete)
  -> Task 2 automation + reviews
     -> Task 3 offline evidence closure (explicit device waiver)
        -> Task 4 Android QA + final closure
```

- Task 2 不执行真实写入，可立即完成。
- Task 3 已通过自动化证据和明确 waiver 关闭，不再执行真实写入。
- Task 4 是唯一剩余 Task；Android 环境统一后续配置，真实 Confirm 仍需当次批准。
- ArtStarFront primary/logging hardening 与本执行链无依赖关系。

## Final Verification Required

- [x] Typecheck：`npm run typecheck`，2026-07-19 exit 0。
- [x] RN focused tests：2026-07-19，6 files / 74 tests passed。
- [x] RN full suite：2026-07-19，84 files / 437 tests passed。
- [x] Forbidden pattern scans：UI/token、data-write、frontend-auth、transfer/switch 和生产源码 service-role scans 全部通过。
- [ ] AI audit：`npm run ai:audit -- rn-wallet-controlled-unlink`
- [ ] AI verification：`npm run ai:verify -- rn-wallet-controlled-unlink --write`
- [x] Offline Retry closure：自动化证据通过；真实 proxy/device QA 由用户明确 waiver，并记录为残余风险。
- [ ] Manual QA：Android confirm/cancel、Viewer/account/权益前后对比。
- [x] Review：MyTradeApp scoped Security/Data Review 的 Critical/Important findings 为 0。
- [ ] 结果写入 run artifact 和最终回复；未执行项保持 pending，不得推断为 pass。

## 完成定义

- [x] 每个验收场景都有对应实现和验证方式；未执行的 Android 设备证据仍明确 pending。
- [x] 业务、权限和代码结构边界与方案一致，ArtStarFront 保持不变。
- [x] loading、错误、权限、retry 和 dependency unavailable 状态由自动化覆盖。
- [x] 真实 offline device gate 经明确 waiver 关闭，未表述为 pass。
- [ ] Android device gate 完成。
- [x] 测试通过，scoped Security/Data Review 无未解决 Critical / Important 问题。
- [ ] 真实 unlink、push、merge 都有独立人工批准和可追溯证据。
