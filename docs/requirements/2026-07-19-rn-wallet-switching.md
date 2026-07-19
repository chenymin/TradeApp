# 需求说明：移动端钱包绑定与活跃钱包切换

日期：2026-07-19
Feature slug：`rn-wallet-switching`
状态：已澄清，待用户复核

## 业务目标

允许已登录投资者在移动端 Wallet 页面绑定新的外部 Ethereum 钱包，或在同一 Privy / 平台账户已绑定的钱包之间切换活跃钱包；新钱包绑定成功后必须立即成为 active，与当前 Web 端业务行为一致。Privy active wallet、平台主钱包、`investors.wallet_address`、新签发的 `AuthViewer.walletAddress` 和客户端持久化会话必须最终收敛到同一地址，任何中间失败都不得被展示为完整成功。

## 用户角色

- 已登录投资者：可以查看本人 Privy 已关联的钱包、绑定新的外部 Ethereum 钱包，并把本人已有钱包切为 active。
- 使用未在当前设备连接的已绑定 external wallet 的投资者：必须先通过钱包提供方连接并验证实际返回地址，匹配目标后才能切换。
- 未登录用户：无法进入受保护 Wallet 页面，也不能调用绑定、切换或平台钱包写接口。
- Privy：验证当前身份、维护 linked wallet 与设备连接状态，并执行钱包绑定和 active wallet 切换。
- `wallet-select` Edge Function：验证 Privy token 和目标钱包归属，以当前验证身份推导 investor，调用数据库原子操作更新平台主钱包，并返回同一账户的新短期 JWT 与 `AuthViewer`。
- 数据库：通过唯一约束、原子函数和 RLS / 服务端权限保证一个 investor 只有一个 primary wallet，且一个钱包不能归属多个 investor。

## 风险标签

- [x] auth / 登录
- [x] permission / 权限
- [ ] payment / 支付
- [x] kyc / 身份认证
- [ ] webhook / 外部回调
- [ ] realtime / 实时同步
- [x] database / 数据写入
- [x] rls / Supabase 权限
- [ ] frontend-performance / 前端性能
- [ ] contract / 合约交互
- [x] external-provider / 外部钱包提供方
- [x] controlled-write / 受控写操作
- [x] distributed-consistency / 分布式一致性

## 范围内

- 在 Wallet 页面展示当前 active wallet 和同一 Privy 用户下的其他 Ethereum linked wallets。
- 使用行内 `Use` / `Connect` 操作：已连接的非 active 钱包显示 `Use`；已绑定但当前设备未连接的钱包显示 `Connect`；active 钱包显示不可点击的 active 状态。
- 通过 Privy 移动端能力绑定新的 external Ethereum wallet。
- 新钱包绑定成功后立即将该钱包设为 Privy active，并继续完成平台 active wallet 同步；不要求用户再次点击 `Use`。
- 对已有 linked wallet 发起 active 切换前使用原生确认；未连接钱包先连接，并验证 provider 实际返回地址与目标地址一致。
- 新增独立 `wallet-select` 受控后端路径；保留现有 `wallet-login` 行为，不在本功能中修改其登录和历史同步逻辑。
- `wallet-select` 使用 operation id 和 `expectedPreviousAddress` 防止重复提交与陈旧客户端覆盖新状态。
- 平台侧在一个数据库事务中同步目标钱包、关闭旧 primary、开启目标 primary，并更新 `investors.wallet_address`。
- `wallet-select` 成功后返回同一应用账户的新短期 JWT 与 `AuthViewer`；客户端必须先持久化新会话，再把操作显示为完成。
- 对 Privy 成功但平台同步失败、平台成功但会话持久化失败、跨账户钱包冲突和 Viewer 变化提供明确恢复状态。
- 通过确定性测试、后端事务测试、权限与 RLS 测试、iOS 真机 QA，以及后续统一的 Android QA 验证流程。

## 范围外

- 不修改现有 `wallet-login` 的登录、钱包同步或 JWT 签发逻辑。
- 不在本功能中实现历史重构文档中的完整 `sync-wallets` 服务；只增加完成 active 选择所需的最小 `wallet-select` 路径。
- 不迁移或复制 KYC、积分、推荐关系、返佣、持仓和其他账户权益；切换钱包始终发生在同一个 investor / Privy 账户内。
- 不实现钱包解绑；受控解绑属于已完成的 Task 8D。
- 不实现转账、提现、消息签名、链切换、合约调用、购买或资产写操作。
- 不支持通过手工输入、粘贴地址、路由参数或二维码直接指定 active wallet。
- 不自动清理 Privy 中绑定冲突的钱包；跨账户冲突时必须由用户明确确认后走独立清理动作。
- 不保证 Privy 与平台数据库具备跨系统 ACID 事务；本功能通过严格调用顺序、平台原子事务、补偿和动作锁实现可恢复的一致性。

## 业务规则

- 用户必须同时拥有有效的应用会话、当前 `AuthViewer` 和有效 Privy 会话，才可看到可达的绑定或切换写操作。
- active wallet 是平台级身份状态，不只是 Wallet 页面的展示选择。以下地址在成功完成后必须一致：Privy active wallet、`investor_wallets.is_primary` 对应地址、`investors.wallet_address`、`AuthViewer.walletAddress` 和本地持久化会话中的 Viewer 地址。
- 新钱包绑定成功后立即成为 active。绑定流程不得停在“新钱包已在列表中，但仍以旧钱包为 active”的正常完成状态。
- 新钱包绑定及已有钱包切换共用同一平台收敛流程：Privy 先确认目标已关联并 active，随后调用 `wallet-select`，最后持久化替换会话。
- 绝不能在 Privy 绑定或 active 切换失败后调用平台 `wallet-select`。
- `wallet-select` 不接受客户端提供的 `investor_id`。服务端必须从验证后的 Privy identity 推导 investor，并确认目标是当前 Privy 用户的 linked Ethereum wallet。
- `wallet-select` 必须验证目标地址、当前平台地址和 `expectedPreviousAddress`。陈旧请求、跨账户目标、非 linked wallet、非 Ethereum wallet 或地址不匹配请求必须被拒绝。
- 服务端不得依赖 Privy `linked_accounts` 的数组顺序选择钱包，必须按规范化后的明确目标地址匹配。
- 平台数据库更新必须原子完成：目标钱包同步或 upsert、旧 primary 关闭、目标 primary 开启、`investors.wallet_address` 更新必须全部成功或全部回滚。
- 同一 operation id 的重试必须幂等；并发切换必须串行或基于预期旧地址拒绝后到的陈旧操作。
- 用户切换已有钱包前必须看到原生确认；取消确认不得调用 Privy active 切换、`wallet-select` 或数据库写操作。
- 绑定新钱包时，用户在钱包提供方完成连接 / 授权即视为选择该新钱包成为 active，不再追加第二次 `Use` 确认；平台同步过程必须有明确进行中状态。
- 已绑定但当前设备未连接的钱包不能直接 `Use`。客户端必须先连接，校验实际连接地址等于目标，再进入原生切换确认。
- 如果目标钱包已经归属另一个 investor，平台必须拒绝绑定 / 切换，不改变当前账户 active wallet、KYC 或权益，并提示用户明确清理本次新增的 Privy link。
- 如果 Privy 已切为新 active，但 `wallet-select` 失败，客户端必须尝试把 Privy active 回滚到操作前钱包；新绑定钱包可以继续保留为 linked、非 active，并显示 `Use` 供重试。
- 如果上述 Privy 回滚也失败，进入 `consistency_error`：锁定所有依赖钱包身份的写操作，重新读取 Privy 与平台状态，并要求用户重试收敛；不得猜测哪个地址有效。
- 如果 `wallet-select` 已成功但客户端会话持久化失败，进入 `session_sync_pending`：保留受控恢复信息、锁定钱包相关写操作，并只重试会话获取 / 持久化，不重复平台选择事务。
- 在 Privy active、平台 active 和 Viewer 地址不一致期间，Wallet 只能展示“正在同步 / 需要恢复”，不得允许绑定、切换、解绑、转账、购买或签名等依赖钱包身份的写操作。
- 成功提示只允许在 Privy active、`wallet-select` 响应 Viewer 和本地持久化 Viewer 三者一致后出现；重新读取的数据库状态作为服务端验收依据。
- 登出、账户变化或认证代次改变时，必须使当前操作失效；旧异步结果不得覆盖新账户会话。
- 客户端、Edge Function、数据库日志和交付证据不得记录 Privy token、JWT、email、user id、完整 auth 响应或未脱敏的钱包地址集合。

## 状态模型

| 状态 | 可信来源 | 含义 | 允许流转 |
| ---- | -------- | ---- | -------- |
| `idle` | 当前 `AuthViewer`、Privy linked wallets、连接状态 | 身份一致且没有 mutation；展示 `Active`、`Use`、`Connect` 或绑定入口 | `binding`、`connecting`、`confirming_switch` |
| `binding` | 用户触发、Privy SDK | 正在连接并绑定新的 external wallet | `bind_error`、`activating(target, previous)` |
| `bind_error` | Privy SDK 结果 | 新钱包未完成绑定，平台写未开始 | `idle`、`binding` |
| `connecting(target)` | Privy SDK / 钱包 provider | 正在连接已关联但本机未连接的钱包并校验实际地址 | `connect_error`、`confirming_switch` |
| `connect_error(target)` | provider 结果或地址校验 | 未获得匹配目标的连接，不允许切换 | `idle`、`connecting` |
| `confirming_switch(target)` | canonical target、原生确认 | 等待用户确认切换已有钱包，没有平台写入 | `idle`、`activating` |
| `activating(target, previous)` | Privy SDK | 目标已关联，正在把 Privy active 切到目标 | `activation_error`、`platform_syncing` |
| `activation_error(target)` | Privy SDK | Privy 未切换成功，`wallet-select` 未调用 | `idle`、`activating` |
| `platform_syncing(target, previous, operationId)` | 验证后的 Privy token、`wallet-select` | Privy 已 active，平台正在原子选择目标并签发新会话 | `rolling_back`、`session_persisting`、`consistency_error` |
| `rolling_back(previous)` | Privy SDK | 平台选择失败，正在把 Privy active 补偿回旧钱包 | `rollback_complete`、`consistency_error` |
| `rollback_complete(target)` | Privy active 结果 | 平台仍使用旧钱包；新钱包可保留 linked、非 active 并显示 `Use` | `idle`、`confirming_switch` |
| `session_persisting(target, operationId)` | `wallet-select` 成功响应、session adapter | 平台已切换，正在持久化替换 JWT 与 Viewer | `complete`、`session_sync_pending` |
| `session_sync_pending(target, operationId)` | 平台成功响应 / 恢复查询、本地持久化结果 | 平台 active 已变更，但本地会话尚未可靠替换；钱包写操作被锁定 | `session_persisting`、`complete`、`consistency_error` |
| `consistency_error` | Privy、平台 Viewer、恢复查询的对账结果 | 身份来源不一致，不能安全执行钱包相关写操作 | `platform_syncing`、`rolling_back`、`session_persisting`、`idle`（完成对账后） |
| `complete(target)` | Privy active、`wallet-select` Viewer、本地持久化 Viewer | 绑定 / 切换完整成功，目标钱包成为 active | `idle` |

## 权限和可信边界

- 谁可以读：已登录用户可以读取本人 `AuthViewer`、RLS 允许的本人 `investor_wallets`、Wallet read model 和 Privy linked-wallet metadata；未登录用户不能读取受保护钱包管理数据。
- 谁可以写：用户只能通过当前 Privy 会话执行绑定、连接和 active 选择；平台主钱包只能通过验证 Privy token 的受控 `wallet-select` 写入，客户端不能直接更新 `investor_wallets.is_primary` 或 `investors.wallet_address`。
- 可信判断所在层：Privy 验证 provider 身份和 linked wallet；`wallet-select` 验证 token、目标归属、investor 映射、预期旧地址和幂等键；数据库原子函数执行唯一性与镜像更新；应用会话由后端签发并由客户端持久化。
- 前端职责：展示 canonical 状态、发起原生确认、串行编排 Privy 与平台调用、锁定不一致期间的写操作、执行有限补偿和恢复。前端不得自行判定钱包归属或直接构造数据库身份写入。
- 外部写边界：绑定与 Privy active 切换属于外部 provider 写操作，必须由明确用户动作触发；平台写只允许发生在 Privy 成功之后。
- 数据库边界：`wallet-select` 使用服务端受控权限调用单个原子函数；RLS 继续限制客户端只能读取本人钱包，不能扩展客户端直接写权限。
- 会话边界：新 JWT 仍代表同一个平台账户，只更新该账户当前 active wallet 的 Viewer 声明；它不是新账户，也不能迁移另一个 investor 的数据。

## 数据来源

- `AuthViewer.walletAddress`：当前客户端已持久化的平台 active wallet 地址。
- Privy current user / linked accounts：当前 Privy 身份和本人已关联 Ethereum wallets。
- Privy active / connected wallet 状态：provider 当前实际激活或连接的目标地址；必须规范化后与明确目标比较。
- Privy access token：仅在内存中提交给 `wallet-select` 进行服务端验证，不得记录或持久化到业务文档。
- `investor_wallets`：平台钱包归属、状态和 `is_primary` 的数据库事实来源。
- `investors.wallet_address`：兼容现有业务查询的平台 active wallet 镜像，必须与 primary wallet 原子更新。
- `wallet-select`：平台 active 切换的唯一新写入口，返回替换 JWT、`AuthViewer`、operation id 和规范化目标地址。
- 客户端 session adapter：持久化新短期应用会话，并在成功后驱动全局 Viewer 刷新。
- 本地 operation state：只保存 operation id、脱敏目标 / 前序地址和恢复阶段，不保存 token、JWT 或 provider 原始错误体。

## 验收场景

| 场景 | Given | When | Then |
| ---- | ----- | ---- | ---- |
| 绑定新钱包并立即 active | 用户已登录且身份一致，新 external wallet 未归属其他 investor | 用户从 Wallet 发起绑定并在 provider 中成功连接 | 新钱包被 Privy 关联并设为 active，`wallet-select` 原子更新平台 primary 与 mirror，客户端持久化新 Viewer 后显示成功；无需再次点击 `Use` |
| 切换已连接钱包 | 目标属于当前 Privy / investor、非 active 且已连接 | 用户点击 `Use` 并确认 | Privy 先切 active，平台事务随后收敛，替换会话持久化后目标显示 `Active` |
| 切换未连接钱包 | 目标已关联但当前设备未连接 | 用户点击 `Connect` | 先连接并验证实际地址；匹配后才允许确认和切换，不匹配则停止且无平台写入 |
| 取消已有钱包切换 | 目标符合切换条件 | 用户在原生确认中取消 | 不调用 Privy active 切换、`wallet-select` 或数据库写入，旧钱包保持 active |
| Privy 绑定失败 | 用户开始绑定 | provider 拒绝、取消或网络失败 | 不调用 `wallet-select`，平台与 Viewer 保持旧地址，可重新开始绑定 |
| Privy active 切换失败 | 目标已关联 | Privy 未能把目标设为 active | 不调用 `wallet-select`，平台与会话保持不变，不显示成功 |
| 平台同步失败且回滚成功 | Privy 已切到目标，但 `wallet-select` 拒绝或失败 | 客户端执行补偿 | Privy 回到 previous active，平台仍是 previous；新钱包可保留 linked、非 active，用户可稍后点 `Use` 重试 |
| 平台同步失败且回滚失败 | Privy 已切目标，平台仍是 previous，补偿也失败 | 客户端重新对账 | 进入 `consistency_error`，所有钱包相关写操作锁定，不把任一侧显示为完整成功 |
| 会话持久化失败 | `wallet-select` 已成功并返回新 JWT / Viewer | 本地 session adapter 写入失败 | 进入 `session_sync_pending`，不重复平台事务，只重试会话恢复；Wallet 相关写操作保持锁定 |
| 跨账户钱包冲突 | 新绑定或目标地址已归属另一个 investor | 调用 `wallet-select` | 服务端拒绝且当前账户 active / KYC / 权益不变；客户端回滚 Privy active，并提示用户明确清理新增 Privy link |
| 陈旧或并发请求 | 客户端 expected previous 已过期，或两个切换并发 | 服务端收到请求 | 最多一个平台选择成功；陈旧请求被拒绝，数据库始终只有一个 primary 且 mirror 一致 |
| 幂等重试 | 同一 operation id 的平台响应丢失 | 客户端重试相同操作 | 服务端返回同一最终结果，不创建重复钱包、不翻转到错误地址、不重复迁移状态 |
| 非 linked / 伪造目标 | 地址来自输入、路由或过期对象，不在验证后的 Privy linked wallets 中 | 尝试调用 `wallet-select` | 服务端拒绝，不发生数据库或会话变更 |
| 状态一致性 | 绑定或切换完成 | 重新读取 Privy、Viewer、`investor_wallets` 和 investor mirror | 四个来源均指向同一规范化地址，且同一 investor 只有一个 primary |
| 账户权益隔离 | 用户在同一账户切换 active wallet | 重新读取 KYC、积分、推荐、返佣和持仓 | investor id 与所有账户权益保持不变，只更新 active wallet 身份引用 |
| 登出或账户变化 | 操作正在执行 | 用户登出或认证代次变化 | 旧操作结果被丢弃，不能覆盖新会话；必要时下次登录触发只读对账与恢复提示 |
| Android 延后验证 | 代码和自动化完成但 Android 环境尚未统一 | 阶段性验收 | 明确记录 Android 为发布前待验证门禁，不把跨平台真机 QA 表述为完成 |

## 风险和开放问题

- 已确认：绑定新钱包后立即 active，与当前 Web 端用户可见行为保持一致；旧的“绑定后只加入列表、不自动 active”方案已废弃，不得出现在后续设计或计划中。
- 已确认：现有 Web UI 显示 Privy 的新 active 地址，但重新调用现有 `wallet-login` 可能仍返回旧平台钱包地址。这是本功能必须解决的一致性缺口，不能以 UI 显示正确作为平台已收敛的证据。
- 已确认：本功能不修改现有 `wallet-login`，新增最小 `wallet-select` 路径承载 active 选择、数据库原子更新与新会话签发。
- 高风险：Privy 与 Supabase 数据库无法共享事务。调用顺序固定为 Privy 成功后平台写，平台失败时优先回滚 Privy；无法回滚时锁定钱包动作并进入人工可见恢复状态。
- 高风险：必须避免“Privy 设置失败但 `investor_wallets.is_primary` 成功”。客户端不得在 Privy 失败后调用平台；服务端仍必须验证 target 位于当前 Privy linked wallets 中并使用 expected previous 防止越权 / 陈旧覆盖。
- 高风险：数据库必须通过单个原子函数同时更新 `investor_wallets.is_primary` 和 `investors.wallet_address`。方案阶段需确认函数签名、唯一约束、锁顺序、幂等记录和 RLS / service-role 边界。
- 高风险：跨账户钱包唯一性冲突不能迁移 KYC 或权益，也不能自动解绑 provider。平台拒绝后只允许明确用户清理本次 Privy link。
- 非阻塞：新 JWT 是同一账户的替换短期会话，用于让 `AuthViewer.walletAddress` 与新平台 active wallet 一致；不是创建新账户。
- 非阻塞：绑定 provider 在“linked”与“active”之间可能存在 SDK 短暂延迟。实现需以 SDK 确认的明确目标地址驱动，不依赖 linked wallet 数组顺序。
- 非阻塞：方案阶段需基于当前 `@privy-io/expo` 版本确认绑定、连接和设置 active 的准确 SDK 能力与错误语义；若 SDK 无法独立设置 active，必须采用与当前 Web / Privy 移动端可用能力等价且可验证的流程，不能静默降级为“仅绑定”。
- 发布前阻塞：iOS 必须覆盖新绑定即 active、已有钱包切换、平台失败恢复和会话刷新；Android 环境按用户决定统一后续验证，但在 Android 通过前不得声明跨平台发布就绪。
- 延后：完整 `sync-wallets` 后端重构、转账、签名、链切换、购买和自动冲突清理不属于本功能。

## 进入开发检查清单

- [x] 业务目标、范围内、范围外可以用一句话讲清楚。
- [x] 核心业务规则、状态模型、权限和可信边界没有歧义。
- [x] 数据来源明确，不依赖前端猜测。
- [x] 正常、空 / 失败 / 权限路径都有验收场景。
- [x] 开放问题已标记为阻塞、非阻塞或延后。

## 既有业务依据

- `docs/requirements/2026-07-02-rn-full-app-port.md`：Wallet 总体范围、受保护页面和服务端可信写入边界。
- `docs/superpowers/specs/2026-07-16-mobile-wallet-readonly-design.md`：当前 Wallet read model 与原 8E 延后边界。
- `docs/requirements/2026-07-18-rn-wallet-controlled-unlink.md`：Task 8D 的账户隔离、Privy 身份和会话刷新约束。
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/pages/Wallet.tsx` 与 `src/components/wallet`：当前 Web 钱包绑定、展示和切换交互依据。
- `/Users/rwa_start/ProjectSource/ArtStarFront/supabase/functions/wallet-login/index.ts`：现有登录、钱包同步和 JWT 签发逻辑；本功能保持其行为不变。
- `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform/supabase/migrations/021_investor_wallets.sql`：现有钱包唯一性、primary 约束和 RLS 基础。
- `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform/docs/superpowers/plans/2026-04-29-kyc-uniqueness-wallet-binding.md`：历史 `sync-wallets` / `wallet-select` 重构意图，仅作为业务和风险参考，不视为已实现能力。
