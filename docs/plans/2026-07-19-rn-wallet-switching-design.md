# 方案设计：移动端钱包绑定与活跃钱包切换

日期：2026-07-20
Feature slug：`rn-wallet-switching`
状态：待用户复核

## 背景

当前移动端以 `AuthViewer.walletAddress` 展示平台 active wallet，并只读展示 Privy linked wallets。Web 端的 `useActiveWallet` 可以改变浏览器连接器当前选择，但现有 `wallet-login` 按 Privy `linked_accounts` 第一项推导 primary，因此 Web 显示地址与平台 JWT / `investor_wallets.is_primary` / `investors.wallet_address` 可能不一致。

Task 8E 要在移动端增加 external wallet 绑定和平台 active wallet 切换，同时关闭上述身份一致性缺口。当前 `@privy-io/expo@0.69.4` 提供 `useLinkWithSiwe`，但没有 Web 的 `useActiveWallet/setActiveWallet`；设计不能依赖不存在的 SDK 状态。

## 推荐方案

采用“外部连接器 + Privy SIWE 归属 + 独立 `wallet-select` + 数据库原子 RPC + Viewer-only 持久化”的受控流程：

1. 使用 Reown AppKit 的 WalletConnect-compatible React Native 连接器选择 external wallet，并把连接结果适配为 Privy `ExternalWallet` metadata。
2. 绑定新钱包时，通过 Privy `useLinkWithSiwe` 生成消息、由连接钱包签名并提交 link；绑定成功后立即继续平台选择，不再要求用户点击 `Use`。
3. 切换已有 external wallet 时，若本机未连接则先连接并核对实际地址；embedded wallet 不需要外部连接。用户原生确认后再调用平台。
4. 新增 `wallet-select` Edge Function。它验证 Privy token、investor 状态、目标 linked-wallet 归属、明确目标地址和 expected previous，再调用 service-role-only 数据库 RPC。
5. RPC 在单个短事务中完成 operation id 幂等判断、目标 upsert、旧 primary 关闭、新 primary 开启和 `investors.wallet_address` 镜像更新。
6. Edge Function 根据数据库最终地址返回 operation result 与 authoritative `AuthViewer`，不签发 JWT。移动端校验同一 investor 与目标地址，原样保留现有 token / expiry，只持久化 Viewer 后再显示完整成功。

该方案保持现有 `wallet-login` 行为不变。`wallet-select` 是 active 选择的唯一新平台写入口，也可在以后供 Web 接入；本 Task 不修改 Web 调用链。

## Open Questions Resolution

| 需求中的开放问题 | 处理结论 | 是否阻塞开发 |
| ---------------- | -------- | ------------ |
| 已确认：绑定新钱包后立即 active，与当前 Web 端用户可见行为保持一致；旧的“绑定后只加入列表、不自动 active”方案已废弃，不得出现在后续设计或计划中。 | Resolved：SIWE link 成功后工作流自动进入 `wallet-select` 与 Viewer 持久化；只有端到端完成才显示成功。 | No |
| 已确认：现有 Web UI 的 `useActiveWallet` 显示浏览器连接器选择的新地址，但重新调用现有 `wallet-login` 可能仍返回旧平台钱包地址。这是本功能必须解决的一致性缺口，不能以 UI 显示正确作为平台已收敛的证据。 | Resolved：移动端以 `wallet-select` RPC 结果和新 Viewer 为成功依据；连接器显示不作为平台收敛证据。Web 接入该 endpoint 延后。 | No |
| 已确认：本功能不修改现有 `wallet-login`，新增最小 `wallet-select` 路径承载 active 选择、数据库原子更新与 authoritative Viewer 返回。 | Resolved：新增独立 Edge Function、workflow 模块和 RPC；`wallet-select` 不签发或轮换 JWT，不修改 `wallet-login/index.ts`。 | No |
| 高风险：Privy 与 Supabase 数据库无法共享事务。新钱包调用顺序固定为外部连接、Privy SIWE link、平台写和会话持久化；平台失败时保留 linked wallet 供重试，结果不确定时锁定钱包动作并进入人工可见恢复状态。 | Resolved：采用 forward recovery；相同 operation id 幂等重试，明确冲突才允许用户清理 link，未知结果先恢复查询。 | No |
| 高风险：必须避免“Privy SIWE 绑定失败但 `investor_wallets.is_primary` 成功”。客户端不得在绑定失败、连接取消或地址不匹配后调用平台；服务端仍必须验证 target 位于当前 Privy linked wallets 中并使用 expected previous / operation id 防止越权与陈旧覆盖。 | Resolved：工作流顺序门禁 + 服务端二次验证 + RPC expected previous / operation id 幂等检查共同保证。 | No |
| 高风险：数据库必须通过单个原子函数同时更新 `investor_wallets.is_primary` 和 `investors.wallet_address`。方案阶段需确认函数签名、唯一约束、锁顺序、幂等记录和 RLS / service-role 边界。 | Resolved：RPC 固定先锁 investor，再查 operation，再按地址顺序锁相关 wallet；单事务更新并写 operation；仅 `service_role` 可执行。 | No |
| 高风险：跨账户钱包唯一性冲突不能迁移 KYC 或权益，也不能自动解绑 provider。平台拒绝后只允许明确用户清理本次 Privy link。 | Resolved：现有 active-address 唯一索引拒绝冲突；Edge Function 返回稳定 conflict code；客户端保留原账户并显示显式 `Remove link`。 | No |
| 已确认：同一 investor 切换 active wallet 不需要新 JWT。 | Resolved：现有 JWT 只包含 investor identity，不包含 active wallet；`wallet-select` 只返回 authoritative Viewer，客户端保留 token / expiry 并只替换 Viewer。 | No |
| 非阻塞：绑定 provider 在“linked”与“active”之间可能存在 SDK 短暂延迟。实现需以 SDK 确认的明确目标地址驱动，不依赖 linked wallet 数组顺序。 | Resolved：移动端保留明确 connector target；Edge Function 按规范化地址查 Privy linked accounts，绝不读取数组第一项作为目标。 | No |
| 已解决：当前 `@privy-io/expo@0.69.4` 提供 `useLinkWithSiwe`，但不提供 Web `useActiveWallet/setActiveWallet`。移动端使用 WalletConnect-compatible 连接器取得明确地址并完成 SIWE link，平台 `wallet-select` 持久化 active；不能静默降级为“仅绑定”。 | Resolved：使用 Reown AppKit adapter + Privy SIWE；平台 primary 是持久化 active，连接器选择只是设备级输入。 | No |
| 发布前阻塞：iOS 必须覆盖新绑定即 active、已有钱包切换、平台失败恢复和会话刷新；Android 环境按用户决定统一后续验证，但在 Android 通过前不得声明跨平台发布就绪。 | Deferred：实现可先完成全部 Task；iOS 随 Task 验证，Android 作为统一后续发布门禁记录。 | No（编码）；Yes（跨平台发布） |
| 延后：完整 `sync-wallets` 后端重构、转账、签名、链切换、购买和自动冲突清理不属于本功能。 | Deferred：本设计只实现 `wallet-select`、绑定 / 切换编排和显式冲突 link 清理。 | No |

## Decision Notes

| 决策 | 原因 | 影响 |
| ---- | ---- | ---- |
| 平台 primary / Viewer 是持久化 active 的权威来源 | Expo SDK 无服务端持久化的 active-wallet API；Web `useActiveWallet` 是连接器状态 | UI 始终以 Viewer 标记 `Active`；connector 只决定 `Connect` / `Use` 可用性 |
| 新钱包绑定即自动平台选择 | 与用户确认的 Web 交互口径一致 | SIWE link 后不返回 idle，直接调用 `wallet-select`；完整成功前锁定钱包动作 |
| 成功状态只锁定到 authoritative Viewer 收敛 | `wallet-select` 成功后的 `complete` 是一次操作的终态，不是后续钱包操作的永久锁 | Viewer active address 与完成目标一致后将 selection workflow 重置为 `idle`；随后允许下一次 `Use`、解绑或绑定，未收敛前继续阻止并发 mutation |
| 使用 Reown AppKit adapter，不把 Reown 状态扩散到领域层 | 当前项目没有 external wallet connector，Reown 2.x 支持当前 RN / React / Viem 范围 | provider、deep link 和包依赖集中在 adapter / provider boundary；workflow 只接收接口 |
| WalletConnect proposal 只包含当前应用配置链 | Android 测试发现同时提供链 56 与 97 时，Rabby 可只批准 56，导致测试环境生成错误的 SIWE `Chain ID: 56` | 测试环境的 AppKit `defaultNetwork` 和 `networks` 均只使用链 97；生产环境均只使用链 56；不接受跨环境链降级 |
| 钱包自身的 WalletConnect 支持链必须覆盖当前配置链 | Rabby Mobile 0.6.81 的 `getWalletConnectSupportedChains()` 只返回 `getChainList('mainnet')`；手动添加 BNB Testnet 不会让 WalletConnect 批准 `eip155:97`，而是返回 `No supported WalletConnect namespace to approve.` | Chain 97 人工验收使用支持该 namespace 的 MetaMask；Rabby 只在 Chain 56 环境验收。客户端不得为了兼容钱包而在测试环境加入或降级到 56 |
| WalletConnect 协议实现遵循 AppKit 2.0.6 官方依赖契约，失效 session 由 lifecycle cleanup 恢复 | `@reown/appkit-react-native@2.0.6` 精确依赖 `@walletconnect/universal-provider@2.21.10`；`@walletconnect/react-native-compat@2.23.10` 是独立的 RN shim / native compat，版本不同不等同于协议栈混用 | Universal Provider 及其 SignClient / Core 传递依赖遵循 AppKit 官方锁定树，不用 override 强升到未经该版本 AppKit 支持的 2.23.10；RN compat 2.23.10 独立保留；正常断开失败后仍强制完成 AppKit 本地连接清理，失效签名返回稳定错误并允许 fresh connect |
| `wallet-select` 独立于 `wallet-login` | 现有登录函数按数组首项选 primary，且用户要求暂不改其逻辑 | 新函数必须自行验证 Privy、调用原子 RPC并返回 authoritative Viewer；不复用错误的 primary 选择，也不承担 session renewal |
| 钱包选择不轮换 JWT | JWT 只包含 investor identity，active wallet 是数据库业务状态 | Edge Function 不依赖 `SUPA_JWT_SECRET`；移动端保留原 token / expiry，只持久化经过账户和目标校验的 Viewer |
| Dashboard 持仓保持账户级 | `mint_events` 已有 `investor_id`，`investor_wallets` 已有本人只读 RLS；active wallet 只代表当前操作身份 | 交易按 investor 读取；链上余额按全部 active Ethereum wallets 批量读取并按资产求和；Wallet 页面保留单钱包语义 |
| 数据库使用 operation ledger + 原子 RPC | 需要处理响应丢失、重复提交、唯一冲突和跨表镜像 | 新增只允许 service role 访问的 operation 表与函数；重试同一 operation id 返回同一最终地址 |
| 移除 authenticated 对 `investors` 的直接 UPDATE | 现有 self-update policy 只校验本人行，无法阻止客户端直接改 `wallet_address` | migration revoke 表级 UPDATE 并 drop 宽泛 policy；昵称仍走既有 `update_my_nickname` RPC |
| 平台失败采用 forward recovery，不回滚不存在的 Privy active | Expo SDK 没有 `setActiveWallet`；已完成的 SIWE link 可安全保留 | UI 将目标显示为 linked，提供 `Retry` / `Use`；只有确定的跨账户冲突提供显式 unlink 清理 |
| 暂不修改 Web Wallet | 8E 是移动端交付，Web 改动会扩大 UI / auth 回归面 | endpoint 设计为可复用；Web 现存一致性债务需单独接入 `wallet-select` 才能关闭 |

## 分层边界

- UI：`WalletIdentitySection` 只渲染 `Active`、`Use`、`Connect`、`Retry`、`Remove link` 和非敏感状态文案；`WalletScreen` 绑定 screen-local mutation state，但不包含 SIWE、HTTP 或数据库规则。
- Workflow / service：`walletSelectionWorkflow` 是确定性状态机与顺序编排；`walletConnectionAdapter`、`privyWalletLinkAdapter`、`walletSelectClient`、session persistence 和 native confirm 通过接口注入。
- Data / external provider：Reown 负责外部钱包连接与签名，Privy 负责 linked-wallet 归属，`wallet-select` 负责授权与平台选择，Postgres RPC 负责原子持久化。

## 代码结构边界

- 移动端入口层：`AppRoot.tsx` 只从 hooks 获取能力、构造 adapter 并注入；不得加入分支状态机或 HTTP payload 组装。
- 移动端领域层：`src/features/wallet/workflow/walletSelectionWorkflow.ts` 定义 operation、状态转换、eligibility 和恢复策略；`domain/walletIdentity.ts` 继续负责 read model。
- 移动端 provider 边界：新增 WalletConnect / Reown provider boundary，放在 Privy 与 Safe Area provider 附近；所有 package-specific 类型封装在 adapter 内。
- 移动端服务边界：`walletSelectClient.ts` 只负责请求 / 响应解析；`createWalletSelectionDependencies.ts` 只适配 hooks、Alert、Viewer-only 持久化和 public config。
- Edge Function 入口：`wallet-select/index.ts` 只处理 CORS、HTTP input、调用 service 并映射稳定错误码。
- Edge Function 领域 / service：请求解析、linked-target 选择、investor 状态检查、RPC 调用和 Viewer 响应分别为小函数；不在入口堆叠大型 `if/else`。
- 数据库边界：新 migration 创建 operation ledger 和单个 RPC。客户端没有表写权限，Edge Function 不执行多条分散 `.update()` 来模拟事务。
- 新增行为注册方式：通过依赖对象扩展 `AppNavigator` / `WalletScreen` 的 wallet mutation capabilities；不用全局 singleton 或隐式 module state。
- 避免的结构漂移：不把 wallet-select 合并进余额 service，不扩大 `walletUnlinkWorkflow` 职责，不让 `WalletIdentitySection` 读取 Privy / Reown / Supabase，不修改 `wallet-login`。

## 模块内聚与可测试性

- `walletSelectionMachine`：纯 reducer；输入 event 输出下一状态，不访问网络、时间或 React。
- `walletSelectionWorkflow`：按状态调用注入依赖；operation id 由注入 factory 生成；可用 fake connector / Privy / platform / Viewer persistence adapter 测试每个失败点。
- `walletConnectionAdapter`：连接、取 checksum address、签名和 provider label；Reown / Wagmi 类型只存在于该模块及 provider boundary。
- `privyWalletLinkAdapter`：封装 `generateSiweMessage` / `linkWithSiwe`，并校验返回 user 的 linked accounts 包含 target。
- `walletSelectClient`：解析稳定 Viewer-only response / error union，不向 UI泄漏 Privy token 或服务端原始 body。
- `wallet-select` server domain：规范化地址、查找明确 linked target、错误分类为纯函数；HTTP、Privy fetch 和 Supabase RPC 通过依赖隔离。
- 数据库 RPC：用 migration SQL 和本地 Supabase / transaction integration 验证唯一性、锁顺序、回滚和幂等。
- 副作用边界：连接 / 签名仅在 adapter；Privy link 仅在 Privy adapter；平台请求仅在 client；Viewer-only session record 修改仅在 Auth workflow / provider action；数据库写仅在 RPC。
- 隐式依赖：时间、UUID、fetch、environment、native Alert 和 connector modal 必须显式注入或集中读取；测试不得依赖真实网络和 live token。

## 数据流

### Dashboard 账户级持仓

1. 客户端使用现有应用 session；JWT `sub` 继续标识同一 investor，不因 active wallet 切换而变化。
2. `DashboardMintEventsRepository` 按 `mint_events.investor_id = viewer.id` 读取本人购买事件；RLS 继续以 `auth.uid()` 限制跨账户读取。
3. `DashboardInvestorWalletsRepository` 从 `investor_wallets` 读取同一 investor 下 `status='active' AND chain_type='ethereum'` 的钱包地址，规范化、校验并去重。
4. 候选资产来自该 investor 的购买事件；chain adapter 按资产 chain id 分组，对每个资产和每个有效钱包执行 `balanceOf`，每个资产价格只读取一次，并将所有钱包余额求和。
5. `buildDashboardHoldings` 使用账户级事件成本和聚合后的实时余额计算 Portfolio、PnL、Holdings 和 Transactions。切换 active wallet 只触发普通刷新，不改变查询归属。
6. 某钱包或链 RPC 失败时对应资产进入部分不可用 warning，不把失败余额当作零；数据库账户事件或钱包集合读取失败时整个 Portfolio 标记 unavailable。

该读取路径不新增写入、RPC 或 service-role 能力，不信任客户端地址决定归属，也不迁移链上 Token。解绑后 `status!='active'` 的钱包退出账户聚合；Wallet 页面仍使用当前单钱包地址读取余额。

### 新 external wallet 绑定并立即 active

1. 用户点击 `Bind wallet`；single-flight 锁阻止并发 wallet mutation。
2. Reown modal 只请求当前应用配置链并返回 checksum address、CAIP-2 chain id、wallet metadata 和签名能力；测试环境必须返回链 97，生产环境必须返回链 56，后续 SIWE 使用同一 chain id。
3. workflow 使用配置的 HTTPS public origin 生成 Privy SIWE message，并请求钱包原生签名。
4. `linkWithSiwe` 成功后，校验返回 linked accounts 包含同一 target；失败或不匹配时停止，绝不调用平台。
5. 生成 operation id，记录 `expectedPreviousAddress = viewer.walletAddress`，调用 `wallet-select`。
6. Edge Function 验证 Privy token并重新读取 current user；按 target 地址匹配 Ethereum linked account，从 `privy_user_id` 推导 investor。
7. Edge Function 调用 RPC。RPC 锁 investor，检查 operation / previous，upsert target，切 primary，更新 mirror，写 completed operation 后提交。
8. Edge Function按 RPC 最终地址返回 operation id、幂等标记与 authoritative Viewer，不返回 token 或 expiry。
9. 移动端校验 Viewer id 等于当前 investor、Viewer address 等于明确目标；随后在 secure storage 中保留现有 access token、refresh token 与 expiry，只替换 Viewer。AuthProvider 更新内存 Viewer，地址一致后显示 `Active`，并将 selection workflow 从 `complete` 重置为 `idle`，恢复后续 `Use`、解绑与绑定操作。

### 已有钱包切换

1. Embedded target：点击 `Use`，原生确认后直接进入步骤 5。
2. 已连接 external target：点击 `Use`，核对 connector address 后原生确认，再进入步骤 5。
3. 未连接 external target：点击 `Connect`，连接器返回地址；只有匹配 target 才显示原生确认并进入步骤 5。
4. 后续平台选择与 Viewer-only 持久化同绑定路径一致，不调用 Privy SIWE link。

### 平台响应未知或 Viewer 持久化失败

1. 保留 operation id、target、expected previous 和阶段，不复制或改写 token / JWT。
2. 对相同 operation id 重调 `wallet-select`。RPC 若已有 completed operation，返回其最终地址；若未提交，则执行一次事务。
3. 服务端返回同一 authoritative Viewer；客户端只重复 Viewer 持久化，不重复连接、签名或 SIWE link，也不延长现有会话。
4. 仍无法对账时保持 `consistency_error`，禁用所有钱包相关写操作并 stop-for-human。

## 数据库事务设计

新增 `wallet_selection_operations`：

- `operation_id uuid primary key`
- `investor_id uuid not null references investors(id)`
- `expected_previous_address text`
- `target_wallet_address text not null`
- `selected_wallet_address text not null`
- `created_at timestamptz not null default now()`
- 唯一 / 查询索引：primary key 足够查幂等；另加 `(investor_id, created_at desc)` 供受控审计与清理。
- RLS enabled + forced；不给 `anon` / `authenticated` policy，不暴露客户端读写。

RPC `select_investor_wallet(...)`：

- 参数：investor id、operation id、expected previous、target address、server-derived wallet type。
- `SECURITY INVOKER`、`SET search_path = ''`；位于 exposed schema 以供 PostgREST RPC，但 revoke `PUBLIC/anon/authenticated`，只 grant `service_role`。
- 固定锁顺序：先 `investors` row `FOR UPDATE`，再按规范化地址顺序锁该 investor 的相关 wallet rows。
- 已有 operation 且 payload 相同：返回 stored result；payload 不同：抛 `operation_conflict`。
- current mirror / primary 不等于 expected previous：抛 `stale_previous_wallet`；若同 operation 已完成则走幂等返回。
- target upsert 使用 `(investor_id, wallet_address)` conflict key；其他 investor 的 active-address partial unique index继续阻止跨账户占用。
- 同一事务将旧 primary 设 false、目标设 active / primary、更新 mirror、写 operation。任一步失败自动回滚。
- 函数不做 HTTP、JWT、Privy 或日志网络调用，保持短事务。

不新增客户端对 `investors`、`investor_wallets` 或 operation table 的写策略。现有 self-read RLS 保持不变。

同一 migration 还必须执行 `REVOKE UPDATE ON public.investors FROM authenticated` 并移除 `investors: self update` policy。现有前端昵称编辑写入 `user_profiles` 的 `update_my_nickname` RPC，不依赖 `investors` UPDATE；`wallet-login`、`wallet-select` 和后台受控服务继续使用 service role。实施前用源码扫描和双用户 RLS 测试确认没有合法客户端依赖该宽泛 policy。

## 状态与实时行为

- 可信来源：Privy linked accounts 证明归属；connector 证明当前设备选择；RPC 结果证明数据库提交；`AuthViewer` 证明当前客户端平台身份。
- 状态模型：`idle -> connecting/linking/confirming -> platform_syncing -> viewer_persisting -> complete`；错误分为可重试 `connect_error` / `bind_error` / `sync_error` / `viewer_sync_pending` 与锁定态 `consistency_error`。
- mutation 锁：绑定、切换、解绑共享一个 Wallet identity mutation lock；余额刷新和复制 / 分享可以继续，但任何依赖钱包身份的写操作在非 idle / complete 时禁用。
- 缓存：不引入长期 wallet selection cache；operation recovery 只持久化非敏感 operation metadata，完成或登出后清除。
- realtime / webhook：不适用。成功后以响应和 session 更新驱动刷新；数据库不依赖 realtime。

## 代码规则适用性

| 规则 | 适用 / 不适用 | 约束或决策 |
| ---- | ------------- | ---------- |
| 状态机 / 可信边界 / 副作用 | 适用 | 纯状态机；Privy / Edge Function / RPC 各自验证；外部与平台写严格串行 |
| 数据访问 / 性能 / 测试追踪 | 适用 | 单 RPC 短事务；使用现有唯一索引；每个需求验收场景映射 unit / integration / QA |
| 配置密钥 / 兼容回滚 | 适用 | Reown project id 和 endpoint path 为 public config；service role 仅 Edge Function；`wallet-select` 不读取 JWT secret；客户端功能可 feature-disable，数据库 migration 向后兼容旧读路径 |

## 失败模式

| 失败情况 | 用户影响 | 处理方式 |
| -------- | -------- | -------- |
| Reown 未配置或 connector unavailable | 无法绑定 / 连接 external wallet | Wallet 仍可只读；隐藏可达写入口并显示非敏感 unavailable 状态 |
| 钱包未批准当前应用配置链 | WalletConnect 无法提供可信的当前链 account，不能继续 SIWE | proposal 只请求当前配置链；钱包不支持时显示连接失败并停止，不降级到其他环境的链 |
| WalletConnect session topic 已失效 | 钱包返回后无法完成 SIWE，旧 connector snapshot 可能仍存在 | 将 session-expired 映射为绑定失败；不调用 Privy link / `wallet-select`；先尝试通知远端断开，再强制完成本地 AppKit cleanup，下一次操作创建 fresh connection |
| 连接取消、网络失败或地址不匹配 | active 不变 | 不调用 Privy link / `wallet-select`；返回 idle 或 connect_error |
| SIWE 生成、签名或 Privy link 失败 | 新钱包未绑定或结果不可信 | 不调用平台；保留旧 Viewer，可重新开始 |
| Privy link 成功但返回 metadata 暂未包含 target | 不能证明归属 | 不调用平台；刷新 Privy user / token 后允许 retry，超时进入 bind_error |
| target 已属于另一 investor | 当前账户不能采用该地址 | RPC 全部回滚；返回 `wallet_owned_by_another_investor`；显示显式 link cleanup |
| expected previous 已过期 | 防止旧客户端覆盖新选择 | 返回 `stale_previous_wallet`；重新加载 Viewer，用户重新确认 |
| HTTP 超时 / response 丢失 | 不知道事务是否提交 | 相同 operation id 幂等重试；未对账前锁定 mutation |
| RPC 任一更新失败 | primary / mirror 不得半成功 | Postgres 事务整体回滚；返回稳定 server error，无前端猜测 |
| authenticated 尝试直接更新 investor mirror | 可能绕过受控选择 | 数据库权限拒绝；RLS / grant integration test 必须证明 `wallet_address` 不可直接写 |
| Viewer 持久化失败 | 平台可能已切换，本机 Viewer 仍旧 | `viewer_sync_pending`；重调同 operation 获取 authoritative Viewer，只重试 Viewer 写入，原 token / expiry 保持不变 |
| 用户登出 / Viewer generation 改变 | 旧异步结果可能污染新会话 | generation guard 丢弃结果；清除 operation 恢复状态，下一登录重新对账 |
| 冲突 link 清理失败 | Privy 仍显示 linked 钱包 | 保持平台旧 active；显示 retry cleanup，不调用 `wallet-login` 或平台选择 |

## 权限与安全

- 谁可以读：应用 session 只读本人 Viewer / investor wallets；Privy SDK 只读当前 Privy user；operation ledger 不向客户端开放。
- 谁可以写：外部钱包所有者通过原生钱包完成 SIWE；平台只有 `wallet-select` 的 service-role client 可调用 RPC；客户端无 direct table write。
- 可信判断所在层：target 地址在客户端用于 UX，Edge Function 必须从 verified Privy response 再确认；investor id 只从 `privy_user_id` 推导；数据库唯一性和原子性由约束 / RPC 保证。
- KYC / 权益：RPC 只更新 wallet tables 和 investor wallet mirror，不更新 investor id、KYC、points、referrals、commissions 或 holdings。
- Secret / token：Privy token 只在请求内存中存在；现有应用 JWT 只保留在既有 secure session，`wallet-select` 不读取、签发、返回或记录 JWT。日志只允许 operation id、稳定错误码和脱敏地址；禁止输出 request body、Privy response 或 Authorization header。
- CORS / method：Edge Function仅接受 `POST` 与 `OPTIONS`，限制 JSON body 大小和字段类型，返回稳定 error code，不回传 provider 原始错误。
- RLS：新表启用并 force RLS；无客户端 policy；RPC revoke public roles 并只 grant service role。service-role key 只存在服务端 secret，不使用 `EXPO_PUBLIC_` 前缀。
- 既有权限收紧：撤销 authenticated 对 `investors` 的表级 UPDATE 并删除宽泛 self-update policy，避免 RLS 只做行归属却允许敏感列修改。

## 备选方案

| 方案 | 决策 | 原因 |
| ---- | ---- | ---- |
| 继续调用 `wallet-login` 并依赖 linked_accounts 第一项 | Rejected | 目标不明确，已验证会返回旧地址，无法保证平台一致性 |
| 修改 `wallet-login` 同时承担登录、绑定同步和选择 | Rejected | 增加登录回归面，继续杂糅职责，也违背当前沿用既有逻辑的决定 |
| 只在移动端保存 selected wallet | Rejected | 其他设备、JWT、RLS 和后台仍是旧地址，安全边界错误 |
| 绑定后仅加入列表，要求再次点击 `Use` | Rejected | 与用户确认的 Web 交互口径不一致，并增加半完成状态 |
| Privy SIWE + `wallet-select` + 原子 RPC | Accepted | 明确目标、最小后端新增、可幂等恢复，并保持账户 / KYC / 权益隔离 |
| `wallet-select` 每次重新签发同账户 JWT | Rejected | JWT 不含 active wallet，轮换不能增强一致性，反而耦合业务写入与 auth renewal并意外延长登录生命周期 |
| Dashboard 只显示 active wallet | Rejected | 会把同一 investor 旧钱包中的真实资产显示为消失，与账户权益隔离验收冲突 |
| 只按 `mint_events.investor_id` 展示累计购买份额 | Rejected | 无法反映转出、销毁或其他链上余额变化；交易归属必须与全部 active Ethereum wallets 的实时 `balanceOf` 结合 |
| 新增 Edge Function 聚合全部持仓 | Deferred | 当前 RLS 已允许本人读取 `mint_events` / `investor_wallets`，客户端可用现有 multicall 完成只读聚合；规模或 RPC 性能成为瓶颈时再提升为服务端 read model |

## 评审决策记录

| 日期 | 决策 | 原因 | 影响 |
| ---- | ---- | ---- | ---- |
| 2026-07-19 | 绑定新钱包后立即成为 active | 与现有 Web 用户体验一致 | SIWE link 后自动进入平台选择，不追加第二次确认 |
| 2026-07-19 | 保持 `wallet-login` 不变，新增 `wallet-select` | 登录函数职责已杂糅且按数组顺序选 primary | 新 endpoint / RPC 独立测试和发布 |
| 2026-07-19 | primary 与 investor mirror 必须原子更新 | 禁止 Privy / DB 或 DB 两个镜像半成功 | 所有平台写落到单 RPC |
| 2026-07-20 | Expo 不模拟 Web `setActiveWallet` | 已安装 SDK 类型确认 API 不存在，且 Web active 属于连接器状态 | 需求技术表述修正为 connector target + Privy linked + platform primary |
| 2026-07-20 | 平台失败保留 linked wallet并 forward retry | 没有可回滚的 Privy active，自动 unlink 又是破坏性写入 | 使用 operation id 恢复；跨账户冲突由用户明确清理 |
| 2026-07-22 | `wallet-select` 改为 Viewer-only 响应 | 同一 investor 的 identity-only JWT 无需因 active wallet 变化而轮换 | 移除 Edge JWT signer；客户端保留 token / expiry，只持久化 authoritative Viewer；auth refresh 独立处理 |
| 2026-07-22 | WalletConnect 与 SIWE 必须使用当前应用配置链 | Android Rabby 在 `[56, 97]` proposal 中只批准 56，实际 SIWE 显示错误的 `Chain ID: 56` | AppKit `defaultNetwork` 和 `networks` 均按环境收窄为单一链；测试 97、生产 56，不允许跨环境降级 |
| 2026-07-23 | 协议实现跟随 AppKit 2.0.6 官方锁定的 Universal Provider 2.21.10，失效 session 在 provider boundary 恢复 | AppKit 精确依赖 Universal Provider 2.21.10；RN compat 2.23.10 只提供 RN shim / native compat，不能作为升级 Universal Provider / SignClient / Core 的依据 | RN compat 2.23.10 独立保留，不用 override 强制未经支持的 provider 版本；stale-session 恢复依赖远端 disconnect 加本地强制 cleanup、single-flight 和 timeout；等待 Android MetaMask 人工验收 |
| 2026-07-23 | Rabby Mobile 0.6.81 不作为 Chain 97 WalletConnect 验收钱包 | 同版本公开源码的 `getWalletConnectSupportedChains()` 仅枚举 mainnet；实机对 `eip155:97` proposal 返回 `No supported WalletConnect namespace to approve.` | 测试环境保持 97 单链并用 MetaMask验收；Rabby移到 Chain 56 环境验收，不增加双链 proposal，不把钱包限制误判为 Reown timeout或 SIWE问题 |

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
