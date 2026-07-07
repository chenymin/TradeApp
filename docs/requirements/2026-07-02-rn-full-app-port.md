# 需求说明：React Native 全量 App 迁移

日期：2026-07-02
Feature slug：`rn-full-app-port`
状态：草稿

## 业务目标

将 `/Users/rwa_start/ProjectSource/ArtStarFront/src` 中现有 ArtStar Web 前端迁移为 React Native 客户端版本，让移动端用户可以完成与 Web 端等价的核心投资者流程：登录注册、浏览 Launchpad 和市场、查看资产详情、管理 Dashboard、参与 KYC、使用推荐体系、查看钱包资产，并在移动端完成购买、转账、二维码分享等钱包相关操作。

本需求的目标不是逐文件复制 Web 代码，而是在 React Native 中重建移动端体验：复用 Web 端的业务协议、Supabase 数据契约、Edge Function 合约、纯逻辑映射、ABI 和测试思路；重写依赖 DOM、Tailwind / shadcn / Radix、React Router、wagmi Web provider、浏览器 storage、clipboard、share、二维码和 SEO 的 UI / 平台适配层。

## 用户角色

- 未登录访客：可以浏览公开 Launchpad、资产详情、Market、Referral 规则和排行榜。
- 新用户：通过 Privy 登录后，由 `wallet-login` 返回 `new` / `orphaned` 状态，并完成 `register-user` 注册或恢复流程。
- 已登录投资者：可以访问 Dashboard、Wallet、KYC、推荐面板、持仓、积分、佣金和交易记录。
- KYC 待审核 / 需补件 / 已拒绝 / 已通过用户：看到不同 KYC 状态，并按状态继续或查看结果。
- 推荐人 / KOL 用户：可以复制和分享邀请链接，查看推荐记录、积分和佣金。
- 持有钱包用户：可以查看绑定钱包、余额、二维码、链信息，并在安全边界允许时转账。
- 购买用户：满足登录、钱包、链、KYC、白名单和后端签名条件时，可以在资产详情中完成 approve / mint。
- 被关闭 / 被暂停账号：Privy 登录成功但服务端阻断，客户端显示不可进入状态。
- 运营 / 合规 / 后端系统：不在移动端直接实现，但移动端必须尊重其在 Supabase、RLS、Edge Function、KYC 和合约层给出的可信结果。

## 风险标签

- [x] auth / 登录
- [x] permission / 权限
- [x] payment / 支付
- [x] kyc / 身份认证
- [x] webhook / 外部回调
- [x] realtime / 实时同步
- [x] database / 数据写入
- [x] rls / Supabase 权限
- [x] frontend-performance / 前端性能
- [x] contract / 合约交互

## 范围内

- 建立 React Native App 的移动端信息架构、导航、全局 Provider、错误边界、加载态和基础设计系统。
- 迁移 Privy 登录、Supabase `wallet-login` session exchange、`register-user` 注册、邀请参数、孤儿账号恢复和登出流程。
- 迁移公开页面：Launchpad 首页、资产列表、状态筛选、平台统计、资产卡片、资产详情、Market 列表、搜索、排序和交易外链。
- 迁移已登录页面：Dashboard、持仓摘要、交易记录、用户资料、昵称编辑、KYC 状态、推荐面板、积分、佣金、邀请链接和排行榜。
- 迁移 Wallet 页面：当前钱包、绑定钱包、切换钱包、余额、二维码、复制地址、分享地址图、链信息、提现 / 转账入口和安全限制提示。
- 迁移购买流程：资产详情中读取链上 sale 状态、USDT allowance / balance、请求 `generate-signature`、approve、mint、交易确认和错误状态。
- 迁移 KYC 流程：在移动端提供 Sumsub 或等效 KYC 入口，覆盖未开始、待审核、需补件、拒绝、通过等状态。
- 迁移数据读取层：Supabase 查询、Edge Function 调用、Realtime invalidation、链上只读调用和必要的缓存策略。
- 迁移可复用纯逻辑：资产映射、推荐链接、佣金 read model、积分格式化、合约 ABI、状态推导、错误分类。
- 适配移动平台能力：SecureStore、Clipboard、Share、Linking、WebBrowser / WebView、QR code、Safe Area、AppState、deep link。
- 保留或重建测试覆盖：纯逻辑单元测试、service adapter 测试、关键 screen / hook 测试、手动 iOS / Android QA 清单。

## 范围外

- 不重写 Supabase Edge Function、数据库 schema、RLS policy、KYC webhook、合约代码或后台运营系统，除非方案阶段发现移动端必须依赖的接口缺口并单独立项。
- 不将 Web 端 Tailwind / shadcn / Radix 组件直接移植到 React Native。
- 不在移动端实现 SEO、`Helmet`、浏览器 canonical / og meta、网页下载 fallback 或桌面表格布局。
- 不在客户端持有 Privy App Secret、Supabase service role key、JWT secret 或合约私钥。
- 不在客户端新增可信权限判断，不把钱包地址、email、URL 参数、本地缓存或前端角色状态作为数据放行依据。
- 不保证第一批实现一次性交付全部 C 范围；C 是最终迁移目标，实施计划必须拆成可验收阶段。
- 不支持移动端之外的新业务，如后台管理、艺术家上传、运营审核、合约部署、法币支付或多链扩展。

## 业务规则

- 移动端功能必须以后端 Supabase、Edge Function、RLS、KYC 服务和合约返回为可信来源；前端只负责展示、交互、输入校验和流程编排。
- 登录成功的定义是：Privy 登录成功、`wallet-login` 返回成功、客户端安全保存可用 session / access token、应用内 auth state 已建立。
- `wallet-login` 请求必须按已部署合约发送 JSON body `{ "privyToken": "<token>" }`；成功响应按顶层 `access_token`、`expires_in`、`user_status`、`user` 解析。
- 当 `wallet-login` 返回 `new` 或 `orphaned` 时，移动端必须调用 `register-user` 或进入恢复流程；不得绕过注册流程直接进入完整 Dashboard。
- 邀请参数必须支持 deep link / universal link 进入 App，并转化为注册 payload；如果已有用户使用邀请链接登录，应提示该邀请未被用于新用户注册。
- 已登录访问受保护页面时，应以本地 auth state 和 Supabase session 共同作为 UI 门禁；真实数据读取仍以后端 RLS 结果为准。
- KYC 是否可购买、是否白名单、是否可继续申请，以 Supabase KYC 数据和后端签名接口结果为准。
- 购买流程必须先请求后端签名，避免用户在不满足资格时浪费 approve 交易；链不匹配、KYC 未通过、钱包未绑定、余额不足、签名过期都必须有明确错误状态。
- 合约写操作必须由用户钱包签名完成；移动端不得代签或持有私钥。
- 内嵌钱包提现 / 转账必须遵守 passkey MFA 或后端配置的安全规则；不满足安全条件时禁用操作并解释原因。
- 登出必须清理 Privy 状态、Supabase auth state、本地安全存储、内存 auth state 和受保护数据缓存。
- 移动端不得明文日志输出 token、session、签名、私钥、KYC 敏感数据、服务端 secret 或完整身份证明材料。
- Realtime 订阅和链上轮询必须在 screen blur / unmount 后释放，避免后台耗电和重复请求。
- 列表页面必须使用虚拟化列表或分页策略，避免一次性渲染大量资产、交易、推荐或佣金记录。

## 状态模型

| 状态 | 可信来源 | 含义 | 允许流转 |
| ---- | -------- | ---- | -------- |
| `app_booting` | App 启动、SecureStore、Supabase auth restore | 正在恢复本地状态和必要配置 | `logged_out`、`authenticated`、`fatal_config_error` |
| `logged_out` | Auth workflow | 无有效登录状态，可浏览公开页面 | `privy_authenticating`、`app_booting` |
| `privy_authenticating` | Privy Expo SDK | 正在登录、连接钱包或取消登录 | `exchanging_session`、`logged_out`、`auth_failed` |
| `exchanging_session` | `wallet-login` Edge Function | 正在用 Privy token 换取应用身份 | `registration_required`、`authenticated`、`account_blocked`、`auth_failed` |
| `registration_required` | `wallet-login.user_status`、deep link payload | 新用户或孤儿账号需要注册 / 恢复 | `registering_user`、`orphaned_recovery`、`logged_out` |
| `registering_user` | `register-user` Edge Function | 正在完成用户资料和推荐关系注册 | `authenticated`、`auth_failed` |
| `orphaned_recovery` | `wallet-login.user_status`、用户选择 | 账号存在但缺少资料，需要用户确认恢复为投资者 | `registering_user`、`logged_out` |
| `authenticated` | Supabase token、auth state、用户对象 | 可进入受保护 tab 和本人数据页面 | `logging_out`、`session_expired`、`account_blocked` |
| `session_expired` | token 过期、Supabase 401、RLS 请求失败 | 本地会话不可继续使用 | `logged_out`、`privy_authenticating` |
| `account_blocked` | `wallet-login` / 后续接口 403 | 账号关闭或暂停，禁止进入受保护功能 | `logging_out` |
| `kyc_not_started` | `kyc_applications` 查询 | 用户未开始 KYC | `kyc_in_progress` |
| `kyc_in_progress` | KYC SDK / WebView、Supabase 状态 | 用户正在提交或补交 KYC | `kyc_pending`、`kyc_rejected`、`kyc_approved` |
| `kyc_pending` | Supabase KYC 状态 | 已提交，等待审核或正在审核 | `kyc_approved`、`kyc_rejected`、`kyc_resubmission_required` |
| `kyc_resubmission_required` | Supabase KYC 状态 | 需要用户补件 | `kyc_in_progress`、`kyc_rejected` |
| `kyc_rejected` | Supabase KYC 状态 | KYC 被拒绝 | `kyc_in_progress` |
| `kyc_approved` | Supabase KYC 状态 | 允许进入受 KYC 限制的购买流程 | `purchase_signing` |
| `purchase_idle` | 资产详情和钱包状态 | 购买表单可编辑或不可用 | `purchase_signing`、`purchase_blocked` |
| `purchase_blocked` | 链、KYC、钱包、sale 状态、后端签名接口 | 当前用户不能购买 | `purchase_idle` |
| `purchase_signing` | `generate-signature` Edge Function | 正在请求购买签名 | `purchase_approving`、`purchase_minting`、`purchase_failed` |
| `purchase_approving` | 钱包交易、USDT 合约 | 正在 approve USDT | `purchase_minting`、`purchase_failed` |
| `purchase_minting` | 钱包交易、资产合约 | 正在 mint 资产份额 | `purchase_confirming`、`purchase_failed` |
| `purchase_confirming` | 链上 receipt | 等待交易确认 | `purchase_success`、`purchase_failed` |
| `purchase_success` | 链上 receipt、后续数据刷新 | 购买成功，可刷新持仓和资产进度 | `purchase_idle` |
| `purchase_failed` | 钱包、链、后端签名、网络错误 | 购买失败或用户取消 | `purchase_idle` |
| `wallet_viewing` | Privy wallet、链上余额、Supabase profile | 钱包页正在展示余额和管理操作 | `wallet_transferring`、`wallet_security_blocked` |
| `wallet_security_blocked` | wallet type、passkey MFA、后端规则 | 钱包操作因安全条件不足被阻断 | `wallet_viewing` |
| `wallet_transferring` | 钱包交易 | 正在转账 / 提现 | `wallet_transfer_success`、`wallet_transfer_failed` |
| `logging_out` | 用户动作、Privy/Supabase/storage cleanup | 正在退出登录 | `logged_out`、`auth_failed` |
| `fatal_config_error` | 缺失公开配置或不兼容运行环境 | App 无法继续运行 | 无 |

## 权限和可信边界

- 谁可以读：未登录用户可读公开资产、公开市场、公开推荐规则和排行榜；已登录用户可读本人资料、KYC、持仓、推荐、积分、佣金、钱包绑定和 RLS 允许的数据。
- 谁可以写：移动端只能通过受控 Edge Function、Supabase RLS 或用户钱包签名发起写入；注册、推荐关系、KYC 状态、购买签名、佣金状态和钱包绑定都必须由服务端或合约最终判定。
- 可信判断所在层：身份映射、账号状态、角色、KYC、推荐资格、购买资格、签名发放、RLS、合约余额、allowance、mint 成功与否都在服务端 / 数据库 / 合约层。
- 前端职责：默认只负责展示和交互，除非方案明确允许，否则不做可信业务判断。
- 客户端不可信内容：钱包地址、email、Privy user id、deep link 参数、本地 storage、前端角色状态、前端 KYC 展示状态、前端计算的购买资格。
- Secret 边界：移动端只能持有 Expo public env、Privy App ID / Client ID、Supabase URL、publishable / anon key、公开合约地址和 ABI；不得包含 service role、JWT secret、Privy secret、签名私钥。
- 外部跳转边界：PancakeSwap、BscScan、Sumsub、WebBrowser / WebView、Share sheet 都是外部边界；进入前需要展示意图明确的用户动作，返回后需要重新读取可信状态。

## 数据来源

- 当前 React Native 项目：`/Users/rwa_start/LearnSource/MyTradeApp`，已有 Expo、Privy Expo、Supabase client、SecureStore、login workflow 和基础测试。
- Web 参考项目：`/Users/rwa_start/ProjectSource/ArtStarFront/src`，提供页面范围、业务规则、Supabase 查询、Edge Function 调用、合约 ABI、i18n 文案和测试参考。
- Supabase Edge Functions：`wallet-login`、`register-user`、`generate-signature`、`get-my-referrals` 以及 Web 端已有 hooks 使用的函数。
- Supabase 表 / 视图：`art_assets`、`artwork_submissions`、`investors`、`user_profiles`、`kyc_applications`、`referral_records`、`mint_events`、佣金 read model、钱包相关表等。
- Privy Expo SDK：登录、embedded wallet、外部钱包、passkey / MFA 能力、access token、wallet provider。
- 链上数据：BSC testnet / mainnet RPC、资产合约、USDT 合约、交易 receipt、BscScan / explorer。
- 移动平台能力：Expo SecureStore、Clipboard、Sharing、Linking、WebBrowser、AppState、SafeArea、WebView、QR component。
- 本地测试和 fixtures：应优先使用 deterministic fake Supabase、fake Privy、fake wallet provider、fake chain client，避免测试依赖真实网络和 secrets。

## 验收场景

| 场景 | Given | When | Then |
| ---- | ----- | ---- | ---- |
| 公开 Launchpad | 用户未登录，网络正常 | 打开 App 首页 | 展示平台统计、资产卡片、状态筛选和加载 / 空 / 失败状态，不要求登录 |
| 公开资产详情 | 用户点击资产卡片 | 进入资产详情 | 展示图片、基础信息、sale 状态、估值 / 规则、购买面板；购买按钮按登录、KYC、sale 状态禁用或引导 |
| Market 浏览 | 用户未登录或已登录 | 搜索、排序 Market 资产 | 展示 completed 资产列表，支持移动端搜索排序和外部交易链接 |
| 首次登录注册 | 用户从普通入口登录且 `wallet-login.user_status = new` | 完成 Privy 登录 | 客户端调用 `wallet-login` 和 `register-user`，成功后进入 authenticated Dashboard |
| 邀请注册 | 用户通过 deep link 带 `type` + `ref` 或 `invitation_token` 打开 App | 完成登录 | 注册 payload 写入 `register-user`，成功后推荐关系由服务端建立，用户进入 Dashboard |
| 孤儿账号恢复 | `wallet-login.user_status = orphaned` 且无注册 payload | 用户选择恢复为投资者 | 客户端调用 `register-user` 默认 investor payload，成功后进入 Dashboard |
| 账号被暂停 / 关闭 | `wallet-login` 或后续接口返回 `account_suspended` / `account_closed` | 用户尝试登录或刷新会话 | App 展示账号不可用状态，不进入受保护页面 |
| Dashboard | 用户已登录且 session 可用 | 打开 Dashboard | 展示资料、昵称、KYC 状态、持仓、交易、积分、推荐、佣金；数据请求受 RLS 限制 |
| KYC 未开始 | 用户已登录且无 KYC application | 点击开始 KYC | 打开移动端 KYC 流程，返回后刷新 Supabase 状态 |
| KYC 需补件 | Supabase KYC 状态为 `awaiting_resubmission` | 用户点击继续 KYC | 回到 KYC 流程并在提交后进入 pending / under review |
| Referral | 用户已登录且有 invite code | 分享邀请链接 | 移动端生成 deep link / web fallback 链接，复制或调用系统分享，不泄漏 token |
| Wallet 查看 | 用户已登录且有钱包 | 打开 Wallet | 展示地址、链、余额、绑定管理、二维码、复制和分享入口 |
| Wallet 安全阻断 | 用户使用 embedded wallet 且未满足 passkey MFA | 尝试提现 / 转账 | 操作被禁用，提示需要完成安全设置 |
| 转账成功 | 用户输入合法地址和金额且余额足够 | 确认转账并钱包签名 | 显示交易进行中、成功和 explorer 链接，刷新余额 |
| 购买成功 | 用户登录、KYC 通过、钱包已绑定、链正确、余额足够 | 在资产详情输入金额并确认 | 先请求签名，必要时 approve，再 mint；成功后刷新资产进度和持仓 |
| 购买失败 | 用户取消签名、链错误、KYC 未通过、余额不足、签名过期或后端拒绝 | 尝试购买 | 显示明确失败原因，不产生错误的 authenticated / success 状态 |
| Session 过期 | 本地 token 过期或 Supabase 返回 401 | 用户进入受保护页面或刷新数据 | 清理本地状态，回到登录或重新登录引导 |
| Realtime / 刷新 | 用户资料、KYC、推荐或佣金发生变更 | App 在相关 screen 活跃 | 对应 query invalidated 并刷新；screen 离开后订阅释放 |
| iOS / Android QA | App 分别在 iOS simulator / Android emulator 或真机运行 | 完成登录、浏览、KYC 入口、钱包、购买 dry-run / testnet | 两个平台无白屏、无布局遮挡、无 secret 日志，核心流程结果一致 |

## 风险和开放问题

- 阻塞：需要确认移动端 KYC 方案。Web 使用 `@sumsub/websdk-react`，React Native 需要选择 Sumsub 原生 SDK、WebView 流程或外部浏览器流程。
- 阻塞：需要确认 Privy Expo 当前是否支持本项目所需的钱包签名、embedded wallet、外部钱包切换、passkey MFA 和 EVM provider 能力；不足时需设计替代方案。
- 阻塞：需要确认购买 / 转账是否要求移动端首版真实上链，还是允许先做 testnet / dry-run / read-only 钱包。
- 非阻塞：C 范围很大，实施计划必须拆阶段；推荐先做 Auth/Register、Launchpad、Asset Detail、Market，再做 Dashboard / Referral / KYC，最后做 Wallet / Purchase / Transfer。
- 非阻塞：Web 端 `LanguageContext` 很大，移动端可以先支持中英 key 子集，再逐屏补齐。
- 非阻塞：Web 端部分表格在移动端需要改为 card / section list，不保持桌面表格外观。
- 非阻塞：Web 端 `wallet-login` 使用自签短期 JWT 且 refresh token 与 access token 同值，移动端方案需明确过期后重新登录还是复用 Web 行为。
- 非阻塞：Realtime 在移动端后台耗电风险较高，方案阶段需定义只在前台 active screen 订阅。
- 延后：运营后台、艺术家端、法币支付、多链扩展、推送通知和生产发布流水线可单独立项。

## 进入开发检查清单

- [x] 业务目标、范围内、范围外可以用一句话讲清楚。
- [x] 核心业务规则、状态模型、权限和可信边界没有歧义。
- [x] 数据来源明确，不依赖前端猜测。
- [x] 正常、空 / 失败 / 权限路径都有验收场景。
- [x] 开放问题已标记为阻塞、非阻塞或延后。
