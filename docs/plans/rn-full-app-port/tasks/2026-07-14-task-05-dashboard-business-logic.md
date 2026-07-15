# Task 5：Dashboard 业务逻辑与依赖梳理

来源：[rn-full-app-port implementation](../../2026-07-02-rn-full-app-port-implementation.md)

Web 参考页面：`/Users/rwa_start/ProjectSource/ArtStarFront/src/pages/Dashboard.tsx`

本文从 Web Dashboard 页面向下追踪 hooks、domain helpers、Supabase 表 / view / RPC、Edge Function、链上读取和认证依赖，用于确定 React Native Task 5 的实现边界。本文只整理业务逻辑和迁移契约，不实现代码。

## 1. Task 5 业务目标

已登录且 Supabase session 可用的投资者进入 Dashboard 后，可以查看：

- 用户身份摘要和昵称。
- 总资产、总收益、收益率。
- 当前等级和积分总额。
- KYC 状态摘要。
- 当前链上持仓。
- 平台购买交易记录。
- 积分与佣金只读摘要。

Task 5 不执行以下操作：

- 不启动或提交 KYC；完整 KYC launcher、补件和返回刷新归 Task 7。
- 不实现邀请链接、推荐列表、排行榜和分享；完整 Referral 归 Task 6。
- 不确认佣金 payout；`confirm-payout` 是资金状态写操作，须在 Task 6 或独立受控任务中实现。
- 不执行购买、转账或其他链上写操作。
- 不修改数据库 schema、RLS、Edge Function 或合约。

## 2. Web 页面信息架构

Web Dashboard 的顶层结构为：

1. 未连接钱包状态。
2. 页面标题、身份和昵称编辑。
3. Summary 区：
   - 总资产。
   - 总收益和收益率。
   - 当前等级和总积分。
   - KYC 状态。
4. Holdings tab。
5. Transactions tab。
6. Whitelist / KYC tab。
7. Referral rewards tab。

RN 不应复制 787 行单页组件。Dashboard screen 只组合 section components 和 screen-level loading/error 状态；查询、链读取和计算分别放入 repository、adapter 和 domain mapper。

## 3. 直接依赖图

```text
Dashboard.tsx
  -> AuthContext / useWallet
  -> useUserProfile
       -> user_profiles
       -> Realtime UPDATE invalidation
  -> useUpdateNickname
       -> update_my_nickname RPC
  -> usePrivyEmailLoginAutoNickname
       -> Privy linked email / wallet state
  -> useHoldings
       -> useMintEventsByWallet
            -> mint_events
            -> art_assets
            -> artwork_submissions
       -> useChainHoldings
            -> art token balanceOf(wallet)
            -> art token priceUSDT()
            -> USDT decimals()
  -> useKycStatus
       -> kyc_applications
  -> useKycApplicantDetails
       -> kyc-applicant-details Edge Function
  -> ReferralPanel
       -> useUserProfile
       -> useMyPointTransactions
       -> useMyReferrals
       -> useMyCommissions
            -> my_commission_summary view
            -> my_commission_details view
            -> referral_commissions fallback
            -> get-my-referrals Edge Function
       -> useConfirmPayout
            -> commission-user Edge Function
```

## 4. 认证与页面访问

### Web 行为

相关文件：

- `/Users/rwa_start/ProjectSource/ArtStarFront/src/contexts/AuthContext.tsx`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useWallet.ts`

Web 页面把 `authenticated && walletAddress` 视为 Dashboard 的可展示条件。Privy token 先交换为 Supabase JWT，Supabase session 就绪后才允许 RLS 查询。

关键状态：

- `authenticated`：Privy 已登录。
- `user`：`wallet-login` 返回的业务用户。
- `isSessionReady`：Supabase JWT 已设置且可以执行 RLS 查询。
- `walletAddress`：当前 Privy 账户关联的钱包，不接受浏览器中未关联的钱包。

### RN 迁移规则

- Dashboard route 保持 `requiresAuth = true`。
- 只有 auth workflow 状态为 `authenticated` 且 Supabase session 已恢复后才启动私有查询。
- 用户 id、email、wallet address 必须来自已验证的 auth exchange/session，不得从 route 参数或本地输入推断。
- 当前 RN 已能将 `wallet-login` JWT 写入 Supabase session；Task 5 需要把经过认证的 user id、email 和 wallet address 暴露为只读 viewer context。
- session 失效或 RLS 返回 401/403 时进入 auth error / re-login 状态，不把所有区域误显示为空数据。
- Data API exposure/GRANT 与 RLS 是两层独立门禁；目标环境必须同时允许 `authenticated` 访问相关表/view，并通过 ownership policy 限制到本人数据。

## 5. 用户资料、等级、积分与昵称

### 数据源：`user_profiles`

Web 查询字段：

```text
id
user_type
tier
referral_points
trading_points
reputation_points
task_points
total_points
invite_code
nickname
```

查询条件：

- `id = auth.uid()`。
- session 未就绪时禁用查询。
- stale time 为 60 秒。
- Web 订阅 `user_profiles UPDATE` 并 invalidates profile query；RN 首版可先提供手动 refresh，Realtime 统一在 Task 11 接入。

数值规则：

- 所有 points 字段将数据库值转为有限 number，null/非法值归零。
- `total_points` 支持小数，默认最多显示 2 位小数。
- 等级为 `S / A / B / C / D`，无值时 UI fallback 为 D，但 domain model 应保留后端原始状态，避免把缺失数据当作真实等级。

### 昵称写入：`update_my_nickname` RPC

相关文件：

- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useUpdateNickname.ts`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/components/dashboard/NicknameInlineEdit.tsx`
- `/Users/rwa_start/ProjectSource/ArtStarFront/supabase/migrations/014_extend_nickname_length.sql`

规则：

- 客户端 trim 输入。
- 空字符串不提交。
- 与当前昵称相同不提交。
- 最大 254 个 Unicode code points。
- 最终校验在 security-definer RPC：要求 `auth.uid()`、非空、长度不超过 254、当前用户 profile 存在。
- 成功后刷新 profile；失败保留原值并显示错误。
- RN screen 不直接 update `user_profiles`。
- 该 RPC 是 `SECURITY DEFINER`，虽然函数体检查 `auth.uid()` 且固定空 `search_path`，仍需确认 EXECUTE 权限仅开放给预期角色，并验证 anon 调用无法产生写入。

Web 的邮箱自动昵称逻辑依赖 Privy 登录瞬间的 linked accounts 和 embedded wallet 生成时序。Task 5 首版可以保留手动昵称编辑；自动昵称仅在 RN Privy Expo 能提供等价、稳定事件时启用，不得根据未验证 email 参数自动写入。

## 6. Holdings 数据流

### 6.1 成本和交易来源：`mint_events`

相关文件：

- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useMintEventsByWallet.ts`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useArtAssets.ts`

查询条件：

```text
buyer_wallet = lower(current wallet address)
is_deleted = false
order by block_timestamp desc
```

查询同时关联：

```text
mint_events
  -> art_assets by asset_id
      -> artwork_submissions by submission_id
```

所需字段：

```text
mint_events:
  id
  asset_id
  tx_hash
  shares
  amount_usdt
  block_timestamp

art_assets:
  id
  symbol
  contract_address
  chain_id
  token_price_usdt
  total_supply
  sale_start
  sale_end
  status
  participants

artwork_submissions:
  name
  name_en
  artist_name
  artist_name_en
  image_urls
```

RLS 边界：`mint_events` 只允许本人 investor id、本人 wallet 或管理员读取。查询返回空数组可能表示无交易，也可能表示 session/身份映射错误；repository 必须把 RLS/认证错误与真实 empty 分开。

### 6.2 成本基础计算

按 `asset_id` 聚合所有非删除购买事件：

```text
totalUsdt = sum(amount_usdt)
totalShares = sum(shares)
avgBuyPrice = totalShares > 0 ? totalUsdt / totalShares : 0
```

注意：

- Web 使用 JavaScript number；RN domain 应优先使用 decimal string/Decimal helper，最后展示时再转格式，避免大额或高精度份额丢失。
- `mint_events` 只代表平台索引到的购买成本，不代表钱包全部来源。
- 二级市场转入或外部转账可能有链上余额但没有成本记录。

### 6.3 链上当前持仓和价格

相关文件：

- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useChainHoldings.ts`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/lib/contracts.ts`

对每个有合约地址的资产读取：

- `balanceOf(walletAddress)`：18 decimals，得到当前份额。
- `priceUSDT()`：使用 USDT decimals 格式化，得到当前价格。
- USDT `decimals()`：默认 fallback 为 6。

RN 必须复用 `src/lib/chain/publicChainRegistry.ts` 和 read-only adapter，不在 screen 或 hook 中复制 ABI、RPC URL、chain id 或 USDT 地址。

每个资产必须按自身 `chain_id` 分组读取。Web 的 `useChainHoldings` 使用当前 active wallet chain 读取所有合约，遇到多链资产时可能读错链；RN 不应复制这个缺陷。

### 6.4 Holdings 合并规则

```text
currentShares = on-chain balanceOf
currentPrice = on-chain priceUSDT
value = currentShares * currentPrice
gainPercent = avgBuyPrice > 0
  ? (currentPrice - avgBuyPrice) / avgBuyPrice * 100
  : null
```

过滤规则：

- 只展示 `currentShares > 0` 的资产。
- 有链上余额但没有 mint event 时必须保留 holding，`gain = null`，显示 N/A。
- Web 只从 mint event 的 asset ids 构造候选资产，因此不能发现完全由外部转入的资产。RN 首版若沿用该限制，必须在 UI/文档中说明；要完整发现外部持仓需后端钱包资产索引或可信资产全集扫描，另行评估性能。

组合汇总：

```text
totalValue = sum(holding.value)
totalInvested = sum(currentShares * avgBuyPrice)
totalPnL = totalValue - totalInvested
pnlPercent = totalInvested > 0 ? totalPnL / totalInvested * 100 : 0
```

`totalInvested` 使用当前余额乘历史均价，不是历史累计投入总额；用户卖出或转出后，该算法只估算剩余仓位成本。

## 7. Transactions 业务逻辑

交易列表直接来自 `mint_events`，当前只支持购买：

```text
type = buy
asset = asset symbol
shares = parsed shares
total = amount_usdt
price = shares > 0 ? total / shares : 0
txHash = tx_hash
timestamp = block_timestamp
```

规则：

- 按区块时间倒序。
- tx hash 外链根据资产 `chain_id` 生成 BscScan URL；不能仅依赖全局默认链。
- 外链必须通过 RN external link adapter，拒绝无效或非 HTTPS URL。
- Task 5 不伪造 sell 记录；后端没有 sell/indexer 数据时只显示 buy。

## 8. KYC 摘要边界

### Task 5 范围

Task 5 只读取 `kyc_applications` 最新非删除记录并显示摘要：

```text
status
reviewed_at
reason_code
notes
```

状态集合：

- null：未开始。
- pending：已开始或等待提交完成。
- under_review：审核中。
- awaiting_resubmission：需要补件。
- rejected：拒绝。
- approved：通过。

`kycApproved = status === approved`，但这只是展示 read model；购买资格最终仍由后端签名接口判定。

### 延后到 Task 7

- `KycFlow` / Sumsub UI。
- KYC launcher 和 WebView/browser adapter。
- 返回 App 后刷新。
- `kyc-applicant-details` Edge Function。
- 姓名、国家、证件类型、证件号、生日等敏感信息展示。

Task 5 不读取或日志输出完整 KYC 证件信息。

## 9. Points、Referral 与 Commission 边界

### Task 5 范围

- 从 `user_profiles` 展示 tier 和 total points。
- 可读取 `point_transactions` 最近 50 条作为只读列表/摘要。
- 可读取 commission summary 和少量最近明细作为只读摘要。
- 所有金额字段统一转为有限 decimal/number，null 归零。

### Task 6 范围

- 完整 ReferralPanel。
- 邀请码、invite link、复制和系统分享。
- 推荐记录列表。
- 积分流水完整页面。
- 佣金明细完整页面。
- tier benefits。
- payout 确认写操作及其幂等/资金状态门禁。

### Commission read model

相关文件：

- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useMyCommissions.ts`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/lib/commissionReadModel.ts`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/types/referral.ts`

首选读取：

- `my_commission_summary` view。
- `my_commission_details` view，按 `updated_at desc`。

summary 字段：

```text
review_pending_total_usdt
user_confirmation_pending_total_usdt
payment_pending_total_usdt
paid_total_usdt
disputed_total_usdt
lifetime_total_usdt
referred_buyer_count
referred_mint_total_usdt
```

如果 view 不存在且错误为 `PGRST205 / 42P01 / relation does not exist`，Web 回退读取 `referral_commissions` 并在客户端聚合。其他错误不得静默降级。

fallback 聚合规则：

- `pendingAmount = pending_usdt + kol_bonus_usdt + golden_bonus_usdt`。
- `settledAmount = settled_usdt + kol_bonus_settled + golden_bonus_settled`。
- disputed/suspicious 进入 disputed total。
- settled 进入 paid total。
- 其他状态进入 review pending total。
- fallback 无法恢复 payout 状态、referred mint total 等完整字段，必须显式标记为降级数据。

后端缺口：ArtStarFront 当前 migrations 中没有找到两个 commission view 的定义；生成类型和外部管理平台文档声称它们存在。Task 5 开发前必须在目标 Supabase 环境确认 view 字段、授权和 RLS，不能只信任过期生成类型。

当前生成类型也与 Hook 读取契约不一致：生成类型中的 summary 仍是 `pending_total_usdt / settled_total_usdt`，而 Hook 期望 review、user confirmation、payment、paid、disputed 等新字段；details 生成类型也缺少部分 payout 字段。这是明确的 schema/type drift，必须从目标环境重新生成或人工确认契约。

Supabase view 默认可能使用 view owner 权限而绕过底表 RLS。目标 view 必须确认使用 `security_invoker = true`，或通过受控 schema/显式 revoke 限制访问；不能仅因为底表有 RLS 就认为 view 自动安全。

## 10. Loading、empty 和 error 状态

Dashboard 应按 section 局部降级：

| 区域 | Loading | Empty | Error |
| --- | --- | --- | --- |
| Profile | nickname/points skeleton | 身份 fallback | session/RLS error |
| Holdings | summary + rows skeleton | 暂无持仓 | 链读取或 mint event 局部错误 |
| Transactions | rows skeleton | 暂无交易 | mint event 查询错误 |
| KYC summary | status skeleton | 未开始 KYC | 状态暂不可用 |
| Points | summary skeleton | 0 points / 无流水 | profile/ledger 局部错误 |
| Commission | summary skeleton | 0 summary | read model unavailable/error |

主阻塞错误：

- auth/session 不可用。
- 当前用户 profile 无法按 RLS 读取。

局部错误不应让整个 Dashboard 白屏。链读取失败时仍可展示 profile、points 和数据库交易；commission view 失败时仍可展示 holdings。

## 11. RN 建议架构

```text
features/dashboard/
  domain/
    dashboardModels.ts
    holdings.ts
    commissionReadModel.ts
    nickname.ts
  services/
    dashboardProfileRepository.ts
    dashboardHoldingsRepository.ts
    dashboardPointsRepository.ts
    dashboardCommissionRepository.ts
    dashboardChainReadAdapter.ts
    createDefaultDashboardLoader.ts
  components/
    DashboardSummary.tsx
    HoldingsSection.tsx
    TransactionsSection.tsx
    KycSummary.tsx
    PointsSummary.tsx
    CommissionSummary.tsx
  screens/
    DashboardScreen.tsx
  __tests__/
```

聚合流程：

```text
DashboardScreen
  -> DashboardLoader(viewer)
       -> profile repository
       -> mint events / asset metadata repository
       -> chain holdings adapter grouped by chain id
       -> KYC summary repository
       -> points repository
       -> commission read model repository
  -> pure domain mappers
  -> independent section read models
```

禁止：

- Screen 直接调用 Supabase、fetch、Privy 或 viem。
- Screen 内计算成本基础、PnL 或 commission totals。
- 直接更新敏感表。
- 把客户端钱包地址当作授权依据；RLS 仍以 auth session 为可信边界。
- 使用浮点数处理链上 raw bigint 或高精度数据库金额。
- 把 KYC 展示状态当作最终购买资格。

## 12. 建议实施切片

### Task 5A：Viewer contract、Profile 和 Nickname

- 扩展 RN auth viewer read model：user id、email、wallet address、session-ready。
- profile repository。
- points/tier formatter。
- nickname validation 和 `update_my_nickname` RPC adapter。

### Task 5B：Holdings 和 Transactions

- mint events + asset metadata repository。
- 按 chain id 分组的 balance/price adapter。
- cost basis、holdings、PnL 纯函数。
- tx explorer URL mapper。

### Task 5C：KYC、Points 和 Commission 摘要

- KYC status summary only。
- point transactions read-only。
- commission view mapper 和受控 fallback。
- 验证目标环境 view/RLS 契约。

### Task 5D：Dashboard UI 和集成

- 替换 `AppNavigator` 中的 Dashboard placeholder。
- 移动端 section/card/list 布局。
- refresh、loading、empty、local error、session expired 状态。
- iOS/Android viewport QA。

## 13. 关键测试清单

- auth/session 未 ready 时不发私有查询。
- profile numeric/null normalization。
- nickname trim、相同值、空值、254 长度边界。
- mint events 按 wallet lowercase 过滤。
- cost basis 多笔购买聚合。
- 零 shares 防除零。
- 有链上余额但无成本记录时 gain 为 null。
- 多链资产按各自 chain id 读取。
- 合约无地址、RPC 失败和单资产失败局部降级。
- totalValue、totalInvested、totalPnL、pnlPercent。
- tx URL 使用对应 chain explorer。
- KYC 全状态映射。
- commission view 映射、缺 view fallback、其他错误不 fallback。
- RLS/401 进入 auth error，真实空数据进入 empty。
- Dashboard route 只允许 authenticated 用户。

## 14. 开发前确认项

1. 目标 Supabase 环境是否存在 `my_commission_summary` 和 `my_commission_details`，字段是否与 Web mapper 一致。
2. commission views 是否为 security-invoker，且 Data API GRANT/RLS 不会暴露其他用户佣金。
3. `user_profiles`、`point_transactions`、`kyc_applications`、`referral_commissions` 的 Data API exposure、authenticated GRANT 和 SELECT RLS 是否允许本人读取。
4. RN auth context 是否可以稳定提供 user id、email、wallet address 和 session-ready。
5. 是否接受首版 holdings 只发现有平台 mint event 的资产；若不接受，需要新的钱包资产索引方案。
6. Task 5 是否只显示 commission/points 摘要，完整列表和 payout 写操作继续归 Task 6。
7. KYC 证件详情继续归 Task 7，不进入 Task 5 数据请求。

## 15. Task 6 / 7 后续 source of truth

Dashboard 当前已完成的是核心摘要和最近数据，不等于 Web Dashboard 的 Rewards / Whitelist 已完整迁移。后续不再继续扩张 `DashboardScreen`，详细字段、状态机、安全边界、当前能力差距和验收标准统一见：

- [Task 6/7 Rewards 与 Whitelist 业务契约及实施计划](2026-07-15-task-06-07-rewards-whitelist-business-logic.md)

明确拆分：

- Task 6A：Rewards read models。
- Task 6B：My Rewards UI、邀请、推荐记录、积分流水、返佣列表。
- Task 6C：payout confirmation 独立受控写。
- Task 7A：完整只读 Whitelist 和 approved identity details。
- Task 7B：KYC launcher、submission 和返回刷新；mobile-ready host 契约未确认前 stop-for-human。
