# 需求说明：移动端钱包绑定与活跃钱包切换

日期：2026-07-19
Feature slug：`rn-wallet-switching`
状态：已确认

## 业务目标

允许已登录投资者在移动端 Wallet 页面绑定新的外部 Ethereum 钱包，或在同一 Privy / 平台账户已绑定的钱包之间切换活跃钱包；新钱包绑定成功后必须立即成为 active，与当前 Web 端业务行为一致。外部连接器当前选中地址、Privy linked wallet 归属、平台主钱包、`investors.wallet_address`、`wallet-select` 返回的 `AuthViewer.walletAddress` 和客户端持久化 Viewer 必须最终收敛到同一地址，任何中间失败都不得被展示为完整成功。应用 JWT 只标识同一个 investor，不携带 active wallet，本流程不得轮换或延长现有应用会话。

## 用户角色

- 已登录投资者：可以查看本人 Privy 已关联的钱包、绑定新的外部 Ethereum 钱包，并把本人已有钱包切为 active。
- 使用未在当前设备连接的已绑定 external wallet 的投资者：必须先通过钱包提供方连接并验证实际返回地址，匹配目标后才能切换。
- 未登录用户：无法进入受保护 Wallet 页面，也不能调用绑定、切换或平台钱包写接口。
- Privy：验证当前身份并维护 linked wallet；当前 Expo SDK 不持久化 Web `useActiveWallet` 状态，移动端 active 选择由连接器目标和平台 primary 共同表达。
- `wallet-select` Edge Function：验证 Privy token 和目标钱包归属，以当前验证身份推导 investor，调用数据库原子操作更新平台主钱包，并返回 operation result 与 authoritative `AuthViewer`；不签发或轮换应用 JWT。
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
- 新钱包完成 Privy SIWE 绑定后立即继续完成平台 active wallet 同步；不要求用户再次点击 `Use`，也不依赖 Expo SDK 中不存在的 `setActiveWallet` API。
- 对已有 linked wallet 发起 active 切换前使用原生确认；未连接钱包先连接，并验证 provider 实际返回地址与目标地址一致。
- 新增独立 `wallet-select` 受控后端路径；保留现有 `wallet-login` 行为，不在本功能中修改其登录和历史同步逻辑。
- `wallet-select` 使用 operation id 和 `expectedPreviousAddress` 防止重复提交与陈旧客户端覆盖新状态。
- 平台侧在一个数据库事务中同步目标钱包、关闭旧 primary、开启目标 primary，并更新 `investors.wallet_address`。
- 收紧 `investors` 的 authenticated 更新权限，移除允许本人直接更新整行的 self-update 路径，确保 `wallet_address` 只能由受控服务端流程修改。
- `wallet-select` 成功后返回 operation id、幂等标记与 authoritative `AuthViewer`；客户端必须保留现有 access token、refresh token 和过期时间，只持久化经过账户与目标地址校验的新 Viewer，再把操作显示为完成。
- 对 Privy 成功但平台同步失败、平台成功但 Viewer 持久化失败、跨账户钱包冲突和 Viewer 变化提供明确恢复状态。
- 通过确定性测试、后端事务测试、权限与 RLS 测试、iOS 真机 QA，以及后续统一的 Android QA 验证流程。

## 范围外

- 不修改现有 `wallet-login` 的登录、钱包同步或 JWT 签发逻辑。
- 不在本功能中实现历史重构文档中的完整 `sync-wallets` 服务；只增加完成 active 选择所需的最小 `wallet-select` 路径。
- 不迁移或复制 KYC、积分、推荐关系、返佣、持仓和其他账户权益；切换钱包始终发生在同一个 investor / Privy 账户内。
- 不把 Dashboard 账户级持仓降级为 active-wallet 单钱包视图；链上 Token 不迁移，但 Dashboard 必须聚合同一 investor 下全部 active Ethereum wallets 的实际余额。Wallet 页面继续只展示单钱包余额。
- 不实现钱包解绑；受控解绑属于已完成的 Task 8D。
- 不实现转账、提现、消息签名、链切换、合约调用、购买或资产写操作。
- 不支持通过手工输入、粘贴地址、路由参数或二维码直接指定 active wallet。
- 不自动清理 Privy 中绑定冲突的钱包；跨账户冲突时必须由用户明确确认后走独立清理动作。
- 不保证 Privy 与平台数据库具备跨系统 ACID 事务；本功能通过严格调用顺序、平台原子事务、补偿和动作锁实现可恢复的一致性。

## 业务规则

- 用户必须同时拥有有效的应用会话、当前 `AuthViewer` 和有效 Privy 会话，才可看到可达的绑定或切换写操作。
- active wallet 是平台级身份状态，不只是 Wallet 页面的展示选择。以下地址在成功完成后必须一致：本次外部连接器明确选中的地址（external wallet 场景）、Privy linked wallet 中的目标地址、`investor_wallets.is_primary` 对应地址、`investors.wallet_address`、`AuthViewer.walletAddress` 和本地持久化会话中的 Viewer 地址。
- 新钱包绑定成功后立即成为 active。绑定流程不得停在“新钱包已在列表中，但仍以旧钱包为 active”的正常完成状态。
- 新钱包绑定及已有钱包切换共用同一平台收敛流程：新钱包先完成 Privy SIWE 关联，已有 external wallet 先完成目标连接校验，随后调用 `wallet-select`，最后保留原会话凭据并持久化新 Viewer。
- 外部钱包连接、Privy SIWE message 和应用配置链必须一致：测试环境固定 `eip155:97`，生产环境固定 `eip155:56`。Reown proposal 不得同时暴露其他环境的链让钱包自行选择；SIWE `Chain ID` 与实际连接 provider chain id 必须等于当前配置链。
- WalletConnect session 在钱包端失效或本地恢复状态不完整时，客户端必须停止当前 SIWE，清理本地连接状态并允许重新连接；不得继续调用 Privy link 或 `wallet-select`，不得无限 loading，也不得把绑定阶段失败显示为平台 activation pending。
- 绝不能在 Privy SIWE 绑定失败、连接取消或连接地址不匹配后调用平台 `wallet-select`。
- `wallet-select` 不接受客户端提供的 `investor_id`。服务端必须从验证后的 Privy identity 推导 investor，并确认目标是当前 Privy 用户的 linked Ethereum wallet。
- `wallet-select` 必须验证目标地址、当前平台地址和 `expectedPreviousAddress`。陈旧请求、跨账户目标、非 linked wallet、非 Ethereum wallet 或地址不匹配请求必须被拒绝。
- 服务端不得依赖 Privy `linked_accounts` 的数组顺序选择钱包，必须按规范化后的明确目标地址匹配。
- 平台数据库更新必须原子完成：目标钱包同步或 upsert、旧 primary 关闭、目标 primary 开启、`investors.wallet_address` 更新必须全部成功或全部回滚。
- 数据库 migration 必须撤销 authenticated 对 `investors` 的直接 UPDATE 能力并移除宽泛 self-update policy；现有昵称更新继续使用 `update_my_nickname` RPC，不依赖该 policy。
- 同一 operation id 的重试必须幂等；并发切换必须串行或基于预期旧地址拒绝后到的陈旧操作。
- 用户切换已有钱包前必须看到原生确认；取消确认不得调用 `wallet-select` 或数据库写操作。未连接 external wallet 可先完成连接校验，但取消后不得改变平台 active。
- 绑定新钱包时，用户在钱包提供方完成连接 / 授权即视为选择该新钱包成为 active，不再追加第二次 `Use` 确认；平台同步过程必须有明确进行中状态。
- 已绑定但当前设备未连接的钱包不能直接 `Use`。客户端必须先连接，校验实际连接地址等于目标，再进入原生切换确认。
- 如果目标钱包已经归属另一个 investor，平台必须拒绝绑定 / 切换，不改变当前账户 active wallet、KYC 或权益，并提示用户明确清理本次新增的 Privy link。
- 如果 Privy 已完成新钱包关联但 `wallet-select` 失败，新钱包继续保留为 linked、非平台 active，并显示 `Use` 供重试；不得自动 unlink 或把绑定步骤表述为完整成功。
- 如果服务端或客户端无法确认 platform primary、mirror 与 Viewer 是否一致，进入 `consistency_error`：锁定所有依赖钱包身份的写操作，重新读取平台状态，并要求用户重试收敛；不得猜测哪个地址有效。
- 如果 `wallet-select` 已成功但客户端 Viewer 持久化失败，进入 `viewer_sync_pending`：保留受控恢复信息、锁定钱包相关写操作，并使用同一 operation id 获取 authoritative Viewer 后重试本地持久化，不重复 Privy link，也不创建新的平台选择 operation。
- 在连接器目标、平台 active 和 Viewer 地址不一致期间，Wallet 只能展示“正在同步 / 需要恢复”，不得允许绑定、切换、解绑、转账、购买或签名等依赖钱包身份的写操作。
- 成功提示只允许在明确目标、`wallet-select` 响应 Viewer 和本地持久化 Viewer 三者一致后出现；重新读取的数据库状态作为服务端验收依据。
- 登出、账户变化或认证代次改变时，必须使当前操作失效；旧异步结果不得覆盖新账户会话。
- Dashboard 的交易记录按 `mint_events.investor_id` 读取；Portfolio / Holdings 以该 investor 的交易资产集合为候选资产，再对 `investor_wallets` 中全部 `status='active' AND chain_type='ethereum'` 的钱包执行链上余额聚合。不得使用 `AuthViewer.walletAddress` 作为账户持仓的唯一过滤条件。
- 账户持仓聚合失败时不得静默显示为零资产。单钱包或单链读取失败必须产生部分不可用 warning；账户钱包列表或交易记录读取失败必须进入 Portfolio unavailable，避免把基础设施错误表述为无持仓。
- 客户端、Edge Function、数据库日志和交付证据不得记录 Privy token、JWT、email、user id、完整 auth 响应或未脱敏的钱包地址集合。

## 状态模型

| 状态 | 可信来源 | 含义 | 允许流转 |
| ---- | -------- | ---- | -------- |
| `idle` | 当前 `AuthViewer`、Privy linked wallets、连接状态 | 身份一致且没有 mutation；展示 `Active`、`Use`、`Connect` 或绑定入口 | `binding`、`connecting`、`confirming_switch` |
| `binding` | 用户触发、外部连接器、Privy SIWE | 正在连接、签名并绑定新的 external wallet | `bind_error`、`platform_syncing` |
| `bind_error` | Privy SDK 结果 | 新钱包未完成绑定，平台写未开始 | `idle`、`binding` |
| `connecting(target)` | Reown adapter / 钱包 provider | 正在连接已关联但本机未连接的钱包并校验实际地址 | `connect_error`、`confirming_switch` |
| `connect_error(target)` | provider 结果或地址校验 | 未获得匹配目标的连接，不允许切换 | `idle`、`connecting` |
| `confirming_switch(target)` | canonical target、原生确认 | 等待用户确认切换已有钱包，没有平台写入 | `idle`、`platform_syncing` |
| `platform_syncing(target, previous, operationId)` | 验证后的 Privy token、`wallet-select` | 目标已确认 linked / connected，平台正在原子选择目标并生成 authoritative Viewer | `sync_error`、`viewer_persisting`、`consistency_error` |
| `sync_error(target, operationId)` | `wallet-select` 拒绝或网络失败 | 平台未确认切换；目标可保持 linked，允许使用同一 operation id 重试 | `platform_syncing`、`idle`、`consistency_error` |
| `viewer_persisting(target, operationId)` | `wallet-select` 成功响应、Viewer persistence adapter | 平台已切换，正在保留原 token / expiry 并持久化新 Viewer | `complete`、`viewer_sync_pending` |
| `viewer_sync_pending(target, operationId)` | 平台成功响应 / 幂等恢复、本地持久化结果 | 平台 active 已变更，但本地 Viewer 尚未可靠更新；钱包写操作被锁定 | `viewer_persisting`、`complete`、`consistency_error` |
| `consistency_error` | Privy linked accounts、平台 Viewer、恢复查询的对账结果 | 身份来源不一致，不能安全执行钱包相关写操作 | `platform_syncing`、`viewer_persisting`、`idle`（完成对账后） |
| `complete(target)` | 明确目标、Privy linked accounts、`wallet-select` Viewer、本地持久化 Viewer | 绑定 / 切换完整成功，目标钱包成为平台 active | `idle` |

## 权限和可信边界

- 谁可以读：已登录用户可以读取本人 `AuthViewer`、RLS 允许的本人 `investor_wallets`、Wallet read model 和 Privy linked-wallet metadata；未登录用户不能读取受保护钱包管理数据。
- 谁可以写：用户只能通过当前 Privy 会话和外部连接器执行 SIWE 绑定 / 连接；平台主钱包只能通过验证 Privy token 的受控 `wallet-select` 写入，客户端不能直接更新 `investor_wallets.is_primary` 或 `investors.wallet_address`。
- 可信判断所在层：Privy 验证 provider 身份和 linked wallet；`wallet-select` 验证 token、目标归属、investor 映射、预期旧地址和幂等键；数据库原子函数执行唯一性与镜像更新；现有应用 JWT 继续只证明 investor 身份，客户端只持久化服务端返回并校验后的 Viewer。
- 前端职责：展示 canonical 状态、发起原生确认、串行编排 Privy 与平台调用、锁定不一致期间的写操作、执行有限补偿和恢复。前端不得自行判定钱包归属或直接构造数据库身份写入。
- 外部写边界：Privy SIWE 绑定属于外部 provider 写操作，必须由明确用户动作和钱包签名触发；平台写只允许发生在绑定成功或已关联目标完成连接校验之后。
- 数据库边界：`wallet-select` 使用服务端受控权限调用单个原子函数；RLS 继续限制客户端只能读取本人钱包，不能扩展客户端直接写权限。
- 会话边界：钱包切换不得签发新 JWT、改变 token 过期时间或延长登录生命周期。客户端必须验证响应 `user.id` 等于当前 Viewer id、响应钱包等于明确目标，再在原 session record 中只替换 Viewer。JWT 过期与刷新由独立 auth 流程处理。

## 数据来源

- `AuthViewer.walletAddress`：当前客户端已持久化的平台 active wallet 地址。
- Privy current user / linked accounts：当前 Privy 身份和本人已关联 Ethereum wallets。
- 外部连接器状态：provider 当前实际选择 / 连接的目标地址；这是设备级临时状态，必须规范化后与明确目标比较，不作为服务端钱包归属来源。
- Privy access token：仅在内存中提交给 `wallet-select` 进行服务端验证，不得记录或持久化到业务文档。
- `investor_wallets`：平台钱包归属、状态和 `is_primary` 的数据库事实来源。
- `mint_events.investor_id`：账户购买 / 铸造事件的归属来源；`buyer_wallet` 只保留实际执行交易的钱包，不再作为 Dashboard 账户交易的唯一过滤条件。
- active Ethereum `investor_wallets` + 链上 `balanceOf`：Dashboard 账户实时持仓来源；按资产汇总所有有效关联钱包的余额，不迁移或复制 Token。
- `investors.wallet_address`：兼容现有业务查询的平台 active wallet 镜像，必须与 primary wallet 原子更新。
- `wallet-select`：平台 active 切换的唯一新写入口，返回 authoritative `AuthViewer`、operation id、幂等标记和规范化目标地址，不返回 `access_token` 或 `expires_in`。
- 客户端 Viewer persistence adapter：读取当前有效 session record，原样保留 token、refresh token 和过期时间，只替换 Viewer，并在成功后驱动全局 Viewer 刷新。
- 本地 operation state：只保存 operation id、脱敏目标 / 前序地址和恢复阶段，不保存 token、JWT 或 provider 原始错误体。

## 验收场景

| 场景 | Given | When | Then |
| ---- | ----- | ---- | ---- |
| 绑定新钱包并立即 active | 用户已登录且身份一致，新 external wallet 未归属其他 investor | 用户从 Wallet 发起绑定并完成连接、SIWE 签名与 Privy link | `wallet-select` 原子更新平台 primary 与 mirror，客户端持久化新 Viewer 后显示成功；无需再次点击 `Use` |
| 切换已连接钱包 | 目标属于当前 Privy / investor、非 active 且已连接 | 用户点击 `Use` 并确认 | 平台事务选择该明确目标，Viewer 持久化后目标显示 `Active`，原 JWT 与过期时间不变 |
| 切换未连接钱包 | 目标已关联但当前设备未连接 | 用户点击 `Connect` | 先连接并验证实际地址；匹配后才允许确认和切换，不匹配则停止且无平台写入 |
| 取消已有钱包切换 | 目标符合切换条件 | 用户在原生确认中取消 | 不调用 `wallet-select` 或数据库写入，旧钱包保持 active |
| Privy 绑定失败 | 用户开始绑定 | provider 拒绝、取消或网络失败 | 不调用 `wallet-select`，平台与 Viewer 保持旧地址，可重新开始绑定 |
| WalletConnect session 失效 | 钱包返回签名或恢复旧连接 | provider 报 session topic 不存在，或连接等待超时 | 结束本次绑定、执行本地连接清理并显示重新连接提示；不调用 Privy link / `wallet-select` |
| 连接或地址校验失败 | 目标已关联但当前设备未连接 | provider 取消、失败或返回其他地址 | 不调用 `wallet-select`，平台与会话保持不变，不显示成功 |
| 平台同步失败 | 新钱包已 linked 或已有目标已确认，但 `wallet-select` 拒绝或失败 | 客户端保留恢复状态 | 平台仍以服务端返回 / 恢复查询为准；目标可保持 linked，用户可用同一 operation id 重试，不显示完整成功 |
| 平台结果不确定 | 请求超时且无法判断事务是否提交 | 客户端使用 operation id 恢复查询 / 幂等重试 | 未对账前进入 `consistency_error` 并锁定钱包动作；不得基于超时直接判定旧地址或新地址成功 |
| Viewer 持久化失败 | `wallet-select` 已成功并返回 authoritative Viewer | 本地 Viewer persistence adapter 写入失败 | 进入 `viewer_sync_pending`，同 operation id 幂等恢复后只重试 Viewer 持久化；Wallet 相关写操作保持锁定，原 token 不变 |
| 跨账户钱包冲突 | 新绑定或目标地址已归属另一个 investor | 调用 `wallet-select` | 服务端拒绝且当前账户 active / KYC / 权益不变；新增 Privy link 不自动删除，并提示用户明确清理 |
| 陈旧或并发请求 | 客户端 expected previous 已过期，或两个切换并发 | 服务端收到请求 | 最多一个平台选择成功；陈旧请求被拒绝，数据库始终只有一个 primary 且 mirror 一致 |
| 幂等重试 | 同一 operation id 的平台响应丢失 | 客户端重试相同操作 | 服务端返回同一最终结果，不创建重复钱包、不翻转到错误地址、不重复迁移状态 |
| 非 linked / 伪造目标 | 地址来自输入、路由或过期对象，不在验证后的 Privy linked wallets 中 | 尝试调用 `wallet-select` | 服务端拒绝，不发生数据库或会话变更 |
| 状态一致性 | 绑定或切换完成 | 重新读取 Privy、Viewer、`investor_wallets` 和 investor mirror | 四个来源均指向同一规范化地址，且同一 investor 只有一个 primary |
| 账户权益隔离 | 用户在同一账户切换 active wallet | 重新读取 KYC、积分、推荐、返佣和持仓 | investor id 与所有账户权益保持不变；Dashboard 交易按 investor 读取并聚合全部 active Ethereum wallets，Portfolio / Holdings 不因 active wallet 改变而清零；Wallet 页面仍显示单钱包余额 |
| 账户持仓部分失败 | 同一 investor 有多个 active Ethereum wallets，至少一个钱包或链 RPC 暂时失败 | 刷新 Dashboard | 展示可确认的账户持仓并给出部分不可用 warning，不把失败钱包视为零余额；交易记录仍按 investor 展示 |
| 登出或账户变化 | 操作正在执行 | 用户登出或认证代次变化 | 旧操作结果被丢弃，不能覆盖新会话；必要时下次登录触发只读对账与恢复提示 |
| Android 延后验证 | 代码和自动化完成但 Android 环境尚未统一 | 阶段性验收 | 明确记录 Android 为发布前待验证门禁，不把跨平台真机 QA 表述为完成 |

## 风险和开放问题

- 已确认：绑定新钱包后立即 active，与当前 Web 端用户可见行为保持一致；旧的“绑定后只加入列表、不自动 active”方案已废弃，不得出现在后续设计或计划中。
- 已确认：现有 Web UI 的 `useActiveWallet` 显示浏览器连接器选择的新地址，但重新调用现有 `wallet-login` 可能仍返回旧平台钱包地址。这是本功能必须解决的一致性缺口，不能以 UI 显示正确作为平台已收敛的证据。
- 已确认：本功能不修改现有 `wallet-login`，新增最小 `wallet-select` 路径承载 active 选择、数据库原子更新与 authoritative Viewer 返回；同一 investor 的 JWT 不轮换。
- 高风险：Privy 与 Supabase 数据库无法共享事务。新钱包调用顺序固定为外部连接、Privy SIWE link、平台写和 Viewer 持久化；平台失败时保留 linked wallet 供重试，结果不确定时锁定钱包动作并进入人工可见恢复状态。
- 高风险：必须避免“Privy SIWE 绑定失败但 `investor_wallets.is_primary` 成功”。客户端不得在绑定失败、连接取消或地址不匹配后调用平台；服务端仍必须验证 target 位于当前 Privy linked wallets 中并使用 expected previous / operation id 防止越权与陈旧覆盖。
- 高风险：数据库必须通过单个原子函数同时更新 `investor_wallets.is_primary` 和 `investors.wallet_address`。方案阶段需确认函数签名、唯一约束、锁顺序、幂等记录和 RLS / service-role 边界。
- 高风险：跨账户钱包唯一性冲突不能迁移 KYC 或权益，也不能自动解绑 provider。平台拒绝后只允许明确用户清理本次 Privy link。
- 已确认：应用 JWT 仅包含 investor identity（`sub` / `email` / `role`），不包含 active wallet；钱包选择不得顺带续期。JWT 过期和 refresh 属于独立 auth 生命周期，Viewer-only 持久化失败不得修改现有 token。
- 已确认：Dashboard 是 investor 账户级视图，Wallet 是单钱包视图。账户 Portfolio / Holdings 聚合全部 active Ethereum wallets；解绑后不再 active 的钱包不参与后续聚合，链上资产本身不会被移动。
- 非阻塞：绑定 provider 在“linked”与“active”之间可能存在 SDK 短暂延迟。实现需以 SDK 确认的明确目标地址驱动，不依赖 linked wallet 数组顺序。
- 已解决：当前 `@privy-io/expo@0.69.4` 提供 `useLinkWithSiwe`，但不提供 Web `useActiveWallet/setActiveWallet`。移动端使用 WalletConnect-compatible 连接器取得明确地址并完成 SIWE link，平台 `wallet-select` 持久化 active；不能静默降级为“仅绑定”。
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
- `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform/supabase/migrations/` 中现有 `investor_wallets` migration：钱包唯一性、primary 约束和 RLS 基础。
- `/Users/rwa_start/ProjectSource/ArtStarManagementPlatform/docs/superpowers/plans/2026-04-29-kyc-uniqueness-wallet-binding.md`：历史 `sync-wallets` / `wallet-select` 重构意图，仅作为业务和风险参考，不视为已实现能力。
