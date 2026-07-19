# 需求说明：移动端受控钱包解绑

日期：2026-07-18
Feature slug：`rn-wallet-controlled-unlink`
状态：已澄清

## 业务目标

允许已登录投资者在移动端 Wallet 页面经过明确确认后，解绑同一 Privy 账户下符合条件的外部、非活跃 Ethereum 钱包，并通过现有 `wallet-login` 同步平台钱包记录和替换短期应用会话；整个流程不得切换账户、改变活跃钱包、迁移 KYC 或权益，也不得在同步重试时重复执行已经成功的 Privy 解绑。

## 用户角色

- 已登录投资者：可以查看自己的活跃钱包和 Privy 已关联钱包，并对符合条件的外部钱包发起解绑。
- 仅有一个 Privy Ethereum 钱包的用户：只能查看钱包，不允许解绑最后一个钱包。
- 使用 Embedded Wallet 或当前活跃钱包的用户：对应钱包不可通过本功能解绑。
- 未登录用户：无法进入受保护 Wallet 页面，也无法获得解绑依赖或发起写操作。
- Privy：验证当前用户身份并执行外部钱包解绑，是关联钱包状态的可信来源。
- `wallet-login` Edge Function：验证 Privy token、同步平台钱包记录，并签发替换用短期 JWT 与 `AuthViewer`；当前任务复用其已部署行为，不修改该函数。

## 风险标签

- [x] auth / 登录
- [x] permission / 权限
- [ ] payment / 支付
- [ ] kyc / 身份认证
- [ ] webhook / 外部回调
- [ ] realtime / 实时同步
- [x] database / 数据写入
- [x] rls / Supabase 权限
- [ ] frontend-performance / 前端性能
- [ ] contract / 合约交互
- [x] external-provider / 外部钱包提供方
- [x] controlled-write / 受控不可逆写操作

## 范围内

- 在已登录 Wallet 页面仅为符合条件的外部、非活跃 Privy Ethereum 钱包展示解绑入口。
- 使用原生 destructive confirmation 显示钱包提供方和缩略地址，用户确认后才允许写操作。
- 通过 `@privy-io/expo` 的 `useUnlinkWallet().unlinkWallet({ address })` 执行一次 Privy 解绑。
- Privy 解绑成功后，非交互地获取当前 Privy access token，并重新调用现有 `wallet-login`。
- 接收 `wallet-login` 返回的新短期 JWT 和 `AuthViewer`，替换本地 Supabase 会话并刷新当前 Viewer；账户 id 与活跃钱包保持不变。
- 当 Privy 已解绑但平台同步失败时，保留当前可用会话和 Viewer，展示独立的待同步状态，并只允许重试 `wallet-login` 同步。
- 通过确定性测试、禁止模式扫描、iOS/Android 原生确认 QA、真实 Privy 解绑和平台收敛证据验证流程。

## 范围外

- 不实现 `sync-wallets`、`wallet-select` 或新的独立后端钱包同步接口；当前继续沿用已部署的 `wallet-login`。
- 不实现活跃钱包切换、外部钱包连接、重新绑定、账户切换或钱包排序。
- 不允许解绑 Embedded Wallet、当前活跃钱包、非 Privy 钱包、未知类型钱包或最后一个 Privy Ethereum 钱包。
- 不实现转账、提现、签名、链切换、合约调用、购买或其他资产写操作。
- 不修改数据库 schema、RLS、Edge Function、KYC、积分、推荐、返佣或权益规则。
- 不把已经在 Privy 解绑的钱包通过客户端回滚或补偿操作重新绑定。

## 业务规则

- 用户必须处于已登录状态，且 Wallet 页面必须同时拥有当前 `AuthViewer` 和 Privy linked-wallet metadata，才能评估解绑入口。
- 可解绑目标必须来自当前内存中的 Privy Ethereum linked-wallet metadata，不接受路由参数、文本输入、剪贴板地址或调用方伪造的钱包属性。
- 只有同时满足以下条件的钱包可以发起解绑：属于当前 Privy 用户、类型为 `external`、不是 `AuthViewer.walletAddress`、解绑后仍至少保留一个 Privy Ethereum 钱包、当前没有解绑或同步操作执行中。
- `AuthViewer.walletAddress` 是活跃钱包的唯一可信来源；Privy 钱包列表只提供关联钱包展示和目标校验信息，不得覆盖活跃钱包。
- Embedded Wallet、当前活跃钱包和最后一个 Privy Ethereum 钱包不展示解绑入口；即使前端对象顺序或属性被篡改，也必须基于当前 canonical identity 重新校验。
- 用户点击解绑后必须看到原生确认；取消确认不得调用 Privy、`wallet-login` 或数据库写入。
- 一次确认操作最多调用一次 Privy unlink。快速重复点击必须合并或阻止，不能产生并发解绑。
- Privy unlink 失败或被用户取消时，不调用 `wallet-login`；界面可以允许用户重新开始一次新的确认流程。
- Privy unlink 成功后必须调用 `wallet-login` 完成平台收敛。现行后端契约会重新生成短期 JWT，但仍代表同一个应用账户，而不是创建或切换账户。
- `wallet-login` 成功后，客户端替换本地 Supabase session 并更新 `AuthViewer`；账户 id、活跃钱包、KYC、积分、推荐、返佣和其他权益必须保持不变。
- Privy unlink 成功而 `wallet-login` 失败时，不清除当前工作会话、不退出登录、不恢复已解绑钱包；仅进入 `sync_error` 并提供 `Retry sync`。
- `Retry sync` 只能再次获取 Privy token 并调用 `wallet-login`，绝不能再次调用 Privy unlink。
- 成功后的地址在 Privy metadata 尚未更新期间必须临时抑制，避免延迟收敛导致解绑入口闪回。
- 登出、Viewer 变化或已登录导航树销毁时，必须丢弃当前页面的解绑状态；过期异步结果不得覆盖新会话。
- 客户端和文档不得记录 Privy token、Supabase JWT、完整 auth 响应、用户 id、email 或原始 provider 错误体。

## 状态模型

| 状态 | 可信来源 | 含义 | 允许流转 |
| ---- | -------- | ---- | -------- |
| `idle` | 当前 `AuthViewer`、Privy wallet metadata、页面状态 | 没有解绑操作；仅符合条件的钱包显示入口 | `confirming` |
| `confirming` | 用户点击、客户端 canonical eligibility guard、原生 Alert | 正在等待用户确认，不允许网络写入 | `idle`、`unlinking` |
| `unlinking(address)` | 用户明确确认、Privy SDK | 正在执行一次 Privy 外部钱包解绑 | `unlink_error`、`syncing` |
| `unlink_error(address)` | Privy SDK 失败或取消结果 | Privy 未完成解绑，平台同步未开始 | `idle`、`confirming` |
| `syncing(address)` | 新 Privy access token、`wallet-login` 响应 | Privy 已解绑，正在同步平台钱包记录和替换会话 | `sync_error`、`complete` |
| `sync_error(address)` | `wallet-login`、网络或 session 持久化失败 | Privy 已解绑但平台同步待完成；只能重试同步 | `syncing`、`idle`（登出或 Viewer 变化） |
| `complete(address)` | `wallet-login` 成功响应与 session 写入结果 | 解绑与平台同步均完成；抑制延迟 metadata 中的旧地址 | `idle` |

## 权限和可信边界

- 谁可以读：已登录用户可以读取当前应用会话允许的本人 `AuthViewer`、Wallet read model 和 Privy linked-wallet metadata；未登录用户只能看到公开登录流程。
- 谁可以写：只有已登录用户在原生确认中明确同意后，客户端才能通过当前 Privy SDK 会话请求解绑；平台钱包记录只能由 `wallet-login` 根据已验证 Privy token 同步。
- 可信判断所在层：Privy 判断用户是否有权解绑 provider wallet；`wallet-login` 验证 Privy token、推导 investor、同步 `investor_wallets`、保持 primary wallet 并签发 JWT；数据库和 RLS 保护后续本人数据。
- 前端职责：前端负责展示、交互防护、canonical target 选择、串行编排和失败恢复。前端 eligibility 是安全纵深和 UX 门禁，不替代 Privy、Edge Function 或数据库授权。
- 客户端不得提交 `investor_id`，也不得把本地地址、钱包 provider 标签或 Viewer 之外的状态作为平台身份依据。
- 新 JWT 仅用于替换同一账户的短期应用会话；客户端不得把它解释成新账户，也不得使用旧 Web 端把同一 JWT 同时当作 `access_token` 和 `refresh_token` 的兼容行为扩展新的授权能力。

## 数据来源

- `AuthViewer.walletAddress`：当前平台活跃钱包的权威地址。
- Privy Expo SDK current user / linked accounts：当前用户的 Ethereum 关联钱包、embedded/external 类型、provider 和解绑结果。
- Privy access token：仅在内存中传给 `wallet-login`，用于后端验证当前用户；不得写入日志或需求证据。
- 已部署的 `wallet-login` Edge Function：读取验证后的 Privy `linked_accounts`，同步缺失钱包为 `status='removed'`，并返回替换用 JWT 与 `AuthViewer`。
- 客户端 Supabase session adapter：持久化替换后的短期应用会话；同步失败时保留已有可用会话。
- 页面本地 mutation state：只保存流程状态和目标公开地址，不保存 token、完整错误体或服务端秘密。

## 验收场景

| 场景 | Given | When | Then |
| ---- | ----- | ---- | ---- |
| 正常路径：解绑外部非活跃钱包 | 用户已登录，目标是当前 Privy metadata 中的 external Ethereum 钱包，不是活跃钱包，且解绑后仍有其他 Ethereum 钱包 | 用户点击解绑并在原生确认中同意 | Privy unlink 只调用一次，随后 `wallet-login` 成功；本地 session 和 Viewer 被替换，目标行消失，账户及活跃钱包不变 |
| 取消确认 | 目标钱包符合资格 | 用户打开确认后选择取消 | 不调用 Privy unlink 或 `wallet-login`，页面返回 `idle` |
| Embedded Wallet | 钱包类型为 embedded | 用户查看钱包行 | 不展示解绑入口，也不能通过调用方构造目标绕过 guard |
| 当前活跃钱包 | 钱包地址等于 `AuthViewer.walletAddress` | 用户查看钱包行 | 不展示解绑入口，钱包保持 active |
| 最后一个 Privy Ethereum 钱包 | 当前 Privy 用户只有一个 Ethereum 钱包 | 用户查看钱包行 | 不展示解绑入口，不允许进入确认状态 |
| 非 Privy 或伪造目标 | 地址仅来自 Viewer、路由、输入或过期对象，不存在于当前 canonical Privy metadata | 尝试发起解绑 | 在确认前返回 ineligible，不调用任何写依赖 |
| Privy 解绑失败 | 用户已确认，但 Privy 拒绝、取消或网络失败 | unlink 返回失败 | 不调用 `wallet-login`；展示非敏感错误，可重新开始确认 |
| 平台同步失败 | Privy unlink 已成功，但 `wallet-login`、网络或 session 写入失败 | 页面进入 `sync_error` | 保留当前会话和 Viewer，显示“钱包已解绑，等待同步”及 `Retry sync`，不再显示该地址的 unlink |
| 离线后恢复同步 | 页面处于 `sync_error` 且网络恢复 | 用户点击 `Retry sync` | 只调用 `wallet-login` 刷新，绝不第二次调用 Privy unlink；成功后进入 `complete` |
| 快速重复操作 | 解绑或同步已在执行 | 用户连续点击解绑或重试 | 同一时刻最多存在一个 mutation；Privy unlink 和对应 session refresh 不重复并发 |
| Viewer 变化或登出 | 操作进行中 | 用户登出或认证代次改变 | 页面状态被清理，旧异步结果不能替换新会话或 Viewer |
| 运行时依赖不可用 | 已登录页面未注入 Privy unlink 或 auth refresh 依赖 | 用户打开 Wallet | Wallet 保持只读，不展示可达的解绑写操作 |
| 权益隔离 | 用户完成解绑和平台同步 | 重新读取账户数据 | account id、活跃钱包、KYC、积分、推荐、返佣和奖励不发生迁移或重置 |

## 风险和开放问题

- 已确认不适用：本功能不转移资产、不支付费用、不发起交易，因此 `payment` 与 `contract` 风险标签保持未勾选；Wallet/钱包仅表示身份关联管理。
- 高风险、已缓解：Privy unlink 是外部不可逆写操作。必须通过 canonical eligibility guard、原生明确确认、单次调用锁和后端再次验证降低误操作风险。
- 高风险、已验证：真实 iOS 解绑已于 2026-07-18 执行一次；Privy 与 `wallet-login` 均返回成功，活跃 Embedded Wallet 保持不变。发布证据不得包含原始 token。
- 非阻塞、发布前门禁：Android 原生确认和取消仍需设备 QA；未通过前不得把跨平台 QA 标记为完成。
- 已接受残余风险：自动化已覆盖 `sync_error`、联网后 `Retry sync` 且无第二次 Privy unlink；2026-07-19 用户决定不为该路径再次执行不可逆真实解绑，设备级离线恢复证据不再阻塞当前 feature，不能表述为已真机通过。
- 非阻塞：Privy metadata 与平台同步可能短暂最终一致；客户端以 `complete(address)` 抑制已完成地址，重新进入页面后以新 metadata 为准。
- 非阻塞：当前 `wallet-login` 同时承担登录、钱包同步和 JWT 重新签发，职责存在耦合；本阶段沿用现有后端契约，未来实现 `sync-wallets` / `wallet-select` 时再单独重构。
- 已确认不阻塞：Privy unlink 使用明确 `address`，不依赖 `linked_accounts` 数组顺序；现有 `wallet-login` 的 primary 选择策略属于独立后端技术债，不纳入本移动端解绑 feature 的改动或发布门禁。
- 非阻塞：真实解绑后的数据库收敛采用 `wallet-login` 服务级成功语义证明，没有从移动客户端执行特权 SQL；直接数据库审计应由具备服务权限的后端/运维执行。
- 延后：解绑后的自动重新绑定、钱包切换、外部钱包连接、转账与签名不属于本功能。
- 延后：iOS Wallet 页面曾出现解绑前已启动的 Supabase `/auth/v1/user` 超时提示；日志证明与解绑请求无关，应作为独立 auth-client 后台请求问题处理。

## 进入开发检查清单

- [x] 业务目标、范围内、范围外可以用一句话讲清楚。
- [x] 核心业务规则、状态模型、权限和可信边界没有歧义。
- [x] 数据来源明确，不依赖前端猜测。
- [x] 正常、空 / 失败 / 权限路径都有验收场景。
- [x] 开放问题已标记为阻塞、非阻塞或延后。

## 既有业务依据

- `docs/superpowers/specs/2026-07-16-mobile-wallet-readonly-design.md`：Task 8D 的父级边界与 deferred scope。
- `docs/superpowers/specs/2026-07-17-mobile-wallet-controlled-unlink-design.md`：已确认的资格、交互、状态、安全和恢复设计。
- `docs/superpowers/plans/2026-07-17-mobile-wallet-controlled-unlink.md`：已执行的实现与机器验证计划。
- `docs/ai-delivery/runs/2026-07-17-rn-wallet-controlled-unlink-verification.md`：测试、iOS QA、真实 Privy 解绑和平台收敛证据。
