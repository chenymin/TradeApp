# Mobile Wallet Binding and Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind a new external Ethereum wallet and immediately make it the authenticated platform wallet, while also allowing confirmed switching among existing Privy-linked wallets without changing the investor account, KYC, or rights.

**Architecture:** Reown AppKit supplies the device wallet connection and signature; Privy SIWE proves and persists wallet linkage; a new `wallet-select` Edge Function validates the verified Privy identity and delegates all platform writes to one service-role-only Postgres RPC. Because the existing JWT identifies the investor and contains no active-wallet claim, the Edge Function returns an authoritative Viewer without rotating JWT; the mobile workflow preserves token/expiry, persists only the verified Viewer, and retains an operation id for forward recovery.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript, Vitest, React Native Testing Library, Reown AppKit React Native 2.0.6, Privy Expo 0.69.4, Viem 2.x, Supabase Edge Functions/Deno, PostgreSQL/RLS.

---

日期：2026-07-20
Feature slug：`rn-wallet-switching`
状态：已规划

## 输入文档

- 需求文档：`docs/requirements/2026-07-19-rn-wallet-switching.md`
- 方案设计：`docs/plans/2026-07-19-rn-wallet-switching-design.md`

## 仓库与交付边界

| 仓库 | 基线 | 交付内容 | 不包含 |
| ---- | ---- | -------- | ------ |
| `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform` | 当前 `feature20260420` HEAD | migration、RPC、RLS / grant 收紧、静态与本地数据库验证 | 生产 migration apply、后台 UI |
| `/Users/rwa_start/ProjectSource/ArtStarFront` | 当前 `feature20260402` HEAD | `wallet-select` Edge Function、纯 domain/service 测试 | 修改 `wallet-login`、部署 Edge Function、Web Wallet 接入 |
| `/Users/rwa_start/LearnSource/MyTradeApp` | 当前 `main` HEAD | Viewer-only wallet-select contract、Reown/Privy adapters、状态机、Wallet UI、测试与验证记录 | 转账、签名业务、链切换、Android 当轮真机 QA |

三个仓库分别建立 `rn-wallet-switching` feature branch / worktree 并分别提交。不得把一个仓库的生成物复制为另一个仓库的未追踪文件，也不得把 `.env`、token、`.gstack/`、`.superpowers/` 加入提交。

## 实现策略

先建立可单独验证的数据库原子写入口，再实现只信任 Privy identity 的 `wallet-select`，之后扩展移动端 Viewer-only 持久化能力。最后接入 Reown + Privy SIWE 和 Wallet UI；每个 Task 按 RED → GREEN → REFACTOR → commit 执行。生产部署不属于编码完成条件，发布前以 dry-run / local verification artifact 交付。

## Decision Notes

| 决策 | 来源 | 原因 | 实现影响 |
| ---- | ---- | ---- | -------- |
| 新绑定钱包立即成为平台 active | 需求 | 与 Web 用户可见口径一致 | SIWE link 后自动调用 `wallet-select`，不追加 `Use` 确认 |
| Expo 不实现伪造的 Privy active | 方案 | `@privy-io/expo@0.69.4` 没有 `setActiveWallet` | connector address 是输入，Viewer / DB primary 是持久化 active |
| Reown 使用 Ethers adapter，不引入 Wagmi | 方案落地 | 当前功能只需 EIP-1193 connection/signature，Wagmi + React Query 增加无用状态层 | 安装 `@reown/appkit-react-native` 与 `@reown/appkit-ethers-react-native` 2.0.6 |
| 保持 `wallet-login/index.ts` 不变 | 用户确认 / 方案 | 现有函数按 linked array 第一项选 primary，回归面大 | `wallet-select` 独立验证、RPC与 authoritative Viewer 响应 |
| 钱包选择不轮换 JWT | 2026-07-22 用户确认 / auth review | JWT 只包含 investor identity，不包含 active wallet；切换不应续期登录 | Edge Function移除 signer和`access_token/expires_in`；mobile保留 token/expiry，只持久化 Viewer |
| operation ledger + expected previous | 需求 / 方案 | 处理响应丢失、重复请求与陈旧请求 | RPC 先查 operation，再锁定并更新；同 operation payload 不同则拒绝 |
| authenticated 不得直接 UPDATE investors | 安全自查 | 现有 self-update policy 无列级保护 | migration revoke UPDATE 并 drop 宽泛 policy；昵称 RPC 不受影响 |
| 平台失败 forward recovery | 方案 | Privy SIWE link 已完成且没有 Expo active 可回滚 | 保留 linked wallet，重试同 operation；确定冲突才显示显式 cleanup |

## 结构约束

- 入口文件职责：`wallet-select/index.ts` 只做 HTTP / CORS / dependency wiring；`AppRoot.tsx` 只取 hooks、构造依赖和注入。
- 新增行为挂载位置：移动端通过 `WalletSelectionDependencies` 注入 `AppNavigator -> WalletScreen`；Edge Function 通过 `createWalletSelectService(dependencies)` 注入。
- 领域逻辑所在模块：移动端 `walletSelectionMachine.ts` / `walletSelectionWorkflow.ts`；后端 `wallet-select/domain.ts` / `service.ts`。
- 禁止膨胀的文件：`AppRoot.tsx`、`WalletScreen.tsx`、`WalletIdentitySection.tsx`、`wallet-select/index.ts`、现有 `wallet-login/index.ts`。
- 可接受抽象：只为连接器、Privy SIWE、平台选择、Viewer-only 持久化、operation storage 和原生确认建立窄接口。

## 代码规则约束

- 状态模型：使用 discriminated union；禁止用 `isConnecting/isLinking/isSyncing` 等零散 boolean 推导业务状态。
- 可信边界：客户端 target 仅用于交互；Edge Function重新从 verified Privy linked accounts 匹配；investor id 只由 `privy_user_id` 查询得到。
- 副作用：Reown modal/provider 只在 connection adapter；Privy link 只在 SIWE adapter；HTTP 只在 `walletSelectClient`；Viewer-only session record 写只在 Auth workflow；数据库写只在 RPC。
- 幂等：每次选择生成 UUID；网络 / session 恢复使用原 operation id，不重复 SIWE link。
- 错误和回滚：稳定错误 union驱动 UI；未知平台结果锁定 wallet mutation；确定跨账户冲突允许显式 unlink cleanup。
- 配置和密钥：`EXPO_PUBLIC_REOWN_PROJECT_ID`、`EXPO_PUBLIC_SUPABASE_WALLET_SELECT_PATH` 是 public config；Privy token与service role只存在内存 / Edge Function secret；`wallet-select` 不读取 `SUPA_JWT_SECRET`。
- 兼容回滚：旧 Viewer read path 和 `wallet-login` 保持可用；回滚移动端 UI 不删除已 linked 钱包；数据库 migration 回滚前必须先停止 `wallet-select` 流量。

## 结构验收标准

- `wallet-select/index.ts` 只保留 HTTP method、CORS、input decode、service调用和response mapping；授权、target选择、RPC与JWT编排均不在入口。
- `AppRoot.tsx` 只获取 Reown / Privy hooks、创建 adapter并注入；Wallet业务状态全部位于 feature workflow。
- `WalletScreen.tsx` 不出现 SIWE message、fetch payload、RPC字段或 provider request；`WalletIdentitySection.tsx` 不导入 Privy、Reown、Supabase或SecureStore。
- 数据库 active切换只存在于 `select_investor_wallet` RPC；Edge Function和客户端均无跨表写序列。
- 新增文件职责单一，任何实现函数超过约 80 行时必须先拆出 parser、domain transition或adapter helper；不以大型 `if/else` / `switch` 合并所有场景。
- `wallet-login/index.ts` 与现有 Task 8D unlink workflow行为不变；选择功能通过新增依赖组合，不修改旧登录 primary策略。

## 模块内聚与可测试性验收标准

- 地址规范化、linked target匹配、错误分类、状态转换和eligibility都是纯函数，可在 Node/Vitest 中脱离 React、Deno与真实网络运行。
- 移动 workflow只依赖 `WalletSelectionDependencies`；fake依赖能独立模拟 connector、Privy、platform、Viewer persistence和operation storage每个失败点。
- Edge service只依赖 typed adapters；fake Privy / investor / RPC / signer覆盖授权、冲突、幂等和未知错误。
- Reown package-specific provider类型不跨出 connection adapter；Privy hook函数不跨出 SIWE adapter。
- SQL contract test验证migration权限结构；本地 verification SQL验证真实transaction / RLS语义，两者不能互相替代。
- 每个需求验收场景在业务追踪矩阵中至少映射一个自动化测试；只有deep link、第三方钱包原生确认和设备回跳允许依赖手动QA。

## Forbidden Patterns

- 禁止绕过约定的数据写入路径：移动端 / Web 不得直接 `.from("investors").update` 或写 `investor_wallets`；Edge Function不得用多条分散 table update 替代 RPC。
- 禁止仅依赖前端权限判断：target linked、investor owner、account status、cross-investor conflict 必须在 Edge Function / 数据库验证。
- 禁止读取 `linked_accounts[0]`、`.find(wallet)[0]` 或列表顺序决定 target / primary。
- 禁止修改 `wallet-login/index.ts` 或把 `wallet-select` 分支塞入登录入口。
- 禁止在日志输出 `privyToken`、JWT、Authorization、email、user id、完整 wallet list 或未脱敏 provider error body。
- 禁止在 mobile bundle 中出现 `service_role`、`WALLET_LOGIN_SECRET_KEY`、`SUPA_JWT_SECRET`。
- 禁止在 Privy link / connector address mismatch 后调用 `wallet-select`。
- 禁止 Viewer 持久化失败后重新执行 Privy link或生成新 operation；只能以同 operation 幂等恢复 authoritative Viewer。
- 禁止 `wallet-select` 签发或返回 `access_token` / `expires_in`，禁止 wallet selection 调用 Supabase `setSession` 或改变现有 token / expiry。
- 禁止在本 Task 部署 production migration / Edge Function，或执行真实跨账户写入；部署必须另行明确批准。
- 禁止用大型 action `switch` 堆叠全部状态副作用；reducer 只计算状态，workflow 执行依赖。

## Machine Verification

| 验证目标 | 命令 | 预期结果 |
| -------- | ---- | -------- |
| 主项目类型 | `npm run typecheck` | exit 0 |
| 主项目测试 | `npm test -- --run` | 全部通过 |
| 主项目钱包聚焦测试 | `npm test -- --run src/features/wallet src/features/auth src/app` | 全部通过 |
| Management migration contract | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching test -- --run src/lib/wallet-selection-migration.test.ts` | 全部通过 |
| Front 测试 | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching run test:run` | 全部通过 |
| migration 安全结构 | `rg -n "ENABLE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "FORCE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "REVOKE UPDATE ON public.investors FROM authenticated" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "GRANT EXECUTE ON FUNCTION public.select_investor_wallet" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "SECURITY INVOKER" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql` | 每类均有匹配 |
| 禁止移动端直写 | `! rg -n -e "investors.*\\.insert" -e "investors.*\\.upsert" -e "investors.*\\.update" -e "investors.*\\.delete" -e "investor_wallets.*\\.insert" -e "investor_wallets.*\\.upsert" -e "investor_wallets.*\\.update" -e "investor_wallets.*\\.delete" src` | 无匹配 |
| 禁止前端 service role | `! rg -n -e service_role -e SUPA_JWT_SECRET -e WALLET_LOGIN_SECRET_KEY src package.json app.json --glob '!**/__tests__/**'` | 无匹配 |
| 禁止 token 日志 | `! rg -n -e 'console\\.log.*token' -e 'console\\.error.*token' -e 'console\\.log.*session' -e 'console\\.error.*session' src /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | 无敏感匹配 |
| wallet-select 不轮换 JWT | `! rg -n -e 'signJwt' -e 'access_token' -e 'expires_in' -e 'SUPA_JWT_SECRET' /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | 无匹配 |
| wallet selection 不替换 Supabase session | `! rg -n -e 'persistSession' -e 'replaceSession' -e 'setSession' src/features/wallet` | 无匹配 |
| `wallet-login` 未改 | `git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching diff 1f57226 -- supabase/functions/wallet-login/index.ts` | 空输出 |
| 文档一致性 | `npm run ai:audit -- rn-wallet-switching` | audit 通过 |
| Git 污染检查 | `git status --short && git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching status --short && git -C /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching status --short` | 仅当前 Task 预期文件 |

## Consistency Check

- [x] 需求、方案、实现计划的文件路径、字段名和验收场景一致。
- [x] 方案 Decision Notes 已反映到实现策略和任务。
- [x] 每个 Forbidden Pattern 都有机器验证或 review 检查。
- [x] 每个验收场景都能追踪到任务、测试或手动 QA。
- [x] 数据库 migration 编号固定为 `045`；执行前若该编号已占用，停止并先更新需求、方案和本计划中的编号。

## 任务拆分

### Task 1：数据库原子钱包选择与写权限收紧

- 业务场景：平台只能一次性切换 primary 与 investor mirror；重复、陈旧和跨账户请求不能产生半成功。
- 范围内：operation ledger、RPC、唯一冲突、RLS / grant、authenticated UPDATE 收紧、数据库验证。
- 范围外：Edge Function、移动 UI、生产 apply、历史钱包全量数据迁移。
- 预计影响文件：
  - Create via CLI then rename: `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform/supabase/migrations/045_wallet_selection.sql`
  - Create: `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform/src/lib/wallet-selection-migration.test.ts`
  - Create: `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform/supabase/manual/verify_wallet_selection.sql`
- 结构验收：一个 RPC包含事务；固定锁顺序；无 HTTP / token；函数 `SECURITY INVOKER` 且 service-role-only。
- 可测试性验收：静态 migration contract由 Vitest 验证；本地 Supabase verification SQL覆盖 commit、rollback、idempotency、stale、conflict 和 direct-update denial。

- [x] **Step 1：创建 migration 文件并写 RED contract test**

Run:

```bash
npx supabase migration new wallet_selection
mv supabase/migrations/*_wallet_selection.sql supabase/migrations/045_wallet_selection.sql
```

在 `wallet-selection-migration.test.ts` 读取 migration 并断言以下片段存在：

```ts
expect(sql).toContain("create table public.wallet_selection_operations");
expect(sql).toContain("create or replace function public.select_investor_wallet");
expect(sql).toContain("security invoker");
expect(sql).toContain("revoke update on public.investors from authenticated");
expect(sql).toContain('drop policy if exists "investors: self update"');
expect(sql).toContain("grant execute on function public.select_investor_wallet");
```

- [x] **Step 2：运行 RED test**

Run: `npm test -- --run src/lib/wallet-selection-migration.test.ts`

Expected: FAIL，因为 migration 尚无 schema / function SQL。

- [x] **Step 3：实现 operation ledger 与原子 RPC**

RPC签名固定为：

```sql
public.select_investor_wallet(
  p_investor_id uuid,
  p_operation_id uuid,
  p_expected_previous_address text,
  p_target_wallet_address text,
  p_wallet_type text
) returns table (
  operation_id uuid,
  investor_id uuid,
  selected_wallet_address text,
  idempotent boolean
)
```

实现顺序：规范化地址 → 锁 investor → 校验 existing operation payload → 校验 mirror 与唯一 primary一致 → 校验 expected previous → 按地址排序锁 wallet rows → upsert target → 清旧 primary → 设 target primary → 更新 mirror → 写 completed operation → return。所有异常使用稳定 code：`operation_conflict`、`stale_previous_wallet`、`wallet_owned_by_another_investor`、`wallet_state_inconsistent`。

- [x] **Step 4：实现 RLS / grant 与 verification SQL**

要求：operation table `ENABLE/FORCE RLS` 且无客户端 policy；RPC revoke `PUBLIC, anon, authenticated` 后只 grant `service_role`；撤销 authenticated 对 `investors` UPDATE并 drop宽泛 self-update policy。verification SQL必须在 transaction 中建立两个 investor fixture，验证成功切换、重复 operation、不同 payload、stale previous、跨 investor address conflict 与 authenticated direct update rejection，最后 rollback。

- [x] **Step 5：运行 GREEN 与 migration 检查**

Run:

```bash
npm test -- --run src/lib/wallet-selection-migration.test.ts
npm run lint
git diff --check
```

Expected: PASS；无 SQL placeholder；无宽泛 grant。

- [x] **Step 6：提交 Management Task**

```bash
git add supabase/migrations/045_wallet_selection.sql supabase/manual/verify_wallet_selection.sql src/lib/wallet-selection-migration.test.ts
git commit -m "feat: add atomic investor wallet selection"
```

### Task 2：受控 Viewer-only `wallet-select` Edge Function

- 业务场景：只允许当前 Privy 用户选择其明确 linked Ethereum wallet，并返回同一 investor 的 operation result / authoritative Viewer，不轮换 JWT。
- 范围内：request parser、Privy verification、target match、investor status、RPC adapter、stable error、Viewer-only response、unit tests。
- 范围外：修改 `wallet-login`、部署、Web UI、直接 table mutation。
- 预计影响文件：
  - Create: `/Users/rwa_start/ProjectSource/ArtStarFront/supabase/functions/wallet-select/domain.ts`
  - Create: `/Users/rwa_start/ProjectSource/ArtStarFront/supabase/functions/wallet-select/service.ts`
  - Create: `/Users/rwa_start/ProjectSource/ArtStarFront/supabase/functions/wallet-select/index.ts`
  - Create: `/Users/rwa_start/ProjectSource/ArtStarFront/src/__tests__/walletSelectDomain.test.ts`
  - Create: `/Users/rwa_start/ProjectSource/ArtStarFront/src/__tests__/walletSelectService.test.ts`
- 结构验收：index 小于 120 行；domain无 Deno / fetch / Supabase；service所有 IO注入；RPC是唯一数据库写依赖。
- 可测试性验收：fake Privy / investor / RPC / roles覆盖所有分支，无 live secrets / network；依赖接口不存在 signer。

- [x] **Step 1：写 RED domain tests**

覆盖：解析 UUID / EVM address；按目标地址而非数组顺序匹配 Ethereum account；embedded / external type derivation；拒绝 missing token、invalid target、non-linked、non-Ethereum。

核心接口：

```ts
export type WalletSelectInput = {
  expectedPreviousAddress: `0x${string}`;
  operationId: string;
  privyToken: string;
  targetAddress: `0x${string}`;
};

export function findLinkedEthereumWallet(
  linkedAccounts: readonly unknown[],
  targetAddress: string,
): { address: `0x${string}`; walletType: "embedded" | "external" } | null;
```

- [x] **Step 2：运行 RED domain test**

Run: `npm run test:run -- src/__tests__/walletSelectDomain.test.ts`

Expected: FAIL，模块不存在。

- [x] **Step 3：实现纯 domain 并转绿**

Run: `npm run test:run -- src/__tests__/walletSelectDomain.test.ts`

Expected: PASS；target使用 `getAddress` / lowercase规范化，绝不选择第一项。

- [x] **Step 4：写 RED service tests**

覆盖：invalid Privy 401；closed / suspended 403；target not linked 403；cross-account 409；stale 409；RPC success Viewer-only response；同 operation id幂等；RPC未知错误 500；响应不包含 token / expiry；所有日志输入均为 redacted metadata。

固定 service contract：

```ts
export type WalletSelectSuccess = {
  idempotent: boolean;
  operation_id: string;
  user: AuthViewerPayload;
};

export function createWalletSelectService(deps: WalletSelectServiceDependencies):
  (input: WalletSelectInput) => Promise<WalletSelectServiceResult>;
```

- [x] **Step 5：实现 service 与 thin HTTP entrypoint**

`service.ts` 顺序固定：verify Privy token → exact linked target → investor lookup/status → RPC → roles lookup → authoritative Viewer response。`index.ts` 只接受 POST/OPTIONS，body最多四个字段，不记录原始 body。dependencies 不读取 `SUPA_JWT_SECRET`，service contract 不包含 signer。

- [x] **Step 6：运行 Edge Function GREEN / scans**

```bash
npm run test:run -- src/__tests__/walletSelectDomain.test.ts src/__tests__/walletSelectService.test.ts
npm run lint
rg -n "linked_accounts\[0\]|console\.(log|error).*token|\.from\(['\"](investors|investor_wallets)['\"]\).*\.update" supabase/functions/wallet-select
git diff --check
```

Expected: tests PASS；scan无匹配；`wallet-login/index.ts` diff为空。

- [x] **Step 7：提交 Front Task**

```bash
git add supabase/functions/wallet-select src/__tests__/walletSelectDomain.test.ts src/__tests__/walletSelectService.test.ts
git commit -m "feat: add verified wallet select endpoint"
```

### Task 3：移动端 `wallet-select` contract 与安全 Viewer-only 持久化

- 业务场景：平台成功后保留同一账户现有 JWT / expiry，只持久化 authoritative Viewer；失败可用相同 operation恢复。
- 范围内：Viewer-only response parser、HTTP client、Auth workflow `replaceViewer`、generation guard、session-record identity check、测试、public endpoint config。
- 范围外：连接钱包、SIWE、Wallet UI。
- 预计影响文件：
  - Create: `src/features/wallet/services/walletSelectClient.ts`
  - Create: `src/features/wallet/__tests__/walletSelectClient.test.ts`
  - Modify: `src/features/auth/services/authExchangeClient.ts`
  - Modify: `src/features/auth/workflow/authWorkflow.ts`
  - Modify: `src/features/auth/__tests__/authWorkflow.test.ts`
  - Modify: `src/app/providers/AuthProvider.tsx`
  - Modify: `src/app/providers/__tests__/AuthProvider.test.tsx`
  - Modify: `src/app/config/publicConfig.ts`
  - Modify: `src/app/config/__tests__/publicConfig.test.ts`
- 结构验收：Wallet-select 使用独立 Viewer-only parser，不伪造 `AuthExchangeResult`；Wallet client不直接写 SecureStore；AuthProvider只应用 workflow result。
- 可测试性验收：HTTP / Viewer persistence adapter均注入；late result在 auth generation变化后被丢弃；token / refresh token / expiry逐字段保持不变。

- [x] **Step 1：写 RED client / auth tests**

断言 request 仅包含 `privyToken/targetAddress/expectedPreviousAddress/operationId`；解析 operation id、idempotent和 Viewer并拒绝 token字段；stable 409/401/503错误；`replaceViewer` 成功保留 token/expiry并更新 Viewer，账户 mismatch或存储失败返回 false，logout generation 后结果无效。

- [x] **Step 2：运行 RED tests**

Run: `npm test -- --run src/features/wallet/__tests__/walletSelectClient.test.ts src/features/auth/__tests__/authWorkflow.test.ts src/app/providers/__tests__/AuthProvider.test.tsx`

Expected: FAIL，新 client / action 不存在。

- [x] **Step 3：导出共享 parser并实现 client**

```ts
export async function selectWalletForViewer(input: {
  endpoint: string;
  expectedPreviousAddress: `0x${string}`;
  fetcher?: typeof fetch;
  operationId: string;
  privyToken: string;
  targetAddress: `0x${string}`;
}): Promise<{ idempotent: boolean; operationId: string; viewer: AuthViewer }>;
```

`authExchangeClient.ts` 与 `wallet-login` request / parser behavior保持不变；wallet-select client独立解析 Viewer-only contract。

- [x] **Step 4：实现 generation-safe `replaceViewer`**

```ts
replaceViewer(
  viewer: AuthViewer,
  expectedViewerId: string,
  isCurrent?: () => boolean,
): Promise<{ ok: boolean; viewer?: AuthViewer }>;
```

AuthProvider action捕获当前 generation与 Viewer id；session adapter读取当前 secure session，确认未过期且 stored/current/response viewer id一致，原样保留 access token、refresh token与expiresAt，只替换 Viewer。写成功且 generation未变化才更新 authenticated Viewer；不调用 Supabase `setSession`。

- [x] **Step 5：增加 endpoint public config并转绿**

默认 `walletSelectPath = "/functions/v1/wallet-select"`；允许 `EXPO_PUBLIC_SUPABASE_WALLET_SELECT_PATH` 覆盖。Run聚焦 tests + `npm run typecheck`，Expected PASS。

- [x] **Step 6：提交 mobile session Task**

```bash
git add src/features/auth src/features/wallet/services/walletSelectClient.ts src/features/wallet/__tests__/walletSelectClient.test.ts src/app/providers src/app/config
git commit -m "feat: add wallet selection viewer contract"
```

### Task 4：Reown connector 与 Privy SIWE adapter

- 业务场景：连接 MetaMask、Rabby 等 WalletConnect-compatible 钱包，获得明确 EVM 地址并由该钱包完成 Privy SIWE link。
- 范围内：固定依赖、Babel import-meta配置、AppKit provider/modal、Ethers adapter、连接 / 签名 adapter、Privy link adapter、public Reown config、单测。
- 范围外：业务状态机、平台选择、钱包检测白名单、专有 MetaMask/Rabby SDK、交易签名。
- 预计影响文件：
  - Modify: `package.json`, `package-lock.json`, `app.json`, `index.ts`
  - Create: `babel.config.js`
  - Create: `src/app/providers/WalletConnectionProvider.tsx`
  - Create: `src/features/wallet/services/reownWalletConnectionAdapter.ts`
  - Create: `src/features/wallet/services/privyWalletLinkAdapter.ts`
  - Create: `src/features/wallet/__tests__/reownWalletConnectionAdapter.test.ts`
  - Create: `src/features/wallet/__tests__/privyWalletLinkAdapter.test.ts`
  - Modify: `src/app/config/publicConfig.ts`, `src/app/config/__tests__/publicConfig.test.ts`
- 结构验收：Reown类型只存在 provider / adapter；workflow只看到 `connect/sign/disconnect/link` 接口；无 Wagmi / React Query。
- 可测试性验收：adapter核心 mapper / signer用 fake EIP-1193 provider；Privy adapter用 fake hook functions。

- [x] **Step 1：安装固定依赖并建立配置 RED tests**

```bash
npm install --save-exact @reown/appkit-react-native@2.0.6 @reown/appkit-ethers-react-native@2.0.6 @walletconnect/react-native-compat@2.23.10
npx expo install @react-native-async-storage/async-storage @react-native-community/netinfo expo-application
```

添加测试断言 missing Reown project id时只禁用 connection capability，不让 token进入错误文本；adapter拒绝 non-eip155、invalid address和address mismatch。

- [x] **Step 2：运行 RED adapter tests**

Run: `npm test -- --run src/features/wallet/__tests__/reownWalletConnectionAdapter.test.ts src/features/wallet/__tests__/privyWalletLinkAdapter.test.ts src/app/config/__tests__/publicConfig.test.ts`

Expected: FAIL，provider / adapter 不存在。

- [x] **Step 3：实现 AppKit provider 与原生配置**

`babel.config.js` 使用 `babel-preset-expo` + `unstable_transformImportMeta: true`；`app.json` 增加 `scheme: "mytradeapp"`；provider使用 BSC / BSC Testnet network、EthersAdapter、AsyncStorage、`mytradeapp://` redirect并渲染 `<AppKit />`。配置 `features: { swaps: false, onramp: false, socials: false, showWallets: true }`、`enableAnalytics: false`、`logger: "error"`，只开放 wallet connection。

- [x] **Step 4：实现 connection / SIWE adapters**

```ts
export type ConnectedExternalWallet = {
  address: `0x${string}`;
  chainId: `eip155:${number}`;
  connectorType: "wallet_connect";
  providerLabel: string;
  signMessage(message: string): Promise<string>;
};

export type PrivyWalletLinkAdapter = {
  link(wallet: ConnectedExternalWallet, origin: string): Promise<void>;
};
```

sign使用 `personal_sign`；Privy adapter依次调用 `generateSiweMessage`、wallet signer、`linkWithSiwe`，并校验返回 user含 target。

- [x] **Step 5：运行 GREEN、Expo dependency check与 typecheck**

```bash
npm test -- --run src/features/wallet/__tests__/reownWalletConnectionAdapter.test.ts src/features/wallet/__tests__/privyWalletLinkAdapter.test.ts src/app/config/__tests__/publicConfig.test.ts
npx expo install --check
npm run typecheck
```

Expected: PASS；无 duplicate Viem / Valtio blocking mismatch；Expo Go不可用不视为失败，dev build必须可编译。

- [x] **Step 6：提交 connector Task**

```bash
git add package.json package-lock.json app.json index.ts babel.config.js src/app/providers/WalletConnectionProvider.tsx src/app/config src/features/wallet/services src/features/wallet/__tests__
git commit -m "feat: add external wallet connection adapters"
```

### Task 5：钱包选择状态机、恢复和 Wallet UI

- 业务场景：绑定后立即 active；已有钱包显示 inline `Use` / `Connect`；所有失败路径可恢复且身份不一致期间锁定 wallet mutation。
- 范围内：pure machine/workflow、operation storage、shared mutation lock、inline UI、AppRoot injection、navigation plumbing、tests。
- 范围外：Web、转账、购买、链切换、自动 conflict unlink。
- 预计影响文件：
  - Create: `src/features/wallet/workflow/walletSelectionMachine.ts`
  - Create: `src/features/wallet/workflow/walletSelectionWorkflow.ts`
  - Create: `src/features/wallet/services/walletSelectionOperationStorage.ts`
  - Create: `src/features/wallet/services/createWalletSelectionDependencies.ts`
  - Create: `src/features/wallet/__tests__/walletSelectionMachine.test.ts`
  - Create: `src/features/wallet/__tests__/walletSelectionWorkflow.test.ts`
  - Create: `src/features/wallet/__tests__/walletSelectionOperationStorage.test.ts`
  - Modify: `src/features/wallet/domain/walletModels.ts`, `walletIdentity.ts`
  - Modify: `src/features/wallet/components/WalletIdentitySection.tsx`
  - Modify: `src/features/wallet/screens/WalletScreen.tsx`
  - Modify: `src/features/wallet/__tests__/WalletScreen.test.tsx`, `walletIdentity.test.ts`
  - Modify: `src/app/AppRoot.tsx`, `src/app/navigation/AppNavigator.tsx`, related tests
- 结构验收：pure reducer无 IO；workflow无 React；screen只映射状态 / handlers；section只展示；selection与unlink共享single-flight。
- 可测试性验收：每个需求验收场景可用 fake deps驱动；无真实 modal/token/network。

- [x] **Step 1：写 RED machine / workflow tests**

固定状态 union：`idle | connecting | binding | confirming_switch | platform_syncing | sync_error | viewer_persisting | viewer_sync_pending | conflict | consistency_error | complete`。覆盖新绑定自动 select、连接地址 mismatch、取消确认、平台确定失败、未知结果同 operation retry、Viewer retry不重复 link或生成新 operation、logout generation、concurrent action拒绝。

- [x] **Step 2：运行 RED workflow tests**

Run: `npm test -- --run src/features/wallet/__tests__/walletSelectionMachine.test.ts src/features/wallet/__tests__/walletSelectionWorkflow.test.ts`

Expected: FAIL，新模块不存在。

- [x] **Step 3：实现 pure machine / workflow与operation storage**

```ts
export type WalletSelectionDependencies = {
  confirmSwitch(target: WalletSelectionTarget): Promise<boolean>;
  connect(expectedAddress?: `0x${string}`): Promise<ConnectedExternalWallet>;
  getPrivyAccessToken(): Promise<string>;
  link(wallet: ConnectedExternalWallet): Promise<void>;
  newOperationId(): string;
  persistViewer(viewer: AuthViewer): Promise<boolean>;
  select(input: WalletSelectRequest): Promise<WalletSelectResult>;
  operationStorage: WalletSelectionOperationStorage;
};
```

operation storage只保存 operation id、target、previous、stage和 timestamp；登出 / complete清理，不保存 token / JWT。读取旧 `session_persisting/session_sync_pending` stage 时规范化为 `viewer_persisting/viewer_sync_pending`，保护已有本地恢复数据。

- [x] **Step 4：写 RED Wallet UI / identity tests**

断言：active无 action；connected external显示 `Use`；unconnected external显示 `Connect`；embedded linked显示 `Use`；bind按钮；操作中固定 action slot / spinner；sync error显示 Retry；conflict显示 `Remove link`；selection busy时 unlink不可触发；所有地址缩略显示。

- [x] **Step 5：实现 UI 与 dependency plumbing**

`AppRoot` 在 Reown / Privy provider内构造 adapters；`AppNavigator` 只透传 `walletSelectionDependencies`；`WalletScreen` 使用一个 `identityMutationInFlight` 协调 selection / unlink并将 presentation传给 section。正常完成后 Viewer地址触发 balance / receive刷新。

- [x] **Step 6：运行 Wallet GREEN 与回归 tests**

```bash
npm test -- --run src/features/wallet src/app/navigation src/app/providers
npm run typecheck
git diff --check
```

Expected: PASS；四种行状态布局稳定；原解绑资格和 retry行为不回归。

- [x] **Step 7：提交 Wallet workflow / UI Task**

```bash
git add src/features/wallet src/app/AppRoot.tsx src/app/navigation
git commit -m "feat: add controlled wallet binding and switching"
```

### Task 6：跨仓库安全、数据、业务边界与发布前验证

- 业务场景：用机器证据证明身份、原子性、RLS、session 和 UI路径一致；Android 明确延后而非伪装通过。
- 范围内：全量测试、forbidden scans、database / security / business review、iOS build / manual QA、run artifact。
- 范围外：production deploy、Android 当轮真机、真实跨账户破坏性写入。
- 预计影响文件：
  - Create: `docs/ai-delivery/runs/2026-07-20-rn-wallet-switching-verification.md`
  - Update only if evidence changes decisions: requirement/design/implementation docs
- 结构验收：验证结果按仓库、场景、命令记录；任何 blocker包含 owner、evidence path、next action。
- 可测试性验收：机器验证覆盖所有纯逻辑；真实 provider / deep-link只作为 iOS QA；Android列为发布门禁。

- [x] **Step 1：运行三个仓库全量测试 / lint / typecheck**

执行 Machine Verification 表全部命令并记录 exit code与摘要。

- [x] **Step 2：执行数据库 Review**

检查表、字段、RLS、grant、索引、锁顺序、短事务、unique conflict、operation growth和rollback顺序；若本地 Supabase / Docker可用，执行 `verify_wallet_selection.sql`，否则明确记录为部署前 blocker。

- [x] **Step 3：执行安全 Review**

检查 Privy token验证、target exact match、investor推导、session generation、secret boundary、log redaction、direct update denial、cross-user isolation；Critical / Important未关闭则停止。

- [x] **Step 4：执行业务边界 Review**

确认 investor id、KYC、points、referrals、commissions、holdings不被更新；绑定即 active；Web与Android未被误报完成。

- [ ] **Step 5：执行 iOS dev build与真机 QA**

验证 MetaMask或Rabby至少一个 WalletConnect-compatible provider：连接取消、SIWE失败、绑定即 active、已有钱包切换、wallet selection前后 token / expiry不变、独立auth refresh、地址 mismatch。测试数据不足时记录 owner与下一动作，不执行生产冲突构造。

- [x] **Step 6：写 verification artifact并运行 AI Delivery**

```bash
npm run ai:audit -- rn-wallet-switching
npm run ai:verify -- rn-wallet-switching --write
```

记录 Android deferred gate、未部署状态、三仓库 commits、测试矩阵和残余风险。

- [x] **Step 7：提交验证文档**

```bash
git add docs/ai-delivery/runs/2026-07-20-rn-wallet-switching-verification.md docs/ai-delivery
git commit -m "docs: verify mobile wallet switching delivery"
```

### Task 7：将钱包选择改为 Viewer-only 持久化

- 业务场景：同一 investor 切换 active wallet 后，数据库和客户端 Viewer 收敛到目标地址，但现有应用 JWT、refresh token 与过期时间保持不变。
- 范围内：Edge Function Viewer-only response、移动端 response parser、SecureStore Viewer-only update、AuthProvider action、selection state / recovery stage、测试和源文档。
- 范围外：数据库 migration、`wallet-login`、Privy / Reown adapters、JWT refresh策略、生产部署。
- 预计影响文件：
  - Modify: `/Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select/service.ts`
  - Modify: `/Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select/dependencies.ts`
  - Modify: `/Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/src/__tests__/walletSelectService.test.ts`
  - Modify: `/Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/src/__tests__/walletSelectHttp.test.ts`
  - Modify: `src/features/wallet/services/walletSelectClient.ts`
  - Modify: `src/features/auth/services/sessionStorage.ts`
  - Modify: `src/features/auth/workflow/authWorkflow.ts`
  - Modify: `src/app/providers/AuthProvider.tsx`
  - Modify: `src/features/wallet/workflow/walletSelectionMachine.ts`
  - Modify: `src/features/wallet/workflow/walletSelectionWorkflow.ts`
  - Modify: `src/features/wallet/services/walletSelectionOperationStorage.ts`
  - Modify: `src/features/wallet/services/createWalletSelectionDependencies.ts`
  - Modify: `src/features/wallet/components/WalletSelectionRuntime.tsx`
  - Modify: `src/features/wallet/components/WalletIdentitySection.tsx`
  - Modify: focused tests under `src/features/auth/__tests__`, `src/app/providers/__tests__`, and `src/features/wallet/__tests__`
- 结构验收：wallet-select service无 signer依赖；wallet client不复用 auth-exchange parser；Viewer写集中在 Auth session adapter；workflow不读取 token；UI只消费状态名称。
- 可测试性验收：后端响应 shape、token字段缺失、session字段逐项不变、账户 mismatch、过期 session、generation change、legacy recovery stage normalization和同 operation retry均有确定性测试。

- [x] **Step 1：写 Edge Function RED tests**

将 success contract固定为：

```ts
export type WalletSelectSuccess = {
  idempotent: boolean;
  operation_id: string;
  user: AuthViewerPayload;
};
```

测试断言 service返回 RPC `idempotent`，响应对象没有 `access_token` / `expires_in`，dependencies无需 `signJwt`，HTTP success body保持相同 Viewer-only shape。

- [x] **Step 2：运行 Edge RED**

Run：

```bash
npm run test:run -- src/__tests__/walletSelectService.test.ts src/__tests__/walletSelectHttp.test.ts
```

Expected：FAIL，现有实现仍要求 signer并返回 JWT字段。

- [x] **Step 3：实现 Edge Viewer-only response并转绿**

删除 `WalletSelectServiceDependencies.signJwt`、`jose` import、`SUPA_JWT_SECRET`读取和 `jwt_signing` stage；success value直接使用 RPC `idempotent`与已验证 Viewer。重新运行 Step 2，Expected：PASS。

- [x] **Step 4：写 mobile RED tests**

新增 / 修改测试以固定接口：

```ts
export type WalletSelectResult = {
  idempotent: boolean;
  operationId: string;
  viewer: AuthViewer;
};

replaceViewer(
  viewer: AuthViewer,
  expectedViewerId: string,
  isCurrent?: () => boolean,
): Promise<{ ok: boolean; viewer?: AuthViewer }>;
```

session storage测试使用包含 `accessToken`、`refreshToken`、`expiresAt`、旧 Viewer的 fixture，断言成功后前三项严格不变、只替换 Viewer；stored/current/response id mismatch、缺失 / 过期 session返回失败且不写。状态机测试固定 `viewer_persisting/viewer_sync_pending`；operation storage测试把 legacy `session_persisting/session_sync_pending`读取后规范化为新 stage。

- [x] **Step 5：运行 mobile RED**

Run：

```bash
npm test -- --run src/features/wallet/__tests__/walletSelectClient.test.ts src/features/auth/__tests__/sessionStorage.test.ts src/features/auth/__tests__/authWorkflow.test.ts src/app/providers/__tests__/AuthProvider.test.tsx src/features/wallet/__tests__/walletSelectionMachine.test.ts src/features/wallet/__tests__/walletSelectionWorkflow.test.ts src/features/wallet/__tests__/walletSelectionOperationStorage.test.ts
```

Expected：FAIL，现有实现仍解析 AuthExchangeResult、替换 session并使用旧 stage。

- [x] **Step 6：实现 mobile Viewer-only persistence并转绿**

`walletSelectClient` 独立解析 `{ operation_id, idempotent, user }`；Auth session adapter读取当前 stored session并保留 credential字段；AuthProvider使用 generation与expected viewer id保护结果；workflow缓存 Viewer-only selection并调用 `persistViewer`；runtime注入 `replaceViewer`；所有新状态和legacy stage normalization保持 operation id forward recovery。重新运行 Step 5，Expected：PASS。

- [x] **Step 7：运行跨仓库验证与审查**

运行 Machine Verification 表全部命令、`npm run ai:audit -- rn-wallet-switching`、`npm run ai:verify -- rn-wallet-switching --write`，并更新 verification artifact。安全 review确认 wallet-select无 JWT secret；数据 review确认 migration / RPC无变化；业务 review确认 investor / KYC /权益不变且钱包切换不延长登录生命周期。

## 业务追踪矩阵

| 业务场景 | 实现位置 | 测试 / 验证 | 状态 |
| -------- | -------- | ----------- | ---- |
| 绑定新钱包并立即 active | Task 4 SIWE adapter + Task 5 workflow | `walletSelectionWorkflow.test.ts` + iOS QA | Planned |
| 切换已连接钱包 | Task 5 workflow / UI | workflow + WalletScreen tests | Planned |
| 切换未连接钱包 | Task 4 connector + Task 5 workflow | address-match unit test + iOS QA | Planned |
| 取消已有钱包切换 | Task 5 native confirm workflow | workflow test断言无 platform call | Planned |
| Privy 绑定失败 | Task 4 SIWE adapter + Task 5 workflow | fake Privy rejection test | Planned |
| 连接或地址校验失败 | Task 4 connector + Task 5 workflow | invalid/mismatch tests | Planned |
| 平台同步失败 | Task 2 stable error + Task 5 sync_error | service + workflow retry tests | Planned |
| 平台结果不确定 | Task 1 ledger + Task 5 recovery | RPC idempotency + workflow recovery test | Planned |
| Viewer 持久化失败 | Task 3 replaceViewer + Task 5 viewer_sync_pending | session storage + AuthProvider + workflow tests | Planned |
| 跨账户钱包冲突 | Task 1 unique/RPC + Task 2 409 + Task 5 conflict UI | SQL verification + service/UI tests | Planned |
| 陈旧或并发请求 | Task 1 expected previous / locks | SQL verification + workflow single-flight | Planned |
| 幂等重试 | Task 1 operation ledger | SQL verification + service test | Planned |
| 非 linked / 伪造目标 | Task 2 exact linked target | domain/service tests | Planned |
| 状态一致性 | Task 1 RPC + Task 3 session + Task 5 UI | cross-layer tests + iOS QA | Planned |
| 账户权益隔离 | Task 1 RPC column scope | SQL / business boundary review | Planned |
| 登出或账户变化 | Task 3 generation guard + Task 5 cleanup | AuthProvider/workflow tests | Planned |
| Android 延后验证 | Task 6 verification artifact | release gate明确为 deferred | Planned |

## Final Verification Required

- [x] Typecheck：MyTradeApp `npm run typecheck`。
- [x] Unit / integration tests：三个仓库对应全量测试均 exit 0。
- [x] Forbidden pattern scan：Machine Verification 表中所有 `rg` 完成并记录匹配解释。
- [x] Database：migration contract pass；本地 RPC/RLS verification执行或形成明确部署前 blocker。
- [ ] Manual QA：iOS dev build验证连接 / SIWE / 选择 / session；Android继续作为统一后续门禁。
- [x] Reviews：安全、数据、业务边界无未解决 Critical / Important。
- [x] 验证结果写入 `docs/ai-delivery/runs/2026-07-22-rn-wallet-switching-verification.md`。

## 完成定义

- [x] 每个验收场景都有对应实现和验证方式。
- [x] 业务边界、权限边界和代码结构边界与方案一致。
- [x] loading、空态、错误态、权限态按需覆盖。
- [x] 测试通过，Review 无未解决 Critical / Important 问题。
- [x] 三仓库 commit独立可审查；没有 production deployment。
