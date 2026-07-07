# Task 3：Public Assets、Launchpad、Market

来源：[rn-full-app-port implementation](../../2026-07-02-rn-full-app-port-implementation.md)
UI 规范：[Tokenized Art Finance UI System](../ui-guidelines.md)
信息架构原型：[Task 3 / 4 Launchpad Detail Flow](../../../prototypes/rn-task03-04-launchpad-detail-flow.svg)

## 业务场景

未登录和已登录用户都能在 App 中浏览公开艺术品 RWA 资产：

- `Launchpad`：查看正在发行、即将开始、已完成的艺术资产发行项目。
- `Market`：查看已完成发行或可交易资产的公开市场列表。

本 Task 只实现公开浏览和列表交互，不实现资产详情购买、不读取用户持仓、不发起链上写操作。

## 参考 Web 信息

Launchpad Web 列表包含：

- 页面标题：`所有资产`
- 描述：`查看所有艺术品 RWA 代币`
- 状态筛选：`全部 / 进行中 / 即将开始 / 已完成`
- 顶部平台指标：
  - 总锁仓价值：`$12.5M`，辅助：`+23.4% 本月`
  - 活跃项目：`1`，辅助：`3 个即将开始`
  - 总参与者：`8`，辅助：`来自 45 个国家`
  - 完成发售：`0`，辅助：`100% 成功率`
- 资产卡片：
  - 艺术品图片
  - 状态标签
  - 艺术家名
  - 作品名
  - token code，例如 `ART-MIST`
  - 价格
  - 可购份额
  - 发售进度
  - 参与人数
  - 剩余时间
  - `查看详情`

参考 Web 业务逻辑：

- 页面：`/Users/rwa_start/ProjectSource/ArtStarFront/src/pages/Index.tsx`
- 数据 hook：`/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useArtAssets.ts`
- 链上列表 hook：`/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useAssetsOnChain.ts`
- 资产卡片：`/Users/rwa_start/ProjectSource/ArtStarFront/src/components/launchpad/AssetCard.tsx`
- 状态推导：`/Users/rwa_start/ProjectSource/ArtStarFront/src/lib/assetDisplayUtils.ts`

Web 端列表不是纯数据库列表。它先从 Supabase 读取资产基础数据，再批量读取合约状态，并用链上状态覆盖展示状态。

## 数据来源与合约读取

### Supabase 公开资产数据

列表基础数据来自 `art_assets` 关联 `artwork_submissions`：

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
```

约束：

- 只读取 `is_deleted = false` 的资产。
- 默认排序使用 `created_at desc`，状态排序在 domain 层二次处理。
- `artwork_submissions.image_urls[0]` 作为卡片首图。
- `token_price_usdt`、`total_supply` 从数据库字符串转成 domain number / decimal string；UI 不直接解析数据库 row。

### 批量链上读取

Launchpad 需要批量读取每个资产合约的公开状态。Web 端每个资产读取 5 个合约方法：

```ts
type AssetListContractReads = {
  saleActive: boolean;
  sold: bigint;
  saleCap: bigint;
  saleStartTime: bigint;
  saleEndTime: bigint;
};
```

对应合约方法：

- `saleActive()`
- `sold()`
- `SALE_CAP()`
- `saleStartTime()`
- `saleEndTime()`

移动端实现要求：

- 使用 `chainReadClient` / `assetContractReadAdapter` 封装 viem public client，不在 screen / component 调用合约。
- 对无合约地址或 `0x0000000000000000000000000000000000000000` 的资产返回默认值。
- 每页资产批量读取，避免全量资产一次性合约 multicall。
- 链上读取失败时保留数据库列表，卡片显示链状态加载失败 / 待确认，不让整个 Launchpad 失败。
- stale time 建议 30 秒；下拉刷新同时刷新数据库第一页和当前页链上状态。

### 展示状态可信来源

数据库 `status` 只作为兜底和初始筛选参考；badge 展示和排序优先使用链上状态。

### Sale Status Resolution Policy

状态必须由链上数据和链下数据一起判断，但优先级固定：

1. 有有效合约地址，且链上读取成功：使用链上状态作为 `displayStatus`、筛选状态和排序状态。
2. 有有效合约地址，但链上读取中：临时使用数据库 `status` 展示，同时返回 `chainStatus = "loading"` 和 `source = "database_fallback"`。
3. 有有效合约地址，但链上读取失败：使用数据库 `status` 降级展示，同时返回 `chainStatus = "error"`、`source = "database_fallback"`、`canTrustForPurchase = false`。
4. 没有合约地址或零地址：使用数据库 `status` 展示，同时返回 `chainStatus = "unsupported"`、`source = "unsupported"`、`canTrustForPurchase = false`。
5. 购买资格和真实交易永远不能只信数据库 `status`。

推荐 domain 函数：

```ts
type SaleStatusSource = "chain" | "database_fallback" | "unsupported";

type SaleStatusResolution = {
  displayStatus: "active" | "upcoming" | "completed" | "paused";
  source: SaleStatusSource;
  chainStatus: "ready" | "loading" | "error" | "unsupported";
  canTrustForPurchase: boolean;
};

function resolveSaleDisplayState(input: {
  dbStatus: "upcoming" | "active" | "completed" | "paused";
  contractAddress: string | null;
  chainReadState: "ready" | "loading" | "error" | "unsupported";
  chainSaleActive?: boolean;
  chainSoldPercent?: number;
  chainSaleStartTime?: bigint;
  chainSaleEndTime?: bigint;
  nowSeconds: number;
}): SaleStatusResolution;
```

`canTrustForPurchase` 只有在 `source = "chain"` 且 `chainStatus = "ready"` 时才可能为 `true`。即使 `displayStatus = "active"` 来自数据库 fallback，也不能进入购买写流程。

状态推导逻辑参考 Web `resolveDisplayStatus`：

```ts
function resolveDisplayStatus(params: {
  saleActive: boolean;
  soldPercent: number;
  saleStartTime?: bigint;
  saleEndTime?: bigint;
  nowSeconds: number;
}): "active" | "upcoming" | "completed" | "paused" {
  if (params.soldPercent >= 100) return "completed";
  if (params.saleEndTime && params.saleEndTime > 0n && params.nowSeconds > Number(params.saleEndTime)) {
    return "completed";
  }
  if (params.saleStartTime && params.saleStartTime > 0n && params.nowSeconds < Number(params.saleStartTime)) {
    return "upcoming";
  }
  if (params.saleActive) return "active";
  if (
    params.saleStartTime &&
    params.saleEndTime &&
    params.saleStartTime > 0n &&
    params.saleEndTime > 0n &&
    params.nowSeconds >= Number(params.saleStartTime) &&
    params.nowSeconds <= Number(params.saleEndTime)
  ) {
    return "paused";
  }
  return "upcoming";
}
```

列表筛选映射：

- `active` 优先展示链上 `active`；fallback 数据库 `active` 只能作为临时展示。
- `upcoming` 优先展示链上 `upcoming`；fallback 数据库 `upcoming` 只能作为临时展示。
- `completed` 优先展示链上 `completed` 和 `paused`，除非产品另行决定给 `paused` 独立 tab。
- `all` 展示全部。

## 移动端信息架构

桌面端三列卡片在 App 上改为单列列表。移动端首屏顺序：

1. App Header：`Launchpad` + `Connect` / 钱包短地址。
2. 页面标题区：
   - 中文：`艺术资产发行`
   - 英文：`Tokenized Art Launchpad`
   - 简短说明：`精选艺术品资产，按份额发行链上所有权凭证。`
3. Launchpad Summary Strip：横向滑动的指标卡。
4. 状态筛选 tabs：`全部 / 进行中 / 即将开始 / 已完成`。
5. 单列资产列表。

统计区是平台信任背书，应放在筛选控件上方；筛选控件只控制下方资产列表。统计区必须比资产卡片轻，不能抢首屏。

## Launchpad Summary Strip

移动端不使用四列大横卡，改为横向 `ScrollView` 指标条。

每个指标卡字段：

```ts
type LaunchpadMetric = {
  id: "totalValueLocked" | "activeProjects" | "participants" | "completedSales";
  label: string;
  value: string;
  helper: string;
  emphasis: "primary" | "neutral" | "muted";
};
```

展示规则：

- 一屏约展示 2 个指标卡，用户可横滑查看更多。
- `总锁仓价值` 放第一位，权重最高。
- `完成发售` 在早期数据为 0 时使用 muted，不突出。
- 指标卡高度稳定，切换筛选或刷新不跳动。
- helper 文案使用浅色 pill，不使用大面积色块。

默认指标顺序：

1. `总锁仓价值` / `$12.5M` / `+23.4% 本月`
2. `活跃项目` / `1` / `3 个即将开始`
3. `总参与者` / `8` / `来自 45 个国家`
4. `完成发售` / `0` / `100% 成功率`

## Asset Card

移动端资产卡片只承担“快速判断是否点进去”的职责。

卡片必须展示：

- 艺术品图片，固定比例，推荐 `16:10` 或 `4:3`。
- 状态标签：`进行中 / 即将开始 / 已完成`。
- 艺术家名。
- 作品名。
- token code，例如 `ART-MIST`。
- 当前价格，例如 `$0.1 USDT`。
- 可购份额。
- 发售进度：放在价格 / 可购份额下方，作为卡片内部信息。
- 参与人数。
- 剩余时间。

交互：

- 整卡点击进入 Asset Detail。
- 底部可保留轻量 `查看详情`，但不使用巨大黑色按钮占据卡片高度。
- 不在卡片上直接展示购买输入。
- 不在卡片上发起链上动作。

视觉：

- 图片加载前使用固定 skeleton，避免高度跳动。
- token code 使用 `champagne` 点缀。
- 状态标签使用小 pill。
- 进度条高度 6-8，必须收在资产卡片内部，不作为卡片外的页面分隔线。
- 进度条上方保留 `发售进度` 和百分比，进度条下方可放 `参与人数 / 剩余时间`。
- 不做卡片套卡片。

## 状态筛选

状态枚举：

```ts
type AssetSaleFilter = "all" | "active" | "upcoming" | "completed";
```

筛选文案：

| Filter | 中文 | 英文 |
| ------ | ---- | ---- |
| `all` | 全部 | All |
| `active` | 进行中 | Active |
| `upcoming` | 即将开始 | Upcoming |
| `completed` | 已完成 | Completed |

行为：

- 切换筛选后重置到第一页。
- 切换筛选后列表滚动回顶部。
- 切换筛选时清空 pagination cursor。
- 旧请求返回时如果 filter 已变更，不得覆盖当前列表。

## 列表刷新与分页

列表必须使用 `FlatList`，不能用 `ScrollView + map` 渲染资产列表。

状态模型：

```ts
type AssetListStatus =
  | "idle"
  | "initial_loading"
  | "refreshing"
  | "loading_more"
  | "ready"
  | "empty"
  | "error"
  | "end_reached";
```

交互规则：

- 首次进入：显示 skeleton，不使用全屏 spinner。
- 下拉刷新：刷新当前筛选条件下第一页数据。
- 上拉加载：加载下一页，底部显示轻量 loading。
- 切换筛选 tab：重置到第一页，清空 cursor。
- Market 搜索 / 排序：防抖后重新请求第一页。
- 返回页面：保留列表位置和筛选条件；短时间内不强制重拉。

并发边界：

- `refreshing` 时触底，不触发 `loadMore`。
- `loading_more` 时下拉刷新可以取消或等待当前请求，不能合并出重复页。
- 同一个筛选条件下，重复请求需要用 request id 或 cursor guard 忽略旧响应。
- 加载更多失败时保留旧数据，并允许重试。
- 刷新失败时保留旧数据，显示轻量错误提示。
- 没有更多数据时显示轻量 `No more assets` / `没有更多资产`，不要大空态。

分页契约：

```ts
type AssetPageRequest = {
  filter: AssetSaleFilter;
  search?: string;
  sort?: AssetSort;
  cursor?: string;
  pageSize: number;
};

type AssetPageResult = {
  items: PublicAssetSummary[];
  nextCursor: string | null;
  totalCount?: number;
};
```

优先使用 cursor pagination。若后端当前只能支持 page / pageSize，则 repository 内部转换，UI 和 workflow 仍使用 cursor 风格。

## Market

Market 使用同一套列表基础能力，但页面目标不同：

- Launchpad 关注发行状态。
- Market 关注已完成发行后的公开市场浏览。

Market 顶部结构：

1. Header：`Market`。
2. 页面标题：`艺术资产市场`。
3. 搜索框。
4. 排序 / 筛选入口。
5. 单列资产列表。

Market 首版范围：

- 支持搜索和排序的 UI / workflow contract。
- 支持 loading / empty / error / refresh / pagination。
- 资产点击进入 Asset Detail。
- 不实现真实交易下单。

排序枚举：

```ts
type AssetSort = "recent" | "price_asc" | "price_desc" | "progress_desc";
```

## 数据模型

```ts
type PublicAssetSummary = {
  id: string;
  title: string;
  artistName: string;
  tokenCode: string;
  imageUrl: string | null;
  contractAddress: string | null;
  chainId: number | null;
  priceText: string;
  priceAmount: string;
  paymentSymbol: "USDT" | string;
  totalSupplyText: string;
  soldSharesText: string;
  saleCapText: string;
  availableSharesText: string;
  progressPercent: number;
  participantsCount: number;
  remainingTimeText: string | null;
  saleStatus: "active" | "upcoming" | "completed" | "paused" | "sold_out";
  chainStatus: "ready" | "loading" | "error" | "unsupported";
};
```

约束：

- `progressPercent` 必须 clamp 到 `0..100`。
- `soldSharesText`、`saleCapText`、`availableSharesText` 来自链上 `sold / SALE_CAP`，无链上数据时使用数据库兜底或 `--`。
- 金额展示由 domain mapper 生成，UI 不直接拼金额小数。
- `imageUrl` 为空时显示稳定占位，不破坏卡片高度。
- `saleStatus` 是展示状态，优先由链上状态推导；最终购买资格仍以后续详情 / 后端 / 链上为准。

## 业务数据聚合流程

```text
LaunchpadScreen
  -> usePublicAssetList
    -> assetRepository.fetchAssetPage(filter, cursor)
      -> Supabase art_assets + artwork_submissions
    -> assetContractReadAdapter.readListState(currentPageContracts)
      -> viem public client / multicall
    -> assetMappers.toPublicAssetSummary(dbRow, chainState, now)
  -> FlatList render AssetCard
```

Market 首版可复用同一流程，但 repository 查询条件不同：优先展示 completed / marketable 资产。

## 范围

范围内：

- 新增公开资产 repository / mapper / pagination workflow。
- 新增链上 read-only 列表 adapter。
- 新增 Launchpad screen。
- 新增 Market screen。
- 新增 AssetCard。
- 新增 Launchpad Summary Strip。
- 接入当前 navigation 的 `Launchpad` / `Market` tab 内容。
- 覆盖列表状态：loading、empty、error、refreshing、loading_more、end_reached。

范围外：

- 不实现 Asset Detail 内容。
- 不实现购买 / 转账 / approve / mint。
- 不读取用户 USDT balance / allowance。
- 不调用 `generate-signature`。
- 不读取用户持仓或个人 Dashboard 数据。
- 不实现 KYC gate。
- 不实现实时订阅；本 Task 只做手动刷新和分页。

## 预计影响文件

- `src/features/assets/domain/assetModels.ts`
- `src/features/assets/domain/assetMappers.ts`
- `src/features/assets/domain/assetListState.ts`
- `src/features/assets/domain/assetDisplayStatus.ts`
- `src/features/assets/services/assetRepository.ts`
- `src/features/assets/services/assetContractReadAdapter.ts`
- `src/features/assets/hooks/usePublicAssetList.ts`
- `src/features/assets/screens/LaunchpadScreen.tsx`
- `src/features/assets/screens/MarketScreen.tsx`
- `src/features/assets/components/AssetCard.tsx`
- `src/features/assets/components/LaunchpadSummaryStrip.tsx`
- `src/app/navigation/AppNavigator.tsx`
- `src/app/navigation/navigationState.ts`
- `src/features/assets/__tests__/assetMappers.test.ts`
- `src/features/assets/__tests__/assetListState.test.ts`
- `src/features/assets/__tests__/assetDisplayStatus.test.ts`
- `src/features/assets/__tests__/assetContractReadAdapter.test.ts`
- `src/features/assets/__tests__/LaunchpadScreen.test.tsx`
- `src/features/assets/__tests__/MarketScreen.test.tsx`

## 结构验收

- Supabase 查询只能在 `assetRepository`。
- 合约读取只能在 `assetContractReadAdapter` / chain adapter。
- Screen 不直接拼查询，不直接调用 `supabase.from`。
- Screen 不直接 import viem / contract ABI / chain config。
- 列表使用 `FlatList`，key 使用 asset `id`，不得使用 index。
- 金额、进度、状态映射在 domain 层。
- Refresh / pagination 并发规则在 workflow / hook 中处理，不散落在 JSX。
- UI 使用 `Tokenized Art Finance UI System` token。

## 可测试性验收

- mapper 测试覆盖缺图、异常进度、金额格式、状态映射。
- display status 测试覆盖 saleActive、sold out、未开始、已结束、暂停、无合约地址。
- contract adapter 测试使用 fake public client，覆盖 5 个合约方法映射、无合约地址默认值、单资产读取失败。
- pagination state 测试覆盖：
  - initial load success
  - initial empty
  - refresh keeps old items on failure
  - load more appends once
  - load more ignored while refreshing
  - filter change resets cursor and items
  - stale response ignored after filter change
  - end reached prevents more requests
- screen 测试覆盖：
  - Launchpad header / filter / summary / asset card 渲染
  - filter press triggers reset
  - empty state
  - error retry
  - Market search / sort shell

## 验收标准

- 未登录用户可访问 Launchpad / Market。
- Launchpad 展示页面标题、状态 tabs、summary strip、资产列表。
- Market 展示搜索 / 排序入口和资产列表。
- 资产 badge 和排序优先使用链上状态；链上失败时列表仍可展示数据库资产。
- 下拉刷新会刷新当前页数据库数据和当前页链上状态。
- 下拉刷新不闪白。
- 上拉到底只请求一次下一页。
- 没有更多数据时显示轻量 end message。
- 网络失败保留旧数据并支持 retry。
- 切换筛选后列表回顶部并使用新数据。
- 资产卡片点击进入 Asset Detail placeholder 或后续 Task 4 route，不触发购买。

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

- `node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "register-user" -e "generate-signature" -e "get-my-referrals" src/features/assets --glob "*.tsx"`
- `node scripts/verify-no-match.mjs -e "\\.from\\(.+\\)\\.insert" -e "\\.from\\(.+\\)\\.upsert" -e "\\.from\\(.+\\)\\.update" -e "\\.from\\(.+\\)\\.delete" src/features/assets --glob "*.tsx"`
- `node scripts/verify-no-match.mjs "key=\\{.*index\\}" src/features/assets --glob "*.tsx"`
- `node scripts/verify-no-match.mjs -e "writeContract" -e "generate-signature" -e "approve" -e "mint" src/features/assets --glob "*.ts" --glob "*.tsx"`

## 手动 QA

- iOS：进入 Launchpad，切换四个状态 tab。
- iOS：下拉刷新，确认列表不闪白。
- iOS：连续触底，确认只加载一次下一页。
- iOS：断网后刷新，确认旧数据保留且可重试。
- iOS：进入 Market，输入搜索词，确认列表重置到第一页。
- Android：重复以上关键路径。

## 可追溯关系

- 公开 Launchpad。
- Market 浏览。
- 列表性能。
- 公开资产详情入口。

## 实现状态

Planned。
