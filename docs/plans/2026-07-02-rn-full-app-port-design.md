# 方案设计：React Native 全量 App 迁移

日期：2026-07-02
Feature slug：`rn-full-app-port`
状态：草稿

## 背景

现有 ArtStar Web 前端已经覆盖 Launchpad、Market、Dashboard、Referral、KYC、Wallet 和合约购买流程；当前 React Native 项目已完成 Privy / Supabase 登录基础，需要在移动端重建完整投资者体验。

## 推荐方案

采用“移动端重建 + 业务协议复用 + 分阶段交付”的方案。

UI 主题统一采用 [Tokenized Art Finance UI System](rn-full-app-port/ui-guidelines.md)：围绕 Web3 艺术品代币化金融方向设计，强调克制、高级、可信、资产感和链上感。后续每个移动端 screen、shared UI primitive 和 feature component 都必须优先使用该规范中的色彩、字号、间距、Header、Bottom Tab、Profile、Bottom Sheet 和禁止项。

核心路径：

1. 把 Web 项目的可复用逻辑抽象为移动端 domain / service：资产映射、推荐参数、佣金 read model、合约 ABI、状态推导和错误分类。
2. 在 React Native 中建立独立 UI kit、navigation、screen、workflow、service adapter 和 data hooks，不直接移植 Tailwind / shadcn / Radix / React Router。
3. 对外部依赖建立 adapter：Privy Expo、Supabase、Edge Function、Realtime、Viem chain client、KYC WebView / external browser、Clipboard / Share / QR。
4. 按阶段交付全量 C 范围：`Foundation + Auth/Register` -> `Public discovery` -> `Dashboard/Referral/KYC` -> `Wallet` -> `Purchase/Transfer`。

不做的替代范围：

- 不把 Web 端页面逐文件复制到 RN。
- 不在移动端新增后端可信逻辑。
- 不在第一批任务强行完成真实上链购买和转账；先建立 adapter、状态机和 testnet / dry-run 验证边界。

## Open Questions Resolution

| 需求中的开放问题 | 处理结论 | 是否阻塞开发 |
| ---------------- | -------- | ------------ |
| 阻塞：需要确认移动端 KYC 方案。Web 使用 `@sumsub/websdk-react`，React Native 需要选择 Sumsub 原生 SDK、WebView 流程或外部浏览器流程。 | Resolved for planning：首版采用 WebView / external browser adapter 打开现有 Sumsub 流程或后端生成的 KYC URL，返回 App 后重新查询 Supabase KYC 状态。原生 SDK 作为后续优化。 | No |
| 阻塞：需要确认 Privy Expo 当前是否支持本项目所需的钱包签名、embedded wallet、外部钱包切换、passkey MFA 和 EVM provider 能力；不足时需设计替代方案。 | Resolved for planning：所有钱包能力经 `walletProviderAdapter` 抽象。第一阶段只依赖已验证的登录和 token；链上读用 viem public client；写操作在 Wallet/Purchase 阶段验证 Privy Expo provider。若 provider 不满足，降级为外部钱包 deep link 或延后写操作。 | No |
| 阻塞：需要确认购买 / 转账是否要求移动端首版真实上链，还是允许先做 testnet / dry-run / read-only 钱包。 | Resolved：实施计划分阶段。公开页和 Dashboard 不阻塞；Wallet/Purchase 阶段必须先实现 dry-run / testnet 验证，再允许真实上链。生产上链需要人工门禁。 | No |
| 非阻塞：C 范围很大，实施计划必须拆阶段；推荐先做 Auth/Register、Launchpad、Asset Detail、Market，再做 Dashboard / Referral / KYC，最后做 Wallet / Purchase / Transfer。 | Resolved：采用五阶段实施，每阶段有独立验收和回滚边界。 | No |
| 非阻塞：Web 端 `LanguageContext` 很大，移动端可以先支持中英 key 子集，再逐屏补齐。 | Resolved：新增轻量 i18n catalog，按 screen 引入 key；缺失 key 在测试中暴露，不复制 1594 行 Web context。 | No |
| 非阻塞：Web 端部分表格在移动端需要改为 card / section list，不保持桌面表格外观。 | Resolved：移动端信息架构优先 card、section list、bottom sheet、segmented tabs；不要求像素复刻桌面表格。 | No |
| 非阻塞：Web 端 `wallet-login` 使用自签短期 JWT 且 refresh token 与 access token 同值，移动端方案需明确过期后重新登录还是复用 Web 行为。 | Resolved：客户端存储 `accessToken` 和 `expiresAt`；Supabase RLS 请求通过 auth adapter 附带 bearer token。过期后重新走 Privy -> `wallet-login`，不伪造长期 refresh。 | No |
| 非阻塞：Realtime 在移动端后台耗电风险较高，方案阶段需定义只在前台 active screen 订阅。 | Resolved：Realtime adapter 只在 AppState active 且 screen focused 时订阅；blur / background 释放，并通过 query invalidation 刷新。 | No |
| 延后：运营后台、艺术家端、法币支付、多链扩展、推送通知和生产发布流水线可单独立项。 | Deferred：本方案不包含。 | No |

## Decision Notes

| 决策 | 原因 | 影响 |
| ---- | ---- | ---- |
| 使用 React Native 原生 screen 重建，不直接迁移 Web JSX / CSS | Web 依赖 DOM、Tailwind、Radix、React Router 和浏览器 API | UI 工作量更大，但移动端可维护、可测试 |
| 数据和外部系统全部通过 adapter | Privy Expo、Supabase、KYC、chain provider 在移动端能力差异大 | 后续可替换具体实现，不污染 screen |
| 首版 KYC 使用 WebView / browser adapter | Sumsub Web SDK 已存在，原生 SDK 选型会拖慢主线 | UI 体验可能不如原生，但可快速闭环状态 |
| 链上读写拆开 | 链上读取可用 viem public client；写操作依赖钱包 provider 能力 | Launchpad / Dashboard 可先上线，购买和转账独立验收 |
| `wallet-login` session 不模拟 refresh token | 后端返回短期自签 JWT，移动端不应制造虚假的长期 session | 过期后重新登录，避免错误 session 续期假象 |
| Realtime opt-in by focused screen | 移动端后台订阅耗电且易重复 | 数据可能不是全局实时，但活跃页面一致性可控 |

## 分层边界

- UI：`src/features/*/screens`、`src/features/*/components` 只负责布局、输入、展示、手势和调用 hooks / actions；不得直接拼 Edge Function URL、解析 HTTP status、写 SecureStore 或发合约交易。
- Workflow / service：`src/features/*/workflow` 负责状态机、流程编排、错误归一和回滚；`src/features/*/services` 负责 API / chain / storage adapter。
- Data / external provider：`src/lib/supabase`、`src/lib/chain`、`src/app/providers`、`src/features/*/data` 封装 Supabase、Realtime、Privy、KYC、wallet provider、Linking / Share 等副作用。

## Mobile Navigation Architecture

当前 Task 1 的 `AppNavigator` 只能作为临时 foundation shell，不作为最终导航 UI。正式移动端导航必须按投资工具型 App 规划，避免把业务入口堆在一个卡片或登录页中。

### 信息架构

- `PublicStack`：未登录用户可进入公开信息流。
  - `Launchpad`：默认首页，展示公开资产、状态筛选和平台摘要。
  - `Market`：已完成资产的公开市场浏览。
  - `AssetDetail`：资产详情，购买动作按登录 / KYC / sale 状态引导。
  - `ReferralPublic`：公开推荐规则和排行榜。
  - `Login`：由 header 按钮、受保护动作或 session 失效触发，不嵌在首页内容流中。
- `MainTabs`：登录前后共享的底部主导航，使用 5 个底部 tab。
  - `Launchpad`：公开首页，展示公开资产、状态筛选和平台摘要；未登录可访问。
  - `Market`：公开市场资产、搜索和排序；未登录可访问。
  - `Referral`：公开推荐规则和排行榜；未登录可访问。
  - `Dashboard`：登录后工作台，展示 KYC 摘要、持仓摘要和待办；未登录点击触发登录。
  - `My`：公开可进入的个人中心入口，承载 Wallet、KYC、邀请好友、Settings、Logout；具体受保护动作后续按登录态拦截。
- 流程型页面不放入底部 tab：Purchase、Transfer、KYC launcher、Asset purchase panel 使用 stack detail、sheet 或 modal。

### 导航和视觉原则

- 顶部 header 必须紧凑：页面标题、登录 / 钱包状态、必要的右侧图标动作；不得用营销 hero 占据首屏。
- 底部 tab 使用稳定尺寸和明确图标 + 短标签；`Launchpad`、`Market`、`Referral`、`My` 未登录可访问，`Dashboard` 未登录触发登录；Wallet、KYC、邀请好友、Settings 等二级入口收纳到 `My`。
- 未登录首页优先展示资产发现，不把登录卡片放在内容主流里；登录作为明确按钮或受保护动作触发。
- 已登录首页是工作台，不是欢迎页；优先呈现 KYC 状态、持仓、待处理动作和资金相关摘要。
- 卡片仅用于资产、持仓、交易、KYC 状态、推荐记录等独立信息单元；禁止页面 section 套大卡、卡片套卡片。
- 列表页使用 FlatList / SectionList、固定图片比例、稳定 row height 或明确 skeleton，避免滚动抖动。
- 页面文案和控件密度按金融 / 投资操作工具处理：克制、可扫描、少装饰，不使用大面积品牌渐变或纯装饰背景。

### 代码边界

- `src/app/navigation/navigationState.ts` 只放 route registry、route access、initial route、tab metadata 等纯逻辑。
- `src/app/navigation/AppNavigator.tsx` 只组合 main tabs、auth gate 和 root fallback；不写业务 screen 内容。
- `src/app/navigation/components/*` 可放 `AppHeader`、`BottomTabBar`、`RoutePlaceholder` 等导航组件。
- 真实业务页面仍放在 `src/features/*/screens`；导航组件只接收 route metadata 和 action，不直接请求数据。
- 后续每个 feature task 只能把自己的 screen 注册到既有导航结构，不能重新发明一套独立导航。

## 代码结构边界

- 入口层：`App.tsx`、`src/app/AppRoot.tsx`、navigation container 只挂 Provider、注册 navigation、展示 root fallback。
- 领域逻辑层：资产、认证、注册、KYC、推荐、钱包、购买各自有纯函数和状态机；纯逻辑不得 import React Native、Supabase client、Privy SDK 或真实网络。
- 数据或外部系统边界：
  - `authExchangeClient` / `registrationClient`：Edge Function 请求和响应解析。
  - `assetRepository`：公开资产和市场查询。
  - `profileRepository` / `dashboardRepository`：已登录用户数据读取。
  - `chainReadClient`：viem public client 读链。
  - `walletProviderAdapter`：Privy Expo 钱包和交易签名能力。
  - `kycAdapter`：WebView / WebBrowser 打开 KYC 流程，返回后刷新状态。
  - `platformAdapter`：Clipboard、Share、Linking、QR、AppState。
- 新增行为注册方式：对链、KYC、wallet provider 使用 adapter map / strategy；对 screen 使用 navigation route registry；对错误码使用 classifier map。
- 避免的结构漂移：禁止 screen 里直接 `fetch`、`supabase.from(...).insert/update/delete`、`writeContract`、`SecureStore`、`Linking.openURL`；禁止把 Dashboard、Wallet、AssetDetail 做成单个超大文件；禁止复制 Web `LanguageContext` 巨型文件。

## 模块内聚与可测试性

- 主要模块及职责：
  - `app/navigation`：public tab、protected tab、auth gate、deep link route。
  - `features/auth`：Privy 登录、wallet-login、session、logout、account blocked。
  - `features/registration`：deep link 参数、register-user、orphaned recovery。
  - `features/assets`：Launchpad、Asset Detail、Market、asset data mapping、sale status。
  - `features/dashboard`：profile、holdings、transactions、points、commissions summary。
  - `features/referral`：invite links、leaderboard、my referrals、share flows。
  - `features/kyc`：KYC status、KYC launcher、post-return refresh。
  - `features/wallet`：wallet list、active wallet、balances、QR/share、transfer.
  - `features/purchase`：eligibility、signature、approve、mint、receipt.
  - `lib/chain`：chain config、ABI、public client、explorer URL。
  - `lib/i18n`：small catalog + typed lookup。
- 核心逻辑测试方式：状态机、映射函数、error classifier、URL / deep link parser、contract call builder、payload builder 使用 Vitest 和 fake adapters；screen 使用 react-test-renderer / RN testing library 只验证状态和关键控件。
- 副作用边界：请求在 service adapter；写入在 repository / workflow；订阅在 realtime adapter；导航在 navigation gate；全局状态只在 provider / store。
- 隐式依赖：时间通过 `now()` 注入；网络通过 `fetch` / repository 注入；环境变量集中在 config module；storage 通过 SecureStore adapter；AppState / focus 通过 hooks 注入。

## 数据流

1. App 启动读取 public config，初始化 PrivyProvider、QueryClient、Supabase client、navigation 和 SecureStore session restore。
2. 未登录用户进入 public navigation，可读 Launchpad、Asset Detail、Market、Referral 公开数据。
3. 用户登录时，Privy Expo 返回 access token，`authWorkflow` 调用 `wallet-login`，解析 `access_token`、`expires_in`、`user_status`、`user`。
4. 若用户状态是 `new` / `orphaned`，`registrationWorkflow` 使用 deep link payload 或默认 investor payload 调用 `register-user`，成功后刷新 auth user。
5. Auth provider 保存 access token、expiresAt、user 和 session state；受保护数据 repository 使用该 token 发 Supabase / Edge Function 请求。
6. Asset 数据从 Supabase `art_assets` / `artwork_submissions` 读取，链上 sale / balance / allowance 通过 `chainReadClient` 补齐。
7. Dashboard / Referral / KYC 读取 Supabase 表、read model 或 Edge Function；active screen 可以注册 Realtime invalidation。
8. KYC flow 打开 WebView / external browser，返回 App 后重新查询 `kyc_applications`。
9. Purchase flow 请求 `generate-signature`，使用 wallet provider approve / mint，等待 receipt 后刷新 asset、holdings、transactions。
10. Wallet transfer 使用 wallet provider 发送 native / ERC20 transfer，等待 receipt 后刷新 balances。
11. Logout 清理 Privy、Supabase auth、SecureStore、QueryClient protected caches 和 navigation state。

## 状态与实时行为

- 可信来源：auth 以 `wallet-login` 和本地 session 为来源；profile / KYC / referral / dashboard 以 Supabase / Edge Function 为来源；sale / balance / allowance / receipt 以链上为来源。
- 状态模型：沿用需求中的 auth、registration、kyc、purchase、wallet 状态枚举。实现时拆成多个小状态机，不做一个全局巨型状态机。
- 非法流转：
  - `logged_out` 不可直接进入 protected screen。
  - `privy_authenticating` 不可直接进入 `authenticated`，必须经过 `wallet-login`。
  - `registration_required` 不可直接进入 Dashboard，必须完成 `register-user` 或进入 `orphaned_recovery`。
  - `kyc_not_started` / `kyc_pending` / `kyc_rejected` 不可进入真实 purchase write flow。
  - `purchase_idle` 不可跳过 `purchase_signing` 直接 approve / mint。
  - `wallet_security_blocked` 不可发起 transfer。
- 缓存 / 刷新 / webhook / realtime：
  - 使用 TanStack Query 或等价 query cache 管理服务端数据。
  - Realtime 只用于 user profile、KYC、referral、commission 等已登录数据 invalidation。
  - Webhook 不在客户端处理；KYC webhook 和链上 indexer 由服务端负责，客户端只读最终状态。
  - 链上读取使用短 stale time；screen blur 后停止高频刷新。

## 代码规则适用性

| 规则 | 适用 / 不适用 | 约束或决策 |
| ---- | ------------- | ---------- |
| 状态机 / 可信边界 / 副作用 | 适用 | 多个小 workflow 状态机；screen 不做可信判断，不直接发副作用 |
| 数据访问 / 性能 / 测试追踪 | 适用 | repository + query cache；FlatList / SectionList；每个验收场景映射到测试或 QA |
| 配置密钥 / 兼容回滚 | 适用 | Expo public env 集中读取；无 secret；阶段性 route 可关闭回滚 |
| Webhook 幂等性 | 客户端不适用 | 客户端不处理 webhook，只读 webhook 后状态 |
| 合约写入 | 适用 | testnet / dry-run 先行；真实上链需人工门禁 |

## 失败模式

| 失败情况 | 用户影响 | 处理方式 |
| -------- | -------- | -------- |
| 缺少 public env | App 无法启动核心功能 | 显示 `fatal_config_error`，不继续登录或请求 |
| Privy 登录取消 / 失败 | 无法登录 | 回到 logged_out，展示可重试错误，不调用后端 |
| `wallet-login` 401 / 403 / 5xx | 登录失败或账号阻断 | 401 清理状态；403 account_blocked；5xx 可重试 |
| `register-user` 失败 | 新用户不能进入 Dashboard | 保持 registration_required / auth_failed，展示错误 |
| session 过期 | 受保护数据不可读 | 清理 token，跳回登录或重新登录引导 |
| Supabase RLS 拒绝 | 数据空或报错 | 展示权限 / 重新登录提示，不用本地 userId 放行 |
| Realtime 连接失败 | 数据不会即时刷新 | 保持 query stale refresh 和手动刷新 |
| KYC WebView / browser 返回失败 | 无法提交 KYC | 提示重试，返回后重新查询 Supabase 状态 |
| Privy Expo 无可用 EVM provider | 无法购买 / 转账 | 降级为 read-only wallet 或外部钱包提示；写操作保持 disabled |
| 链错误 / RPC 失败 | 资产状态或余额不准确 | 展示链错误和重试，不允许交易 |
| 用户拒签 | 购买 / 转账失败 | 标记 cancelled，不当作系统错误 |
| 交易 pending 过久 | 用户不确定结果 | 显示 tx hash 和 explorer 链接，允许后台刷新 |
| 低端设备列表卡顿 | App 体验下降 | 使用 FlatList、分页、memoized row、图片尺寸限制 |

## 权限与安全

- 谁可以读 / 写：公开数据无需登录；本人数据必须已登录并由 Supabase RLS / Edge Function 返回；写入必须通过受控 Edge Function、RLS 或用户钱包签名。
- 可信判断所在层：账号、角色、KYC、推荐、签名、购买资格、余额、allowance、receipt、RLS 均不由前端最终判断。
- Secret / token 处理：不记录原始值；token 存 SecureStore；日志和错误 details 不包含 token、signature、KYC 原始材料、secret。
- 前端参数：deep link、钱包地址、email、selected type 只能作为请求输入，后端必须再次验证。
- 数据写入：客户端禁止直接对敏感表进行 insert / update / delete；注册、KYC、签名、推荐、钱包绑定等走既有服务层。
- 合约安全：交易参数在发送前做本地格式校验，但最终以合约和后端签名为准；生产真实上链需要手动 QA 和人工门禁。

## 备选方案

| 方案 | 决策 | 原因 |
| ---- | ---- | ---- |
| 逐文件复制 Web 项目到 RN | Rejected | DOM / CSS / Radix / Router / wagmi Web provider 不兼容，维护成本高 |
| 用 React Native WebView 包整个 Web App | Rejected | 无法获得原生钱包、SecureStore、分享、性能和 App Store 体验优势 |
| 先只做 MVP，不保留全量 C 范围 | Rejected as final scope, Accepted as phase strategy | 用户选择 C；但实施必须分阶段 |
| 服务端新增 mobile BFF 聚合接口 | Deferred | 可降低客户端复杂度，但当前需求不修改后端；若 Dashboard 性能差再立项 |
| 原生 Sumsub SDK | Deferred | 体验更好，但选型和集成成本高；先用 WebView / browser adapter |

## 评审决策记录

| 日期 | 决策 | 原因 | 影响 |
| ---- | ---- | ---- | ---- |
| 2026-07-02 | C 范围作为最终迁移目标，但分阶段交付 | 用户选择全量移动复刻，需求风险高 | 实施计划必须拆阶段，不能一次性编码 |
| 2026-07-02 | 移动端优先 adapter 化外部能力 | Privy / KYC / chain 写能力存在移动差异 | 降低后续替换成本 |
| 2026-07-02 | 购买和转账真实上链后置 | 高风险涉及资金、钱包签名和合约 | 先完成 read / dry-run / testnet，再人工放行 |

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
