# 方案设计：移动端受控钱包解绑

日期：2026-07-18
Feature slug：`rn-wallet-controlled-unlink`
状态：已设计

## 背景

Task 8A-8C 已提供只读 Wallet 页面，但用户无法移除同一 Privy 账户下不再使用的外部钱包。Task 8D 在不引入钱包切换、连接、转账或新后端接口的前提下，增加一次显式确认的受控解绑，并沿用已部署的 `wallet-login` 让 Privy 状态、平台钱包记录和移动端短期会话重新收敛。

本文件是已批准并已实现的 Task 8D 方案在 AI Delivery canonical 路径下的回填。业务源文档是 `docs/superpowers/specs/2026-07-17-mobile-wallet-controlled-unlink-design.md`，实现证据是 `docs/ai-delivery/runs/2026-07-17-rn-wallet-controlled-unlink-verification.md`。

## 推荐方案

采用现有的三层受控写路径：Wallet 领域 workflow 负责目标资格和顺序，运行时 adapter 负责原生确认与 Privy SDK，Auth workflow 负责无登录弹窗的 session refresh。Privy unlink 成功后重新调用 `wallet-login`，由服务端验证当前 Privy token、同步 `investor_wallets`、更新 `investors.wallet_address` 并签发同一账户的新短期 JWT 与 `AuthViewer`。

```text
WalletScreen
  -> canonical eligibility guard
  -> native destructive confirmation
  -> Privy unlink exactly once
  -> AuthProvider.refreshSession()
     -> fresh Privy access token
     -> wallet-login
        -> Privy /users/me verification
        -> service-side wallet reconciliation
        -> replacement short-lived JWT + AuthViewer
     -> persist replacement client session
     -> replace Viewer
```

不新增 `sync-wallets`、`wallet-select`、数据库 migration、RLS policy、链上写入或新的客户端 secret。Privy 已成功解绑但平台同步失败时，只重试 `wallet-login`，不能再次调用 Privy unlink。

## Open Questions Resolution

| 需求中的开放问题 | 处理结论 | 是否阻塞开发 |
| ---------------- | -------- | ------------ |
| 已确认不适用：本功能不转移资产、不支付费用、不发起交易，因此 `payment` 与 `contract` 风险标签保持未勾选；Wallet/钱包仅表示身份关联管理。 | **Resolved**：方案没有支付、合约、签名或资产转移路径；保留 `auth`、`permission`、`database`、`rls`、`external-provider` 和 `controlled-write` 风险。 | No |
| 高风险、已缓解：Privy unlink 是外部不可逆写操作。必须通过 canonical eligibility guard、原生明确确认、单次调用锁和后端再次验证降低误操作风险。 | **Resolved**：`canUnlinkWallet` 使用当前 identity 中的 canonical wallet；WalletScreen 用 in-flight lock 串行化；原生 Alert 明确 provider 和缩略地址；Privy 与 `wallet-login` 分别验证外部写入和平台身份。 | No |
| 高风险、已验证：真实 iOS 解绑已于 2026-07-18 执行一次；Privy 与 `wallet-login` 均返回成功，活跃 Embedded Wallet 保持不变。发布证据不得包含原始 token。 | **Resolved**：真实执行证据只记录缩略地址、HTTP 状态和结果，不记录 token。证据保存在受控验证文档中。 | No |
| 非阻塞、发布前门禁：Android 原生确认和取消仍需设备 QA；未通过前不得把跨平台 QA 标记为完成。 | **Non-blocking**：不阻塞方案和确定性测试，但阻塞跨平台 release-ready 声明。 | No |
| 已接受残余风险：自动化已覆盖 `sync_error`、联网后 `Retry sync` 且无第二次 Privy unlink；2026-07-19 用户决定不为该路径再次执行不可逆真实解绑，设备级离线恢复证据不再阻塞当前 feature，不能表述为已真机通过。 | **Resolved by explicit waiver**：保留 workflow/Screen/Auth 自动化与一次正常真实 iOS 解绑证据；不创建第二个 disposable wallet，不安装代理，不把 waiver 写成 device pass。 | No |
| 非阻塞：Privy metadata 与平台同步可能短暂最终一致；客户端以 `complete(address)` 抑制已完成地址，重新进入页面后以新 metadata 为准。 | **Resolved**：`complete(address)` 只抑制刚完成的目标；当新 identity 不再包含该地址时回到 `idle`。不增加轮询或 Realtime。 | No |
| 非阻塞：当前 `wallet-login` 同时承担登录、钱包同步和 JWT 重新签发，职责存在耦合；本阶段沿用现有后端契约，未来实现 `sync-wallets` / `wallet-select` 时再单独重构。 | **Deferred**：Task 8D 继续复用已部署契约；独立同步/选择接口必须另立 feature，并提供兼容迁移。 | No |
| 已确认不阻塞：Privy unlink 使用明确 `address`，不依赖 `linked_accounts` 数组顺序；现有 `wallet-login` 的 primary 选择策略属于独立后端技术债，不纳入本移动端解绑 feature 的改动或发布门禁。 | **Resolved for current scope**：canonical target address 决定解绑对象；设备 QA 比较实际 Viewer/account 前后状态。通用 primary 策略和日志硬化另立后端任务。 | No |
| 非阻塞：真实解绑后的数据库收敛采用 `wallet-login` 服务级成功语义证明，没有从移动客户端执行特权 SQL；直接数据库审计应由具备服务权限的后端/运维执行。 | **Non-blocking**：移动端不得获得 service key；当前用服务成功语义和源代码路径证明，生产数据库抽查由后端/运维执行。 | No |
| 延后：解绑后的自动重新绑定、钱包切换、外部钱包连接、转账与签名不属于本功能。 | **Deferred**：保持范围外，不能借本方案加入入口、SDK 调用或占位按钮。 | No |
| 延后：iOS Wallet 页面曾出现解绑前已启动的 Supabase `/auth/v1/user` 超时提示；日志证明与解绑请求无关，应作为独立 auth-client 后台请求问题处理。 | **Deferred**：作为独立 auth-client 诊断任务处理，不改变 Task 8D 成功判定。 | No |

## Decision Notes

| 决策 | 原因 | 影响 |
| ---- | ---- | ---- |
| 沿用 `wallet-login`，不新增同步函数 | 用户已确认当前先沿用；现有函数已能验证 Privy token、同步钱包并签发会话 | 后端职责继续耦合，后续重构需兼容现有客户端 |
| `AuthViewer.walletAddress` 是移动端活跃钱包唯一来源 | linked-wallet metadata 只能描述关联钱包，不能授权平台数据 | UI、余额、QR 和解绑 guard 都不从列表顺序推导 active |
| 新 JWT 代表同一账户的替换会话 | `wallet-login` 以相同 Privy user 找到相同 investor id，再签发 30 分钟 JWT | 刷新不打开登录 UI，不创建或切换账户 |
| 不把兼容占位值持久化或解释为 refresh token | 顶层 `wallet-login` 响应只提供 `access_token` 与 `expires_in`；既有 Supabase adapter 因 `setSession` 参数要求会瞬时传入 access token 作为占位值 | `AuthExchangeSession` 和 SecureStore 只保存 access token、expiresAt 和 Viewer；占位值不提供刷新能力或新授权，后续移除该 adapter 兼容需另立 auth 任务 |
| Privy 成功后只允许同步重试 | 外部解绑不可逆，重复调用可能产生错误或不可预测行为 | `sync_error` 只暴露 `Retry sync`，workflow 仅调用 `refreshSession` |
| UI 资格检查不是最终授权 | 客户端对象和地址可被篡改 | Privy 验证解绑权限，`wallet-login` 从验证后的 token 推导 investor，不接收 `investor_id` |
| 不把多步数据库同步描述成单事务 | 当前函数逐钱包 upsert、再 removed update、再 investor mirror update | 中途失败可能部分完成；重复 `wallet-login` 用幂等 upsert/update 收敛 |
| Privy 数组顺序不属于解绑目标选择逻辑 | `unlinkWallet({ address })` 使用 canonical target address，不按 `linked_accounts` 索引解绑 | 本 feature 只在实际 QA 中比较解绑前后 Viewer/account；`wallet-login` primary 选择策略作为独立后端技术债，不要求修改 ArtStarFront |

## 分层边界

- UI：`WalletIdentitySection` 只渲染 eligible action、稳定 progress、错误和 Retry sync；`WalletScreen` 持有页面本地 mutation state 与并发锁，不直接调用 Edge Function URL 或 session storage。
- Workflow / service：`walletUnlinkWorkflow.ts` 重新查找 canonical target、执行 confirm -> unlink -> refresh 顺序，并隔离 retry-only-sync；`createWalletUnlinkDependencies.ts` 只适配 React Native Alert、Privy hook 和 Auth action。
- Auth：`authWorkflow.refreshSession` 获取新 Privy token、调用既有 exchange adapter，并在 auth generation 仍有效时持久化替换 session；`AuthProvider` 只在成功后替换 Viewer，失败时保留当前 authenticated snapshot。
- Data / external provider：Privy 是关联钱包和 unlink 的可信系统；`wallet-login` 是 Privy 到平台数据的唯一写边界；Supabase admin client 只存在于 Edge Function，移动端不直接写 `investor_wallets` 或 `investors`。

## 代码结构边界

- 入口层：`AppRoot.tsx` 读取 Privy hooks 和 Auth actions，创建 `WalletUnlinkDependencies`；`AppNavigator.tsx` 只把依赖传入受保护 Wallet route。
- 领域逻辑层：`src/features/wallet/workflow/walletUnlinkWorkflow.ts` 拥有 `canUnlinkWallet`、`requestWalletUnlink` 和 `retryWalletSync`，不依赖 React、网络或全局状态。
- 展示层：`WalletScreen.tsx` 把 workflow result 映射为 UI 状态；`WalletIdentitySection.tsx` 不决定可信身份。
- Auth workflow：`src/features/auth/workflow/authWorkflow.ts` 拥有非交互 refresh 和 generation guard；`src/features/auth/services/authExchangeClient.ts` 解析 `wallet-login` 响应。
- 数据或外部系统边界：`createWalletUnlinkDependencies.ts`、auth exchange adapter、session adapter 和已部署 `wallet-login` 分别封装 Alert、Privy、HTTP、持久化和服务端数据库写入。
- 新增行为注册方式：本功能只有一种解绑策略，使用显式依赖接口和 adapter，不引入 registry/strategy map。未来出现多个 wallet provider 写策略时再立独立分发层。
- 避免的结构漂移：禁止在 Screen 拼接 Edge Function URL、读取 secret、写 Supabase 表、根据 route/input 推导 target，或把 unlink/sync 分支复制到多个组件。

## 模块内聚与可测试性

- `walletUnlinkWorkflow.ts`：纯资格与顺序逻辑；用 fake dependencies 覆盖所有 result，不需要 React Native、Privy 或网络。
- `createWalletUnlinkDependencies.ts`：原生确认和 SDK 绑定；用 fake Alert、unlink 与 refresh 验证 destructive action 和取消路径。
- `WalletScreen.tsx`：页面状态、锁、完成地址抑制；用 React Test Renderer 验证可达操作、重复点击、错误、retry 和 dependency unavailable。
- `authWorkflow.ts`：session refresh、错误归一化和 generation guard；用 fake Privy/exchange/session 验证不打开登录 UI、失败不清 session、过期结果不持久化。
- `AuthProvider.tsx`：认证 snapshot；用 provider tests 验证成功替换 Viewer、失败保留 Viewer、logout supersedes refresh。
- 副作用边界：Alert 与 Privy unlink 在 runtime adapter；HTTP exchange 与 SecureStore/session 写入在 Auth adapters；数据库写入只在 Edge Function。
- 隐式依赖：没有 localStorage、Realtime 或轮询；网络与时间只存在 adapter/Edge Function。屏幕以 Viewer id/address 变化重置本地状态。
- TDD 约束：现有实现保留 red-green 证据；后续修复 active-wallet invariant 或日志隐私问题时，必须先添加能复现问题的失败测试，再修改代码。

## 数据流

1. `mapWalletIdentity` 合并 `AuthViewer.walletAddress` 与 Privy metadata，标记 active/linked、embedded/external 和 `privyLinked`。
2. 用户点击 eligible external row；`WalletScreen` 检查依赖、当前状态和 in-flight lock。
3. `requestWalletUnlink` 按地址回查当前 canonical wallet，并重新执行资格 guard。
4. native Alert 显示 provider 与缩略地址。取消直接返回 `idle`，无任何外部写入。
5. 确认后 adapter 调用 `unlinkWallet({ address })` 一次。失败进入 `unlink_error`，不刷新平台。
6. Privy 成功后 `AuthProvider.refreshSession` 获取新的 Privy access token，并通过 `authExchangeClient` POST 到 `wallet-login`。
7. `wallet-login` 调用 Privy `/users/me` 验证 token，按 `privy_user_id` 查找 investor；客户端不提交 investor id。
8. 服务端 upsert 当前 linked wallets，将缺失 active rows 更新为 `status='removed', is_primary=false`，再更新 `investors.wallet_address`。
9. 服务端为同一 user id 签发 30 分钟 JWT，返回顶层 `access_token`、`expires_in`、`user_status` 和 `user`。
10. 客户端保存 access token、expiresAt 与 Viewer。AuthProvider 替换 Viewer，Wallet 抑制刚完成地址直到 Privy metadata 收敛。
11. 第 6-10 步失败时保留旧会话和 Viewer，进入 `sync_error`；Retry sync 只重复第 6-10 步。

## 状态与实时行为

```text
idle
  -> confirming
     -> idle                         cancel / ineligible
     -> unlinking(address)
        -> unlink_error(address)     Privy failed
           -> confirming             new explicit attempt
        -> syncing(address)          Privy succeeded
           -> sync_error(address)    platform/session failed
              -> syncing(address)    Retry sync only
           -> complete(address)
              -> idle                metadata no longer contains address
```

- 可信来源：active address 来自 `AuthViewer`；linked wallet identity 与 unlink result 来自 Privy；平台同步结果来自 `wallet-login`；页面状态不是授权来源。
- 非法流转：取消后不能进入 sync；`unlink_error` 不能跳过新确认；`sync_error` 不能再次 unlink；ineligible target 不能触发 Alert；Viewer/logout 代次变化后旧 refresh 不能写 session。
- 并发：一个 Screen 同时最多一个 mutation。in-flight ref 在 state render 前立即锁住快速重复点击；Auth workflow generation guard 阻止登出后的晚到 refresh。
- 缓存 / 刷新 / webhook / realtime：不新增缓存、webhook、Realtime 或轮询。Privy metadata 通过现有 provider context 更新，平台通过显式 session refresh 收敛。

## 代码规则适用性

| 规则 | 适用 / 不适用 | 约束或决策 |
| ---- | ------------- | ---------- |
| 状态机 / 可信边界 / 副作用 | 适用 | 7 个显式 mutation 状态；客户端 guard 是 UX 防线，Privy 和 Edge Function 才是授权/写入边界 |
| 数据访问 / 性能 / 测试追踪 | 适用 | 客户端不直写表；一次确认最多一个 Privy 请求和一个 refresh；retry 只 refresh；验收场景映射到 workflow/component/provider tests 与设备 QA |
| 配置密钥 / 兼容回滚 | 适用 | 不新增 env；service key/JWT secret 只在 Edge Function；回滚客户端不会恢复已在 Privy 解绑的钱包 |
| RLS / service role | 适用 | `wallet-login` 使用服务端 admin client，合法绕过 RLS 必须以验证 Privy token和 investor lookup 为前置；移动端后续读取继续受短期 JWT 与 RLS 限制 |
| Schema / migration / index | 不适用 | 本功能不改 schema、policy 或索引；沿用 `investor_wallets` 唯一约束和现有查询路径 |
| 幂等与一致性 | 适用 | Privy unlink 不重试；平台 sync 使用重复 upsert/update 收敛；多步写不是单事务，失败后显式 Retry sync |
| 性能 | 适用但低风险 | linked wallet 数量小，服务端 O(n) 顺序 upsert；没有订阅、轮询或大列表，不增加前端持续负载 |

## 失败模式

| 失败情况 | 用户影响 | 处理方式 |
| -------- | -------- | -------- |
| target 不在当前 canonical identity | 无确认框、无写入 | 返回 `ineligible` 并回到 `idle` |
| 用户取消或 dismiss Alert | 钱包保持不变 | 返回 `cancelled`；不调用 Privy 或 `wallet-login` |
| 快速重复点击 | 可能重复不可逆请求 | in-flight ref 和 mutation state 合并为一次操作；自动化验证一次调用 |
| Privy unlink 拒绝、取消或超时 | 钱包仍关联 | 进入 `unlink_error`，不调用 refresh；新尝试必须重新确认 |
| Privy 成功，获取 token 或 `wallet-login` 失败 | 钱包已从 Privy 移除但平台待同步 | 保留旧 authenticated snapshot，进入 `sync_error`，只允许 Retry sync |
| session 持久化失败 | 平台可能已同步，但客户端仍持旧会话 | 进入 `sync_error`；再次 exchange 并持久化，不重复 unlink |
| refresh 在 logout/Viewer 变化后返回 | 旧操作可能覆盖新认证状态 | auth generation guard 返回 `session_refresh_superseded`，不写 session |
| Privy metadata 更新延迟 | 已解绑行可能短暂闪回 | `complete(address)` 在本次页面会话中抑制该地址 |
| `wallet-login` 多步写中途失败 | `investor_wallets` 与 investor mirror 可能暂时部分收敛 | 函数返回失败；重复 sync 的 upsert/update 修复；不在客户端补写数据库 |
| Privy 返回的钱包顺序变化 | 不影响按明确 address 执行的 Privy unlink；可能影响既有 `wallet-login` primary 策略 | 当前解绑 feature 不修改后端；实际 QA 对比 Viewer/account，通用 primary 策略另立后端任务 |
| 运行时未注入 unlink dependencies | 用户看不到解绑入口 | Wallet 自动降级为只读，避免半配置写路径 |
| Android 原生 Alert 未验证 | 跨平台发布证据不完整 | stop-for-human，Android 统一后续验证；离线 retry 的第二次真实解绑已由用户明确 waiver |

## 权限与安全

- 谁可以读：已登录用户通过现有 Viewer/Privy context 读取本人钱包信息；未登录树不接收 unlink dependencies。
- 谁可以写：用户在原生确认后通过当前 Privy session 请求 unlink；平台表写入只能由 `wallet-login` 的服务端 admin client 执行。
- 可信判断所在层：Privy 验证 token 和 unlink ownership；`wallet-login` 从 token 中的 Privy user id 查 investor，不信任客户端 user id/address；数据库约束防止同一钱包冲突绑定。
- RLS 边界：服务端 admin client 绕过 RLS 是既有受信路径，不把 service role/secret 暴露给客户端。返回短期 JWT 后，移动端后续数据访问仍由 RLS 做跨用户隔离。
- Secret / token：Privy access token 只在内存和 HTTPS request body 中使用；Supabase JWT 只进入 session adapter；不得记录 token、session、secret、完整 auth response 或原始 provider error body。
- 外部目标：workflow 使用 current identity 中的 canonical wallet，不接受 route、文本、clipboard 或伪造对象属性。
- 不可逆边界：Privy 成功后不执行补偿性 relink，也不重复 unlink；平台失败只能 retry sync。

## 安全 Review

| 检查 | 结论 | 证据 / 后续动作 |
| ---- | ---- | --------------- |
| Auth token 验证 | Pass | `wallet-login` 调用 Privy `/users/me`，不信任客户端 investor id |
| Session freshness | Pass with residual risk | refresh 获取新 Privy token 并签发短期 JWT；logout generation guard 阻止旧结果持久化 |
| 客户端 secret 泄漏 | Pass | mobile 只使用公开配置和运行时 token；service key/JWT secret 位于 Edge Function 环境 |
| 前端权限绕过 | Pass | 资格 guard 不替代 Privy/Edge Function；未登录树不注入写依赖 |
| 不可逆重复写 | Pass | in-flight lock、workflow 顺序和 retry-only-sync tests 覆盖 |
| 服务端日志最小化 | Concern, Non-blocking for this docs backfill | 现有 `wallet-login` 会记录完整 linked wallet 地址、investor/user 摘要及 Privy 错误响应；Task 8D 未新增这些日志，但生产硬化应改为事件类型、状态和缩略标识，禁止 email、完整地址列表和原始响应体 |
| Active wallet after unlink | Accepted for current scope | unlink target 按 canonical address 选择；iOS 已验证 active/account 不变，Android 后续做同样前后对比；任意 provider reorder 不作为本 feature 门禁 |

## 数据 Review

- 表与字段：只沿用 `investor_wallets(investor_id, wallet_address, wallet_type, chain_type, is_primary, status, last_seen_at)` 与 `investors(id, privy_user_id, wallet_address, email, status)`；无新字段或 migration。
- 写入路径：`wallet-login` 用 service-side client upsert 当前钱包，更新缺失钱包为 `removed`，再镜像 primary 到 investor；移动端 UI 和 service 不调用 `.from(...).insert/update/delete`。
- 权限：service role 绕过 RLS 只存在于 Edge Function。合法性来自 Privy token verification、按 `privy_user_id` 查 investor 和账号状态拦截；客户端不能指定其他 investor。
- 跨用户隔离：wallet unique conflict 返回 `23505` 时服务端跳过冲突钱包，避免把已属于其他 investor 的地址重新绑定；后续移动读取使用本人 JWT 与 RLS。
- 一致性：现有同步不是单数据库事务。重复 `wallet-login` 的 upsert/update 是恢复路径；若要求强原子性，应在未来后端重构中使用数据库函数/事务，而不是在移动端补偿。
- 索引与性能：本功能无 schema 变更。每个用户关联钱包数很小，查询按 investor id/status 和唯一键执行；当前范围不新增 EXPLAIN 或索引 migration。
- 数据保留：解绑使用 soft removal，不物理删除历史钱包 row；这保留审计关联并防止客户端直接销毁记录。

## 测试策略与覆盖

```text
Eligibility
  [unit] external + linked + non-active + another Privy wallet -> eligible
  [unit] embedded / active / final / unknown / forged target -> ineligible

Mutation sequence
  [unit] cancel -> no side effects
  [unit] unlink success -> refresh once
  [unit] Privy failure -> no refresh
  [unit] sync failure -> Retry sync, unlink still once
  [component] rapid presses -> one mutation
  [component] dependencies absent -> read-only

Auth/session
  [unit] refresh without login UI -> persist replacement session
  [unit] refresh failure -> preserve existing session
  [provider] logout supersedes late refresh

Release integration
  [device] iOS confirm/cancel/real unlink -> passed
  [device] Android confirm/cancel -> pending
  [device] offline sync_error/reconnect/retry -> explicitly waived; automated evidence retained
  [device] active Viewer/account comparison before and after unlink -> iOS passed, Android pending
```

- 现有 84 个 test files、437 个 tests 和 TypeScript 已在合并后通过；本文件不把历史结果冒充本轮新执行证据。
- canonical 实现计划必须将需求的每个验收场景映射到现有测试或设备 QA；不要求修改既有后端 primary 策略。
- 本轮只改文档，TDD 不适用于文档内容；任何后续生产代码修正继续执行 red -> green -> refactor。

## 性能与运行影响

- 用户每次确认最多触发一次 Privy unlink 和一次 `wallet-login`；Retry sync 不触发 Privy 写入。
- 页面 mutation state 是本地小对象，不进入全局缓存，不增加 Realtime、polling、AppState listener 或后台任务。
- `wallet-login` 对 linked wallets 顺序 upsert，复杂度与单用户钱包数量线性相关；该集合预期很小。
- 无大列表、N+1 页面查询、新 provider rerender 或 bundle dependency；现有 `@privy-io/expo` 和 auth context 已在 AppRoot 中存在。

## 兼容、发布与回滚

- 接口兼容：沿用顶层 `access_token`、`expires_in`、`user_status` 和 `user`；客户端仍兼容旧 `session` response shape。既有 Supabase adapter 的瞬时 refresh-token 占位不会进入 `AuthExchangeSession` 或 SecureStore，也不被当作可刷新凭据。
- 配置：不新增 env var。Privy App ID、Supabase URL 和 publishable/anon key 保持公开配置；service key、Privy secret 和 JWT secret 只在服务端。
- 发布 stop-for-human：Android native confirm/cancel 与 Viewer/account 前后对比必须进入 release evidence。真实离线 Retry sync 的设备证据已明确 waiver，只能作为残余风险记录。
- 客户端回滚：移除 unlink action 和 non-interactive refresh 入口。已经从 Privy 解绑的钱包不会因代码回滚恢复；后续成功 `wallet-login` 会继续平台收敛。
- 后端回滚：Task 8D 不部署 backend/schema，因此无 migration rollback；未来若修正 primary 保持或日志最小化，应单独验证并部署。

## What Already Exists

- Wallet read model、受保护 route、余额与 receive UI 已由 Task 8A-8C 提供，方案复用而不重建。
- Privy login、`wallet-login` exchange、session adapter 与 AuthProvider 已存在，方案只复用非交互 refresh 入口。
- 已部署 `wallet-login` 已实现 Privy verification、wallet reconciliation、JWT signing 和 Viewer response。
- `walletUnlinkWorkflow`、runtime adapter、Screen 状态与测试已在历史 Task 8D 实现；canonical 文档用于追踪和发现残余差距。

## NOT in Scope

- `sync-wallets` / `wallet-select` 后端重构：需要独立兼容与部署方案。
- WalletConnect、SIWE、外部钱包新增连接：不是解绑所需依赖。
- 活跃钱包切换：属于 Task 8E，不通过 unlink 间接实现。
- 转账、提现、购买、签名与合约交互：与身份关联解绑无关。
- 数据库 schema、RLS policy、索引与事务重构：当前复用已部署路径。
- 自动 relink 或补偿事务：Privy unlink 成功后不做隐式反向写入。
- auth-client `/auth/v1/user` 背景超时：另立诊断任务。

## 备选方案

| 方案 | 决策 | 原因 |
| ---- | ---- | ---- |
| 沿用 `wallet-login` 做解绑后收敛 | **Accepted** | 最小兼容变更，复用已部署身份验证、钱包同步和 JWT 契约 |
| 仅在 canonical 文档链接旧 Superpowers 设计 | **Rejected** | AI Delivery 无法检查开放问题、分层边界、风险 Review 和一致性 |
| 新建 `sync-wallets` 与 `wallet-select` | **Deferred** | 后端重构尚未实现，超出 Task 8D 范围且需要独立部署 |
| 移动端直接更新 Supabase 钱包表 | **Rejected** | 会绕过 Privy verification、service boundary 和跨用户隔离 |
| Privy 成功后只本地隐藏钱包，不 refresh | **Rejected** | 平台 row、JWT Viewer 和移动显示会长期不一致 |
| 同步失败时重新调用 Privy unlink | **Rejected** | 重复不可逆外部写入，不安全也没有恢复价值 |

## 评审决策记录

| 日期 | 决策 | 原因 | 影响 |
| ---- | ---- | ---- | ---- |
| 2026-07-17 | 采用外部非活跃钱包受控解绑 | 用户批准 Task 8D scope 与原生确认方案 | 只开放 eligible row，保持 Wallet 其他功能只读 |
| 2026-07-17 | 沿用 `wallet-login` 并接受替换 JWT | 当前后端登录与钱包同步职责杂糅，用户确认先沿用 | 同一账户 refresh，不实现新 sync/select 函数 |
| 2026-07-18 | 真实 iOS 解绑通过 | Privy、`wallet-login` 和后续 session 请求均成功 | 保留 Android、offline 与通用 active invariant 发布门禁 |
| 2026-07-18 | canonical 设计按现有实现回填 | 修复 AI Delivery 文档顺序遗漏，不重写已批准业务 | 后续 implementation plan 用追踪矩阵映射现有代码和残余差距 |
| 2026-07-19 | 不修改 ArtStarFront | Privy unlink 按明确 address 执行，与 linked account 数组顺序无关；用户确认当前无需后端加固 | primary 选择和日志最小化移出本 feature，另作后端技术债 |
| 2026-07-19 | 不重复真实离线解绑 | 正常 iOS 真实解绑已通过，自动化覆盖 retry-only-sync；再次测试需要新的钱包和第二次不可逆写入 | Task 3 以显式 waiver 关闭，保留未做设备验证的残余风险；Android 仍待后续统一验证 |

## 工程 Review 结论

- Scope Challenge：复用现有 Wallet/Auth/Edge Function，没有新增基础设施、schema 或 provider。文件数量较多来自明确的 UI/workflow/adapter/Auth 分层，不再增加抽象。
- Architecture Review：边界清晰；unlink 目标选择不依赖 Privy 顺序，既有 backend primary 策略不纳入本 feature。
- Code Quality Review：workflow 纯逻辑、adapter 薄、Screen 只持状态；没有在 canonical 回填中要求结构性重写。
- Test Review：资格、目标选择、重复点击、失败、retry、session generation 已有自动化；离线设备 QA 经明确 waiver 后只剩 Android 缺口。
- Performance Review：一次显式操作、无订阅/轮询，数据库集合小；没有新增性能阻塞项。
- 安全 Review：客户端可信边界符合需求；现有 backend 详细日志需要独立最小化。
- 数据 Review：service-side 写入和 retry convergence 可接受；非事务多步写与 primary 选择策略已记录为独立后端技术债。
- 并行化：本次只回填一个设计文件，顺序执行，无并行开发价值。

## Consistency Check

- [x] 需求开放问题已在 Open Questions Resolution 中闭环。
- [x] 方案修正需求假设时，已在 Decision Notes 中记录原因和影响。
- [x] 权限、可信边界、数据读写路径与风险标签一致。
- [x] 方案没有引入范围外功能。

## 方案评审清单

- [x] 业务规则放在正确层，前端不是敏感决策可信来源。
- [x] 数据流有唯一可信来源，权限检查明确。
- [x] 失败模式、错误反馈、重试 / 降级或 stop-for-human 已说明。
- [x] 入口层、领域逻辑和副作用边界明确。
- [x] 核心逻辑可独立测试，每个验收场景有测试或手动 QA 方式。
