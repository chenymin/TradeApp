# Rewards 与 Whitelist 业务契约及实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不复制 Web 单页结构的前提下，为 React Native 补齐“我的奖励”和“白名单 / KYC”完整业务能力，并明确只读数据与资金状态写操作的安全边界。

**Architecture:** Dashboard 继续作为摘要工作台；完整 Rewards 和 Whitelist 使用独立受保护 route。Supabase 表、view 和 Edge Function 通过 repository/client 访问，金额、状态映射和邀请链接由纯 domain 函数处理，移动端分享、剪贴板、邮件和 KYC launcher 通过 platform adapter 隔离。

**Tech Stack:** Expo / React Native、TypeScript、Supabase Data API / Edge Functions、React Native `FlatList` / `SectionList`、现有 auth viewer/session 与 UI primitives。

---

来源：

- Web 页面：`/Users/rwa_start/ProjectSource/ArtStarFront/src/pages/Dashboard.tsx`
- Web 组件：`/Users/rwa_start/ProjectSource/ArtStarFront/src/components/dashboard`
- Web hooks：`useUserProfile`、`useMyPointTransactions`、`useMyReferrals`、`useMyCommissions`、`useKycStatus`、`useKycApplicantDetails`
- Web Edge Functions：`get-my-referrals`、`commission-user`、`kyc-init`、`kyc-mark-submitted`、`kyc-applicant-details`
- RN 当前实现：`src/features/dashboard`

本文是 Task 6 私有 My Rewards 与 Task 7 Whitelist / KYC 的业务 source of truth。Task 6 的公开推荐规则 / 排行榜仍以 Epic 实现计划为准，不在本次 Dashboard 依赖梳理中重新定义。Task 5 的 Dashboard 核心读取已经存在；本文不继续向 `DashboardScreen` 堆叠完整列表和流程。

## 1. 当前能力差距

| 能力 | 当前 RN | Web 参考 | 后续归属 |
| --- | --- | --- | --- |
| Profile、tier、total points | 已实现 | 已实现 | Task 5 保持 |
| 四类积分余额 | profile model 已有，UI 只显示总积分 | 四张摘要 | Task 6A / 6B |
| 最近积分流水 | 已读取最近 50 条并在 Dashboard 展示 | Rewards 内独立 tab | Task 6B 迁入 Rewards，Dashboard 不重复 |
| Commission summary | 已读取完整 summary，UI 只显示 lifetime | 六张摘要 | Task 6B |
| Invite code | profile model 已有，未展示 | KYC 通过后展示 | Task 6A / 6B |
| 四类邀请链接、复制、分享 | 未实现 | 已实现复制 | Task 6A / 6B |
| 推荐记录 | 未实现 | `get-my-referrals` | Task 6A / 6B |
| 返佣明细 | 未实现 | `my_commission_details` | Task 6A / 6B |
| 用户确认 payout | 未实现 | `commission-user?action=confirm-payout` | Task 6C，独立受控写 |
| Tier benefits | 未实现 | 本地文案映射 | Task 6B，仅说明性展示 |
| KYC 状态摘要 | 已实现 | 已实现 | Task 5 保持 |
| 完整 Whitelist 状态页 | 未实现 | 已实现 | Task 7A |
| approved identity details | 未实现 | `kyc-applicant-details` | Task 7A |
| KYC start / resume / return refresh | 未实现 | Sumsub Web SDK | Task 7B |
| Realtime invalidation | 未实现，使用手动刷新 | Web 按本人 filter 订阅 | 后续优化，不阻塞首版 |

信息架构决策：

- `Dashboard` 只保留工作台摘要、Holdings 和 Transactions。
- 当前 Dashboard 的 Points 列表迁入受保护的 `referral` route，避免同一积分流水重复展示。
- `kyc` route 承载完整 Whitelist 页面；Dashboard 的 KYC 摘要只负责进入该 route。
- `referralPublic` 继续承载未登录可见的推荐规则 / 排行榜；`referral` 承载已登录用户的 My Rewards。两者不能共享授权假设。
- 精确视觉方案在 Task 6B / 7A 开工前确认；业务字段、状态和安全边界以本文为准。

## 2. 依赖图

```text
Dashboard summary
  -> protected route: referral (My Rewards)
       -> rewards profile / user_profiles
       -> point ledger / point_transactions
       -> referral records / get-my-referrals
       -> commission summary / my_commission_summary
       -> commission details / my_commission_details
       -> controlled payout write / commission-user
       -> platform adapters / clipboard + share

Dashboard KYC summary
  -> protected route: kyc (Whitelist)
       -> latest status / kyc_applications
       -> approved details / kyc-applicant-details
       -> start or resume / kyc-init
       -> submission transition / kyc-mark-submitted
       -> mobile KYC launcher
       -> AppState or deep-link return refresh
```

## 3. 共同认证和错误边界

- 所有私有查询必须同时满足 `viewer != null` 和 `isSessionReady === true`。
- user id 只取已验证 auth viewer / JWT；route 参数、invite link、输入框和本地存储中的 user id 都不是授权来源。
- Edge Function 调用使用当前 access token；401 表示 session 失效并进入重新登录路径，不能显示为“暂无数据”。
- Data API 的 GRANT 与 RLS 是两道独立门禁。Supabase 2026-04 起新表默认不再自动暴露给 Data API，因此上线前必须检查 `authenticated` 的 schema/table/view 权限。
- 403 / permission denied、view 不存在、网络失败和真实空数组必须映射为不同状态。
- My Rewards 各 section 局部降级。推荐记录失败不能隐藏积分余额；佣金 view 失败不能隐藏积分流水。
- 不记录 access token、KYC 原文、证件号、完整钱包地址或返佣敏感响应。

## 4. My Rewards 业务契约

### 4.1 积分与用户摘要

来源：`user_profiles` 本人行。

```text
referral_points
task_points
trading_points
reputation_points
total_points
tier
user_type
invite_code
```

展示规则：

- 推荐、任务、声誉积分按整数展示。
- 交易积分、总积分和流水值：整数不补零，小数最多 2 位。
- null、NaN 和非法值归零，但 repository error 不归零。
- `tier` 缺失时可以显示未知 / D 级 fallback，domain model 不得把缺失值写回为 D。
- Tier benefits 是产品说明文案，不是资格可信来源；真实购买、额度或返佣规则仍由后端 / 合约判定。

### 4.2 邀请码和邀请链接

Web 行为：只有 `kycStatus === "approved"` 时展示邀请码和打开邀请流程；未通过时引导进入 Whitelist。

目标类型：

```text
investor
collector
creator
institution
```

链接契约：

```text
<PUBLIC_WEB_ORIGIN>/register?ref=<encodeURIComponent(invite_code)>&type=<target>
```

RN 规则：

- base origin 必须来自集中配置，不能使用设备本地 origin、Expo dev URL 或硬编码页面地址。
- link builder 是纯函数并验证 target、origin 和非空 invite code。
- Clipboard / Share 走 adapter；分享文本不得包含 token、user id 或钱包私钥信息。
- KYC gate 是客户端 UX，不能作为注册 / 推荐奖励的服务端授权替代。
- collector、creator、institution 在文案上标明“需审核评级”，但客户端不决定审核结果。

### 4.3 推荐记录

读取：

```http
GET /functions/v1/get-my-referrals
Authorization: Bearer <access_token>
```

响应：

```text
records[]:
  id
  referred_id
  referred_email
  referred_wallet_address
  referral_status
  referred_user_type
  referred_tier
  total_points_awarded
  created_at
```

服务端边界：

- Edge Function 先用 publishable client 验证 JWT。
- 查询条件固定为 `referral_records.referrer_id = authenticated user.id` 且 `is_deleted = false`。
- service role 只在验证身份后用于补充被推荐用户 email 和 primary active wallet。
- 客户端不传 `referrer_id`，也不能请求其他用户记录。

状态集合：

```text
waiting_kyc
pending
approved
rejected
self_referral_rejected
expired
unknown
```

展示字段：受邀用户（email 优先，其次缩略钱包，再次缩略 id）、用户类型、tier、状态、获得积分、创建时间。

未知状态必须显示稳定 fallback，不崩溃，也不能映射成 approved。

### 4.4 积分流水

来源：`point_transactions`。

查询：

```text
select id, point_type, amount, balance_after, source, created_at
where user_id = authenticated viewer id
  and is_deleted = false
order by created_at desc
limit 50
```

字段：

```text
point_type: referral | trading | reputation | task | unknown
amount
balance_after
source
created_at
```

规则：

- amount 正数带 `+`，负数保留 `-`。
- `balance_after` 是该次变动后的对应积分余额，不应替代 profile 的总积分。
- 首版明确只展示最近 50 条；若产品需要完整历史，必须先增加分页契约，不能把无限列表伪装成完整流水。

### 4.5 Commission 只读模型

首选 view：

```text
my_commission_summary
my_commission_details
```

Summary 字段：

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

六张可见摘要：

1. 待结算返佣。
2. 待用户确认。
3. 待付款。
4. 已付款。
5. 争议 / 冻结。
6. 累计推荐总额。

Detail 字段：

```text
id
asset_id
asset_name
referred_id
referred_display
pending_usdt
settled_usdt
kol_bonus_usdt
kol_bonus_settled
golden_bonus_usdt
golden_bonus_settled
status
payout_id
payout_status
payout_tx_hash
payout_user_confirmed_at
payout_paid_at
referrer_wallet
updated_at
created_at
```

派生值：

```text
standardTotal = pending_usdt + settled_usdt
bonusTotal =
  kol_bonus_usdt +
  kol_bonus_settled +
  golden_bonus_usdt +
  golden_bonus_settled
confirmAmount = standardTotal + bonusTotal
```

返佣业务状态：

```text
accumulating
pending_review
settled
disputed
suspicious
```

Payout 状态：

```text
pending_user_confirmation
pending_payment
paid
cancelled
null
```

金额规则：

- repository 中保留 decimal string；禁止用 JavaScript float 做资金状态判断或累计。
- 只在 formatter 中格式化 2 位 USDT 展示。
- `payout_status` 优先于 commission `status` 显示。
- 只有 `payout_status === pending_user_confirmation && payout_id != null` 时显示确认入口。

已确认风险：

- Web migrations 中未找到两个 view 和 `confirm_commission_payout` 的定义。
- Web 生成类型与 hook 字段不一致，`commission_payouts` 生成类型也缺少当前 payout 状态字段。
- Web fallback 从 `referral_commissions` 聚合会丢失 payout 状态、推荐 mint 总额和付款信息。

RN 决策：

- Task 6A 开工前先验证目标环境的 view / RPC 契约。
- 完整 Rewards 不采用静默 fallback；view 缺失显示 `read_model_unavailable`，不能用不完整聚合冒充可确认 payout 数据。
- 若保留只读 fallback，必须标记 `degraded`，隐藏 payout 确认，并单独测试字段缺失。

### 4.6 确认返佣 payout（受控写）

请求：

```http
POST /functions/v1/commission-user?action=confirm-payout
Authorization: Bearer <access_token>
Content-Type: application/json

{ "payout_id": "<id>" }
```

客户端不能提交 amount、wallet 或 referrer id。服务端用 JWT user id 调用：

```text
confirm_commission_payout(
  p_payout_id = request payout id,
  p_referrer_id = authenticated user id
)
```

成功响应：

```text
success
idempotent
payout_id
```

错误：

```text
400 invalid_json | payout_id_required | unsupported_action
401 missing_token | unauthorized
404 payout_not_found
409 payout_not_confirmable
500 internal failure
```

用户确认前展示：应收金额、收款地址、“确认后平台将按该地址执行链上打款”的不可逆提示。

状态机：

```text
pending_user_confirmation
  -> confirming
  -> pending_payment (success or idempotent success)
  -> pending_user_confirmation + retryable error
```

边界：

- 该动作只确认付款单，不代表已付款，不发送链上交易。
- 成功后 invalidate / refresh commission summary 和 details。
- 重复点击、超时后重试必须依赖服务端幂等结果。
- 404 / 409 后强制刷新，不保留陈旧可确认按钮。
- 缺少钱包地址时禁止确认并引导联系支持；服务端仍是最终判断。
- Task 6C 必须独立提交、独立 review、可通过 feature flag 隐藏。

### 4.7 Tier benefits

Web 使用 `tier -> localized benefits[]` 映射：D 2 条、C 3 条、B/A/S 各 4 条。

RN 把映射放在 domain/catalog，不从远端响应推断。未知 tier 显示无权益说明，不继承更高等级权益。权益文案只用于说明，任何 Launchpad 资格、折扣或分成必须由对应后端可信来源确认。

## 5. Whitelist / KYC 业务契约

### 5.1 最新状态读取

来源：最新一条未删除 `kyc_applications`：

```text
status
reviewed_at
reason_code
notes
```

查询固定为本人 `investor_id`，按 `created_at desc` 取一条。

| 状态 | 页面标题 | 可执行动作 | 验证时间 | 有效期 |
| --- | --- | --- | --- | --- |
| `null` | 未申请白名单 | 开始 KYC | `-` | `-` |
| `pending` | 等待完成 KYC | 继续认证 | `-` | `-` |
| `under_review` | 人工复核中 | 无，等待结果 | `-` | `-` |
| `awaiting_resubmission` | 需要重新完成认证步骤 | 继续认证 | `-` | `-` |
| `rejected` | 白名单未通过 | 联系支持 | reviewed date 或 `-` | `-` |
| `approved` | 白名单已通过 | 无启动动作 | reviewed date | 永久（当前产品规则） |

规则：

- `approved` 只表示当前展示 read model；购买资格最终仍由购买后端 / 签名接口判定。
- `under_review` 不显示 start/resume，避免重复干预正在审核的申请。
- `rejected` 不允许客户端直接重开；服务端要求申诉，duplicate identity 还会返回专用阻断码。
- 原始 `notes` 不直接显示给用户；只根据安全 reason code 映射已审核文案。
- repository error 显示状态不可用，不能降级成 `null / 未开始`。

### 5.2 Start / resume：`kyc-init`

请求为空 body，身份来自 bearer JWT。

服务端前置条件：

- authenticated user 存在对应 investor。
- investor 不是 suspended。
- investor 已有 wallet address。
- approved 返回 `alreadyApproved`，不创建新申请。
- duplicate identity rejected 返回 `duplicate_identity_blocked`。
- 其他 rejected 返回 `kyc_rejected_appeal_required`。
- pending / under_review / awaiting_resubmission 复用原 applicant，只重新签发短期 access token。
- 只有首次申请创建新的 Sumsub applicant 和本地 `kyc_applications` 行。

成功响应：

```text
accessToken
applicantId
resumed? true
```

或：

```text
alreadyApproved: true
```

移动端 blocker：当前 Web 使用 `@sumsub/websdk-react` 消费 access token；仓库中没有确认可直接交给 `WebBrowser.openBrowserAsync` 的独立 KYC URL。Task 7B 编码前必须确认以下其中一种集成契约：

1. 受控的 hosted KYC bridge 页面，接收短期 server-side session 并通过 deep link 返回 App。
2. React Native WebView 中可运行的受控 Web SDK host。
3. 重新立项 Sumsub 原生移动 SDK。

在 launcher URL / host 契约确认前，只能完成 Task 7A 只读 Whitelist，不能伪造 start/resume 成功。

### 5.3 提交与返回刷新

Web SDK 收到 `idCheck.onApplicantSubmitted` 后调用 `kyc-mark-submitted`：

- `awaiting_resubmission -> pending`。
- `pending / under_review` 返回幂等成功。
- duplicate identity 和非法状态返回 403。

RN 返回策略：

- AppState 从 background/inactive 回到 active，且 KYC screen focused 时刷新最新状态。
- 若 bridge 支持 deep link callback，callback 只触发 refresh，不携带可信 KYC result。
- webhook 才是审核结果可信来源；App 不在本地把状态改成 approved。
- 刷新超时保持“等待同步”状态并允许手动刷新。

### 5.4 Approved identity details

读取：

```http
POST /functions/v1/kyc-applicant-details
Authorization: Bearer <access_token>
body: {}
```

只在 `status === approved` 时启用。字段：

```text
fullName
country
docType
docNumber
dateOfBirth
```

服务端：

- 验证 JWT。
- 使用 authenticated user id 查本人最新 application，不接受客户端 user id。
- 只允许 approved。
- 用服务端 HMAC 从 Sumsub 即时读取。
- 这些身份字段不持久化到项目数据库。

RN：

- 不写 SecureStore、AsyncStorage、日志、analytics 或 crash breadcrumbs。
- Screen blur / logout 时清理内存 read model 和受保护 query cache。
- details error 只影响身份详情 section，不改变 approved 状态。
- 证件号是否需要掩码由产品 / 合规确认；确认前默认掩码展示，禁止复制动作。

### 5.5 Support

Whitelist 页面保留 `support@artstarex.com` 联系入口，通过经过校验的 platform contact adapter 打开 `mailto:`。邮件正文不得自动附带证件号、token 或完整 KYC provider payload。

## 6. React Native 文件边界

### Task 6 文件

```text
src/features/referral/
  domain/
    rewardModels.ts
    inviteLinks.ts
    commissionAmounts.ts
    rewardStatus.ts
    tierBenefits.ts
  services/
    rewardsProfileRepository.ts
    referralRecordsClient.ts
    pointLedgerRepository.ts
    commissionReadRepository.ts
    commissionPayoutClient.ts
    createDefaultRewardsServices.ts
  components/
    PointsSummary.tsx
    InviteSection.tsx
    CommissionSummary.tsx
    ReferralRecordRow.tsx
    PointLedgerRow.tsx
    CommissionRow.tsx
    TierBenefitsSection.tsx
    ConfirmPayoutSheet.tsx
  screens/
    RewardsScreen.tsx
  __tests__/
```

Platform：

```text
src/shared/platform/clipboardAdapter.ts
src/shared/platform/shareAdapter.ts
```

### Task 7 文件

```text
src/features/kyc/
  domain/
    kycModels.ts
    kycStatus.ts
  services/
    kycRepository.ts
    kycInitClient.ts
    kycSubmissionClient.ts
    kycApplicantDetailsClient.ts
    kycLauncherAdapter.ts
    createDefaultKycServices.ts
  components/
    KycStatusSection.tsx
    KycIdentitySection.tsx
  screens/
    KycScreen.tsx
  __tests__/
```

边界：

- Screen 不直接调用 Supabase、`fetch`、`Linking`、Clipboard 或 Share。
- 纯 domain 文件不 import React Native、Supabase client 或 SDK。
- `AppRoot` / navigator 只注入 route 和 dependencies，不承载业务分支。
- 三类 Rewards 列表使用同一 screen 内的 segmented tabs + `FlatList`，不能用嵌套未虚拟化 `ScrollView`。
- 大列表 row 使用稳定 id，禁止 index key。

## 7. 分步交付

### Task 6A：Rewards read models

**Files:** `src/features/referral/domain/*`、`src/features/referral/services/*`、对应 tests。

**2026-07-15 状态：** 本地 read models 已实现，目标环境授权门禁未通过。Anon probe 可从 `my_commission_summary` 读取 1 行；证据见 `docs/ai-delivery/runs/2026-07-15-task-06a-supabase-contract-check.md`。在 view grant / `security_invoker` / 两用户隔离修复前，不进入 Task 6B commission UI。

- [x] 用失败测试固定四类积分、invite link、推荐记录、积分流水和 commission decimal 映射。
- [x] 实现 `get-my-referrals` authenticated client，并区分 401、403、5xx、网络错误和 empty。
- [x] 实现 commission summary/details view repository；view 缺失返回明确 unavailable，不静默伪造完整数据。
- [ ] 在目标 Supabase 环境核对 view 字段、Data API GRANT、`security_invoker` / ownership isolation 和 RPC 契约。
- [x] 运行 `npm test -- src/features/referral` 和 `npx tsc --noEmit`。

验收：fake clients 可验证所有映射；没有真实 token / network 依赖；跨用户参数不存在于 client API。

### Task 6B：My Rewards UI

**Files:** `src/features/referral/components/*`、`src/features/referral/screens/RewardsScreen.tsx`、navigation wiring、tests。

- [x] 先写 screen tests，覆盖四类积分、KYC gate、Referral / Points / Commission 安全状态切换和独立错误恢复。
- [x] 将 Rewards 作为 Dashboard sibling tab；邀请入口不放在 Rewards 内，Profile 的“邀请好友”命令只有在 KYC approved、邀请码和安全 public origin 同时存在时才打开原生邀请 sheet。
- [x] 使用单一 `FlatList` 实现 Referral / Point ledger 虚拟化列表及 loading / empty / error / retry；Commission 在授权修复前固定显示 unavailable 且不发请求。
- [x] 实现 tier benefits；unknown tier 不继承权益。
- [x] 将 Dashboard 的 Points 列表移入 Rewards，Dashboard 保留 points summary，避免重复内容和重复查询。
- [ ] 运行 iOS / Android 小屏、长 email、长 source、长资产名和大金额 QA。

验收：一个 section 失败不隐藏其他 section；无未虚拟化长列表；未通过 KYC 不能打开邀请链接选择，但可进入 Whitelist。

**2026-07-15 可验证状态：** Rewards 已嵌入 Dashboard，Profile 邀请命令、路由 alias、测试、TypeScript 和 iOS production export 已通过。退出登录或切换 viewer 会重新建立导航私有状态，避免上一账号的邀请码弹层或异步数据残留。最新证据见 `docs/ai-delivery/runs/2026-07-15-task-06b-7a-dashboard-tabs-verification.md`。iOS Simulator Release 构建成功，但本机 Pods 的源码 / 预编译依赖图不一致导致安装后的 app 缺少 `ReactNativeDependencies.framework`，因此本轮不声明真机视觉 QA 通过。Commission view 授权门禁和正式 `EXPO_PUBLIC_WEB_ORIGIN` 仍保持关闭。

### Task 6C：Payout confirmation controlled write

**Files:** `commissionPayoutClient.ts`、`ConfirmPayoutSheet.tsx`、`RewardsScreen.tsx`、tests。

- [ ] 先写 payout 状态机和 client contract 失败测试。
- [ ] 只发送 `payout_id`，服务端 user id / amount / wallet 不由客户端提供。
- [ ] 实现显式确认、in-flight 防重复、幂等成功、404/409 强制刷新和 retryable failure。
- [ ] 增加 feature flag / route-level kill switch，便于禁用写操作而保留 Rewards 只读能力。
- [ ] 完成安全、业务边界、资金幂等和 QA review。

验收：确认后显示 pending payment 而不是 paid；重复请求不重复推进；无 payout id / wallet 时无确认入口。

### Task 7A：Whitelist read-only

**Files:** `src/features/kyc/domain/*`、`kycRepository.ts`、`kycApplicantDetailsClient.ts`、KYC screen/components、tests。

- [x] 用失败测试固定六种状态、只读动作边界、review date 和 permanent 显示。
- [x] 复用最新 KYC summary 读取，query error 映射为 unavailable，不映射为 not started。
- [x] approved 时按需读取 identity details，局部错误不改变 approved。
- [x] 实现默认证件号掩码，并在 tab unmount、viewer 切换和 session 退出时清除组件内身份状态。
- [x] 将 Whitelist 接入 Dashboard sibling tab，并让 `kyc` route alias 直接选择该 tab。

验收：未 approved 不调用 details；敏感字段无日志 / 持久化 / 复制；rejected 和 under_review 不显示 start。

**2026-07-15 可验证状态：** Task 7A 只读能力已完成；`kyc-applicant-details` 只发送当前 bearer access token 和空 JSON body，不发送 user id。证件号只以掩码形式展示，原始 identity 仅保存在组件内存。Task 7B start / resume launcher 未实现，真机小屏视觉 QA 仍待完成。

### Task 7B：KYC launcher and return refresh

**Files:** `kycInitClient.ts`、`kycSubmissionClient.ts`、`kycLauncherAdapter.ts`、`KycScreen.tsx`、tests。

- [ ] 先确认 mobile-ready hosted bridge / WebView host 契约；没有契约时 stop-for-human。
- [ ] 用失败测试固定 start、resume、already approved、suspended、wallet missing、duplicate identity、rejected appeal 和 provider failure。
- [ ] 实现 launcher 生命周期、关闭、AppState/deep-link 返回刷新和手动 retry。
- [ ] callback 只触发 refresh，不信任客户端 result。
- [ ] 在测试环境完成真实 KYC provider QA，生产启用前人工门禁。

验收：pending / awaiting resubmission 可恢复同一 applicant；under review 无重复启动；返回后从服务端刷新；客户端从不自设 approved。

## 8. Machine verification

```bash
npm test -- src/features/referral src/features/kyc src/features/dashboard src/app/navigation
npx tsc --noEmit
npm run ai:audit -- rn-full-app-port
```

Forbidden scans：

```bash
node scripts/verify-no-match.mjs \
  -e "functions/v1" \
  -e "navigator\\." \
  -e "window\\." \
  -e "Linking\\.open" \
  src/features/referral src/features/kyc --glob "*.tsx"

node scripts/verify-no-match.mjs \
  -e "console\\..*token" \
  -e "console\\..*docNumber" \
  -e "AsyncStorage.*kyc" \
  -e "SecureStore.*kyc" \
  src --glob "*.ts" --glob "*.tsx"
```

人工 / 环境验证：

1. 两个不同 user token 不能互读 referral、points、commission、KYC。
2. `my_commission_summary` / `my_commission_details` 不绕过底表隔离。
3. 401/403 不显示 empty。
4. payout 重复确认返回幂等结果，状态只推进一次。
5. KYC identity details 只在 approved 返回，其他状态为 403。
6. 小屏列表、键盘、系统分享、返回 App 刷新在 iOS / Android 均通过。

## 9. 开工门禁和残余风险

Task 6A 前必须确认：

- 目标环境存在两个 commission views，字段与本文一致。
- view 使用 `security_invoker = true` 或等效隔离，且 `authenticated` 有精确 Data API GRANT。
- `confirm_commission_payout` 存在，能够验证 referrer ownership 和幂等状态。
- public Web origin 已配置用于 invite link。

Task 7B 前必须确认：

- mobile-ready KYC host / bridge URL 和 callback scheme。
- access token 的传递方式不会进入 URL 日志、analytics 或长期存储。
- hosted bridge 与 `kyc-mark-submitted` 的调用责任。

Stop-for-human：

- commission view / RPC 与生成类型继续漂移。
- 跨用户隔离测试失败或 view owner 绕过 RLS。
- KYC launcher 只能通过把 Sumsub access token 放入可记录的公开 URL 实现。
- 生产 payout 写操作尚未完成资金 / 安全 / QA review。
