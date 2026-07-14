# Task 4：Asset Detail、估值报告、发行规则、链上信息

来源：[rn-full-app-port implementation](../../2026-07-02-rn-full-app-port-implementation.md)
UI 规范：[Tokenized Art Finance UI System](../ui-guidelines.md)
信息架构原型：[Task 3 / 4 Launchpad Detail Flow](../../../prototypes/rn-task03-04-launchpad-detail-flow.svg)

## 业务场景

用户从 Launchpad / Market 点击资产卡片后进入资产详情，查看艺术品信息、发行状态、估值报告、发行规则和链上可信信息，并根据登录、KYC、白名单、发售状态看到下一步行动。

本 Task 只实现详情页 read-only 布局、购买资格提示和购买入口 shell，不执行真实购买，不请求 `generate-signature`，不发链上交易。

## 参考 Web 信息

详情页 Web 版本包含：

- 大图。
- 状态标签：`进行中`。
- 艺术家名：如 `安塞姆·基弗`。
- 作品名：如 `我曾见过雾之国，我曾吞下雾之心 - 致敬英格博格·巴赫曼`。
- token code：如 `ART-MIST`。
- 当前价格：`$0.1 USDT`。
- 发售进度：已售 / 预留 / 百分比。
- 参与者数量。
- 已筹资金额。
- 白名单 / 资格状态。
- 购买份额输入。
- tabs：`详情 / 估值报告 / 发行规则`。
- 详情文本。
- 估值报告：
  - 估值机构
  - 估值日期
  - 估值金额
  - 报告编号
  - 市场趋势
  - 需求水平
  - 置信度
  - 流动性评级
  - 免责声明
  - 查看完整报告
- 发行规则：
  - 总发行量
  - 公开发售
  - 预留股份
  - 解锁条件
  - 结算资产
  - 白名单要求
  - 发售后权益
- 合约信息：
  - 合约地址
  - 代币标准
  - 区块链
- 事件时间线：
  - 购买时间
  - 交易地址
  - 份额 / 金额

参考 Web 业务逻辑：

- 页面：`/Users/rwa_start/ProjectSource/ArtStarFront/src/pages/AssetDetail.tsx`
- 详情数据：`/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useArtAsset.ts`
- 估值数据：`/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useAssetValuation.ts`
- 合约读取：`/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useContractData.ts`
- 合约格式化：`/Users/rwa_start/ProjectSource/ArtStarFront/src/lib/contractDataUtils.ts`
- 事件时间线：`/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useMintEvents.ts`
- 显示状态：`/Users/rwa_start/ProjectSource/ArtStarFront/src/lib/assetDisplayUtils.ts`
- 购买写链路：`/Users/rwa_start/ProjectSource/ArtStarFront/src/components/launchpad/MintForm.tsx`、`/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/usePurchase.ts`

Web 端详情页同时聚合 Supabase 业务数据、估值报告、链上合约读取、KYC 状态、购买事件和购买写链路。RN 迁移时必须拆边界：Task 4 只做 read-only 聚合与展示；Task 9 才实现 `generate-signature -> approve -> mint -> receipt`。

## 数据来源与业务读取

### Asset detail data

详情主数据来自 `art_assets` 关联 `artwork_submissions`：

```sql
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
  is_deleted

artwork_submissions:
  name
  name_en
  artist_name
  artist_name_en
  image_urls
  description
  description_en
  dimensions
  creation_year
  material
  provenance
```

行为：

- 使用列表缓存作为 placeholder data，进入详情时再补齐描述、尺寸、年份、材质、来源。
- 只读取 `id = assetId` 且 `is_deleted = false`。
- 详情主数据 stale time 可为 60 秒。
- Realtime invalidation 归 Task 11；Task 4 首版只定义刷新入口，不强制接实时订阅。

### Valuation report data

估值报告来自 `asset_valuation_reports`：

```sql
asset_valuation_reports:
  appraiser
  report_number
  report_date
  valuation_usdt
  report_url
  market_trend
  demand_level
  confidence
  liquidity_rating
  notes
  is_deleted
  created_at
```

行为：

- 读取当前资产最新一条非删除报告。
- 无报告时 Valuation tab 显示 `暂无估值报告`，不是详情页错误。
- `report_url` 必须经过 URL 安全校验和 platform linking adapter 打开。

### Mint events data

事件时间线来自 `mint_events`：

```sql
mint_events:
  id
  tx_hash
  block_timestamp
  amount_usdt
  shares
  asset_id
  is_deleted
```

行为：

- 按 `asset_id` 查询，`block_timestamp desc`，首版最多 20 条。
- 当前 Web 端要求登录后读取；RN 首版需按后端 RLS 结果处理：未登录或 RLS 拒绝时显示空态 / 登录提示，不把事件作为详情页阻塞错误。
- Realtime insert invalidation 延后到 Task 11。

## 单资产合约读取

详情页需要读取比列表更多的合约状态。Web `useContractData` 读取：

```ts
type AssetDetailContractReads = {
  saleActive: boolean;
  priceUSDTRaw: bigint;
  minPurchaseUSDTLegacyRaw: bigint;
  minPurchaseUSDTRaw: bigint;
  sold: bigint;
  saleCap: bigint;
  reservedAmount: bigint;
  usdtRaisedRaw: bigint;
  usdtDecimals: number;
  usdtBalanceRaw: bigint;
  usdtAllowance: bigint;
  artBalance: bigint;
  saleStartTime: bigint;
  saleEndTime: bigint;
};
```

对应合约方法：

- Art token:
  - `saleActive()`
  - `priceUSDT()`
  - `minPurchaseUSDT()`
  - `MIN_PURCHASE_USDT()`
  - `sold()`
  - `SALE_CAP()`
  - `RESERVED_AMOUNT()`
  - `usdtRaised()`
  - `balanceOf(walletAddress)`
  - `saleStartTime()`
  - `saleEndTime()`
- USDT:
  - `decimals()`
  - `balanceOf(walletAddress)`
  - `allowance(walletAddress, assetContractAddress)`

Task 4 读取边界：

- 可读取公开合约字段：saleActive、price、minPurchase、sold、SALE_CAP、RESERVED_AMOUNT、usdtRaised、saleStartTime、saleEndTime。
- 用户相关字段 `usdtBalanceRaw`、`usdtAllowance`、`artBalance` 可以在已登录时 read-only 读取，用于 CTA / 后续购买 sheet 预览，但不得执行写操作。
- 读取必须通过 `assetDetailContractReadAdapter`，不得在 screen 调用 viem / ABI。
- 无合约地址或零地址时返回 `isUnsupportedChain = true` 和空链上信息。
- 合约读取失败时详情仍展示 Supabase 数据，并在链上 tab / sale summary 显示可重试状态。

合约数值格式化：

- USDT 使用合约 `decimals()`，通常是 6。
- Art token 份额使用 18 decimals。
- `soldPercent = sold * 10000 / saleCap / 100`，并 clamp 到 `0..100`。
- UI 不直接调用 `formatUnits` / `parseUnits`。

## Sale Status Resolution Policy

详情页必须复用 Task 3 的状态解析策略，不能在详情页重新发明一套状态判断。

状态优先级：

1. 有有效合约地址，且链上读取成功：使用链上状态作为详情 badge、发售进度、底部 CTA 的输入。
2. 有有效合约地址，但链上读取中：可以使用数据库 `status` 做临时展示，但底部 CTA 不允许进入购买，显示 loading / verifying 状态。
3. 有有效合约地址，但链上读取失败：可以使用数据库 `status` 做降级展示，但底部 CTA 不允许购买，提示链上状态暂不可用。
4. 没有合约地址或零地址：使用数据库 `status` 展示，但底部 CTA 不允许购买，显示合约未配置 / 暂不可用。
5. 购买入口必须要求 `source = "chain"`、`chainStatus = "ready"` 且 `displayStatus = "active"`。

详情页 action state 必须接收 `SaleStatusResolution`：

```ts
type SaleStatusResolution = {
  displayStatus: "active" | "upcoming" | "completed" | "paused";
  source: "chain" | "database_fallback" | "unsupported";
  chainStatus: "ready" | "loading" | "error" | "unsupported";
  canTrustForPurchase: boolean;
};

function resolveAssetDetailActionState(input: {
  sale: SaleStatusResolution;
  isLoggedIn: boolean;
  kycApproved: boolean;
  whitelisted: boolean | "unknown";
  soldPercent: number;
}): AssetDetailActionState;
```

`sale.displayStatus = "active"` 但 `sale.canTrustForPurchase = false` 时，CTA 不能是可执行的 `Subscribe`。这类状态应展示为 `Verifying sale status` / `Sale status unavailable`，后续文案可本地化。

## 购买写链路归属

Web `usePurchase` 的真实写链路包括：

1. 请求 Edge Function `generate-signature`，携带登录 token 和 `userAddress`。
2. 校验 signature、expireTime、chainId。
3. USDT allowance 不足时执行 `approve(assetContract, amountRaw)`。
4. 等待 approve receipt。
5. 执行 `mint(amountRaw, signature, expireTime)`。
6. 等待 mint receipt。
7. 刷新合约数据。

这条链路不属于 Task 4。Task 4 只能定义 CTA 状态和 purchase placeholder。真实实现归 Task 9：Purchase dry-run / testnet write workflow。

Task 4 forbidden：

- 禁止请求 `generate-signature`。
- 禁止调用 `writeContract`。
- 禁止调用 `approve`。
- 禁止调用 `mint`。
- 禁止在未收到 receipt 前展示购买成功。

## 移动端信息架构

桌面端左右栏在 App 上改为纵向详情 + 底部固定 CTA。

首屏顺序：

1. Header：返回 + `Asset Detail` / 短标题。
2. 艺术品大图，固定比例。
3. 状态标签 + token code。
4. 艺术家名。
5. 作品名。
6. 当前价格。
7. 发售进度。
8. 核心指标：参与者、已筹资、可购份额 / 剩余时间。
9. 资格状态提示。
10. Sticky segmented tabs：`详情 / 估值 / 规则 / 链上`。
11. 当前 tab 内容。
12. 底部固定 CTA。

购买输入不直接放在详情内容里。点击底部 CTA 后，后续 Task 9 使用 bottom sheet 承载购买金额、余额、可获得份额、确认购买。

## Segmented Tabs

移动端 tab：

```ts
type AssetDetailTab = "overview" | "valuation" | "rules" | "onchain";
```

文案：

| Tab | 中文 | 内容 |
| --- | ---- | ---- |
| `overview` | 详情 | 作品描述、艺术家、项目说明 |
| `valuation` | 估值 | 估值报告、市场分析、免责声明 |
| `rules` | 规则 | 发行规则、白名单要求、发售后权益 |
| `onchain` | 链上 | 合约信息、事件时间线、区块浏览器外链 |

行为：

- tab bar 可 sticky 在 Header 下方。
- 切换 tab 不重新请求详情主数据。
- tab 内容使用同一个详情 read model。
- 切换 tab 后保持页面在 tab 内容顶部附近，避免用户迷路。

## Overview Tab

内容：

- 作品描述。
- 艺术家信息。
- 艺术品元信息：
  - 尺寸
  - 年份
  - 材质
  - 所在地
  - 托管 / 保管机构
- 项目说明。

展示规则：

- 使用分区标题 + 文本。
- 文本长时允许折叠 / 展开，首版可展示完整文本。
- 不用桌面端大段横向布局。

## Valuation Tab

估值信息分成三个 section。

### 估值信息

字段：

- 估值机构，如 `Christie's Art Appraisal`。
- 估值日期，如 `2025-11-01`。
- 估值金额，如 `$100,000,000`。
- 报告编号，如 `VAL-2024-001239`。

移动端布局：

- 2 列网格在大屏手机可用。
- 小屏可降为单列。
- label 用 muted，value 用 bodyStrong。

### 市场分析

字段：

- 市场趋势：`bullish`。
- 需求水平：`high`。
- 置信度：`high`。
- 流动性评级：`high`。

展示规则：

- 使用信息网格。
- `bullish` 可使用绿色，但不要大面积绿色卡片。

### 免责声明

展示免责声明文本：

`本估值报告仅供参考，不构成投资建议。艺术品市场具有波动性，实际交易价格可能与估值存在差异。投资者应自行评估风险并做出独立判断。`

操作：

- `查看完整报告`，右侧 external link 图标。
- 外链打开必须通过 platform adapter，不能在 UI 中直接使用 Web-only API。

## Rules Tab

### 发行规则

字段：

- 总发行量：`10,000,000 份`
- 公开发售：`8,000,000 份`
- 预留股份：`2,000,000 份（流动性 1,000,000，市场运营 1,000,000）`
- 解锁条件：`发售活动结束后，代币解锁`
- 结算资产：`USDT (BEP-20)`

### 白名单要求

字段：

- 完成 KYC 身份认证。
- 符合投资者资格要求。
- 非受限制区域用户。

### 发售后权益

字段：

- 所有权：按份额比例享有艺术品所有权。
- 交易权：发售结束后可在二级市场自由交易份额。
- 治理权：参与艺术品相关决策投票，例如展览、租赁。
- 分红权：享受艺术品展览、租赁等收益分红。

展示规则：

- 使用分组列表。
- 重要关键词加粗。
- 不使用桌面端宽卡片堆叠。

## On-chain Tab

合约信息：

- 合约地址，短格式，例如 `0x527c...c7eb`。
- 代币标准，例如 `ERC-20`。
- 区块链，例如 `BNBChain`。
- 区块浏览器外链。

事件时间线：

```ts
type AssetChainEvent = {
  id: string;
  type: "purchase" | "transfer" | "settlement" | "metadata_update";
  title: string;
  occurredAtText: string;
  txHashShort: string;
  explorerUrl: string;
  amountText: string;
};
```

展示规则：

- 使用竖向时间线。
- 每个事件显示事件类型、时间、短交易哈希、份额 / 金额。
- 事件为空时显示 `暂无链上事件`。
- 外链使用平台 adapter 打开。

## 底部 CTA

底部固定 CTA 根据状态变化，不在 read-only Task 中执行购买。

状态：

```ts
type AssetDetailActionState =
  | "connect_required"
  | "kyc_required"
  | "verifying_sale_status"
  | "sale_status_unavailable"
  | "not_started"
  | "not_eligible"
  | "sale_open"
  | "sold_out"
  | "sale_closed"
  | "read_only";
```

文案：

| State | CTA | 行为 |
| ----- | --- | ---- |
| `connect_required` | Connect wallet | 触发登录 |
| `kyc_required` | Complete KYC | 打开 KYC 入口，后续 Task 7 |
| `verifying_sale_status` | Verifying sale status | disabled |
| `sale_status_unavailable` | Sale status unavailable | disabled / retry chain read |
| `not_started` | Sale opens soon | disabled |
| `not_eligible` | Not eligible | disabled 或展示说明 |
| `sale_open` | Subscribe | 首版打开 purchase placeholder / 后续 Task 9 sheet |
| `sold_out` | Sold out | disabled |
| `sale_closed` | View market | 跳转 Market 或 disabled |
| `read_only` | View details | disabled / no-op |

CTA 只是入口，不做最终可信判断。它可以用链上 read-only 状态决定是否展示购买入口，但最终购买资格仍由后端 / KYC / whitelist / chain state 在后续 purchase workflow 中确认。数据库 fallback 状态不得让 CTA 进入可购买状态。

## 数据模型

```ts
type AssetDetail = {
  id: string;
  title: string;
  artistName: string;
  tokenCode: string;
  imageUrl: string | null;
  contractAddress: string | null;
  chainId: number | null;
  saleStatus: "active" | "upcoming" | "completed" | "paused" | "sold_out";
  priceText: string;
  progressPercent: number;
  soldSharesText: string;
  saleCapText: string;
  reservedSharesText: string;
  availableSharesText: string;
  participantsCount: number;
  fundedAmountText: string;
  minPurchaseText: string | null;
  userUsdtBalanceText: string | null;
  userAllowanceState: "unknown" | "sufficient" | "insufficient";
  remainingTimeText: string | null;
  chainReadState: "ready" | "loading" | "error" | "unsupported";
  saleStatusSource: "chain" | "database_fallback" | "unsupported";
  canTrustForPurchase: boolean;
  eligibility: AssetEligibilitySummary;
  overview: AssetOverview;
  valuation: AssetValuation;
  rules: AssetIssuanceRules;
  onchain: AssetOnchainInfo;
};
```

```ts
type AssetEligibilitySummary = {
  status: "approved" | "kyc_required" | "not_whitelisted" | "not_logged_in" | "unknown";
  title: string;
  description: string;
};
```

约束：

- 金额、份额、时间、地址短格式都由 domain mapper 生成。
- UI 不直接格式化 BigInt / decimal。
- 合约地址不在 screen 硬编码，后续必须经 `src/lib/chain/contracts.ts` 或 repository 返回。
- `userUsdtBalanceText`、`userAllowanceState` 只是 read-only 预览，不能作为最终购买资格可信来源。

## 业务数据聚合流程

```text
AssetDetailScreen(assetId)
  -> assetDetailRepository.fetchAssetDetail(assetId)
    -> Supabase art_assets + artwork_submissions
  -> assetValuationRepository.fetchLatestReport(assetId)
    -> Supabase asset_valuation_reports
  -> assetDetailContractReadAdapter.readDetailState(contractAddress, walletAddress?)
    -> viem public client / multicall
  -> mintEventsRepository.fetchRecentEvents(assetId)
    -> Supabase mint_events
  -> assetDetailMappers.toAssetDetailReadModel(dbDetail, valuation, contractState, events, authState, kycState, now)
  -> AssetDetail sections + bottom CTA
```

数据失败处理：

- 主详情数据失败：详情页错误态，可重试。
- 估值报告失败：Valuation tab 局部错误，不阻塞详情。
- 合约读取失败：Sale summary / On-chain tab 局部错误，不阻塞详情。
- mint events 失败：On-chain tab 时间线局部错误，不阻塞详情。

## 范围

范围内：

- Asset Detail read-only screen。
- 详情 read model / mapper。
- Supabase 详情 repository。
- Supabase 最新估值报告 repository。
- Supabase mint events read-only repository。
- 单资产合约 read-only adapter。
- 估值、规则、链上分区组件。
- 底部 CTA 状态推导。
- 外链打开 adapter contract。
- Asset card 点击进入详情 route。

范围外：

- 不执行购买。
- 不请求 `generate-signature`。
- 不调用 approve / mint。
- 不等待交易 receipt。
- 不实现 KYC WebView 流程。
- 不实现链上事件 realtime。
- 不实现完整 Market 二级交易。

## 预计影响文件

- `src/features/assets/domain/assetDetailModels.ts`
- `src/features/assets/domain/assetDetailMappers.ts`
- `src/features/assets/domain/assetDetailActionState.ts`
- `src/features/assets/services/assetDetailRepository.ts`
- `src/features/assets/services/assetValuationRepository.ts`
- `src/features/assets/services/assetDetailContractReadAdapter.ts`
- `src/features/assets/services/mintEventsRepository.ts`
- `src/features/assets/screens/AssetDetailScreen.tsx`
- `src/features/assets/components/AssetHero.tsx`
- `src/features/assets/components/AssetSaleSummary.tsx`
- `src/features/assets/components/AssetDetailTabs.tsx`
- `src/features/assets/components/AssetOverviewSection.tsx`
- `src/features/assets/components/AssetValuationSection.tsx`
- `src/features/assets/components/AssetRulesSection.tsx`
- `src/features/assets/components/AssetOnchainSection.tsx`
- `src/features/assets/components/AssetBottomAction.tsx`
- `src/shared/platform/linkingAdapter.ts`
- `src/app/navigation/AppNavigator.tsx`
- `src/app/navigation/navigationState.ts`
- `src/features/assets/__tests__/assetDetailMappers.test.ts`
- `src/features/assets/__tests__/assetDetailActionState.test.ts`
- `src/features/assets/__tests__/assetDetailContractReadAdapter.test.ts`
- `src/features/assets/__tests__/assetDetailRepository.test.ts`
- `src/features/assets/__tests__/mintEventsRepository.test.ts`
- `src/features/assets/__tests__/AssetDetailScreen.test.tsx`

## 结构验收

- `AssetDetailScreen` 只组合 sections，不承载 mapper、repository、action state 规则。
- Repository 负责读取详情数据。
- 合约读取 adapter 负责所有 viem / ABI / chain config 访问。
- Mint events repository 只读 `mint_events`，不处理 webhook。
- Mapper 负责将 Supabase / chain / report row 转成 read model。
- Action state 是纯函数，可单测。
- Screen 不直接调用 Supabase、Privy、chain、Linking。
- Screen 不直接 import viem、ABI、`generate-signature`、wallet provider。
- 外链打开经 platform adapter。
- UI 使用 `Tokenized Art Finance UI System` token。

## 可测试性验收

- mapper 测试覆盖：
  - 缺图。
  - 缺估值报告。
  - 无合约地址。
  - 无链上事件。
  - progress clamp。
  - 地址短格式。
- contract adapter 测试覆盖公开字段读取、用户余额读取、无合约地址、链不支持、读取失败。
- mint events repository 测试覆盖最多 20 条、排序、未登录 / RLS 拒绝降级。
- action state 测试覆盖：
  - 未登录 -> `connect_required`
  - KYC 未通过 -> `kyc_required`
  - 未开始 -> `not_started`
  - 白名单不通过 -> `not_eligible`
  - sale open + approved -> `sale_open`
  - sold out -> `sold_out`
  - sale closed -> `sale_closed`
- screen 测试覆盖：
  - hero 信息渲染。
  - tab 切换。
  - valuation section 渲染。
  - rules section 渲染。
  - onchain empty state。
  - CTA disabled / enabled 文案。

## 验收标准

- 从 Launchpad / Market 资产卡片可进入详情。
- 首屏展示图片、标题、token code、价格、进度和资格提示。
- `详情 / 估值 / 规则 / 链上` 四个 tab 可切换。
- 估值报告信息可读，免责声明存在。
- 发行规则按移动端分组列表展示。
- 链上信息显示短地址和事件时间线。
- 合约读取失败不阻塞详情主内容。
- 估值报告或 mint events 失败只影响对应 tab。
- 底部 CTA 固定，且不会遮挡内容底部。
- read-only 阶段点击 Subscribe 不发真实交易。

## 测试

先写 failing tests：

- `npm test -- src/features/assets`

实现后运行：

- `npm test -- src/features/assets`
- `npm test -- src/app/navigation`
- `npm test -- src`
- `npx tsc --noEmit`
- `npm run ai:audit -- rn-full-app-port`

Forbidden scans：

- `node scripts/verify-no-match.mjs -e "generate-signature" -e "writeContract" -e "approve" -e "mint" src/features/assets --glob "*.tsx"`
- `node scripts/verify-no-match.mjs -e "generate-signature" -e "writeContract" -e "approve" -e "mint" src/features/assets --glob "*.ts"`
- `node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "register-user" -e "generate-signature" src/features/assets --glob "*.tsx"`
- `node scripts/verify-no-match.mjs -e "window\\." -e "document\\." -e "navigator\\." src/features/assets --glob "*.ts" --glob "*.tsx"`

## 手动 QA

- iOS：从 Launchpad 进入详情。
- iOS：滑动详情页，确认底部 CTA 不遮挡最后内容。
- iOS：切换 `详情 / 估值 / 规则 / 链上`。
- iOS：点击完整报告 / 区块浏览器外链，确认走 adapter。
- Android：重复以上关键路径。

## 可追溯关系

- 公开资产详情。
- 购买失败前置阻断。
- 合约信息可信展示。
- 估值报告展示。
- 发行规则展示。

## 实现状态

Code complete（2026-07-14），不推进 AI Delivery feature stage。

- 已实现 `art_assets` / `artwork_submissions` 主详情、最新估值和最多 20 条 mint events 的只读 repository。
- 已实现基于资产 chain ID 的 BSC 56 / 97 合约读取；必需读取失败返回 `error`，不以零值伪装成功。
- 已实现 `overview / valuation / rules / onchain` 四个 tab、列表 placeholder、固定底部 CTA、安全外链和 Launchpad / Market 来源返回。
- 数据库 fallback、RPC / 估值 / RLS 失败均保持只读或局部降级，不能启用 Subscribe。
- 当前认证 runtime 不提供可信 wallet / KYC / whitelist 明细；这些字段保持 `unknown`，不把 authenticated 等同于 KYC 或白名单通过。
- 全量验证：`45` 个测试文件、`201` 个用例通过；`npm run typecheck`、diff check 和 forbidden scans 通过。
- Stop for human：iOS / Android 实机安全区与固定 CTA、真实图片和外链、Supabase anon/RLS、真实 BSC RPC 降级仍须发布前确认。
