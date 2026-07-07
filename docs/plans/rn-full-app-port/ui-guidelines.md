# UI Guidelines：Tokenized Art Finance UI System

日期：2026-07-03
Feature slug：`rn-full-app-port`
状态：Draft

## 定位

MyTradeApp 的移动端 UI 主题定为 **Tokenized Art Finance**：Web3 艺术品代币化金融平台。

产品气质不是传统交易所，也不是 NFT 潮流社区。它应该同时传达三件事：

- 艺术品可信资产化：像画廊、拍卖行、收藏机构，有审美和凭证感。
- 金融化交易与收益：像投资平台，信息清晰、状态明确、数据可信。
- Web3 所有权证明：钱包、链上、代币、凭证存在，但不使用赛博霓虹或币圈噪音。

设计关键词：

- 克制
- 高级
- 可信
- 资产感
- 链上感

## 视觉方向

推荐主题名：**Tokenized Art Finance UI System**

核心表达：

- 背景像艺术机构的展厅墙面，温暖、干净、不刺眼。
- 卡片像资产凭证、认购票据、艺术品证书，而不是普通营销卡片。
- 按钮像金融操作控件，稳定、明确、可点击，不做夸张渐变。
- 图标保持线性、克制，服务识别，不做装饰。
- 页面优先可扫描和可操作，不做大面积 hero 和空洞介绍。

## 色彩

| Token | Value | 用途 |
| ----- | ----- | ---- |
| `background` | `#F7F7F2` | App 全局背景，温暖浅灰白 |
| `surface` | `#FFFFFF` | 卡片、sheet、列表容器 |
| `surfaceMuted` | `#F1F3EE` | 次级块、链接展示框、禁用背景 |
| `text` | `#172026` | 主文字，接近黑的深墨色 |
| `muted` | `#66727A` | 说明文字、次级元信息 |
| `border` | `#DDE2DD` | 分割线、卡片边框 |
| `primary` | `#1E6B5C` | 主操作、选中状态、钱包连接 |
| `primarySoft` | `#E4F1ED` | 主色浅背景、tab 选中底 |
| `primaryStrong` | `#154C42` | 按下态、强调态 |
| `artGreen` | `#159100` | 邀请类型选中、正向状态 |
| `champagne` | `#B8872B` | 收益、等级、艺术资产价值点缀 |
| `danger` | `#A33A2D` | 错误、失败、危险操作 |

禁止：

- 大面积紫色 / 蓝紫渐变。
- 大面积霓虹色。
- 单一绿色铺满全部界面。
- 纯黑背景默认主题。
- NFT 卡通、像素风或过度可爱图标。

## 字体层级

移动端需要克制的标题层级。不要因为页面空就把字体放大。

| Token | Size | Weight | 用途 |
| ----- | ---- | ------ | ---- |
| `display` | 30 | 800 | 少量关键页面标题，不用于列表卡片 |
| `title` | 24 | 800 | 页面主标题、重要 sheet 标题 |
| `sectionTitle` | 18 | 700 | 分区标题、卡片标题 |
| `body` | 16 | 500 | 正文、列表行标题 |
| `bodyStrong` | 16 | 700 | 按钮、重要正文 |
| `caption` | 13 | 600 | Header eyebrow、tab label、状态标签 |
| `meta` | 12 | 500 | 链、地址、时间、辅助说明 |

Header 标题建议使用 `title` 或更小。灵动岛机型上，居中标题不能顶到安全区中线。

## 间距与圆角

| Token | Value | 用途 |
| ----- | ----- | ---- |
| `xs` | 4 | 图标和文字内距 |
| `sm` | 8 | 轻量元素间距 |
| `md` | 16 | 列表左右内距、按钮内距 |
| `lg` | 24 | 页面边距、section 间距 |
| `xl` | 32 | 大 section 间距 |

圆角：

- `sm`: 6，用于小标签、轻量控件。
- `md`: 10，用于输入框、列表容器。
- `lg`: 14，用于主按钮、sheet 内卡片。
- `xl`: 20，用于 bottom sheet 顶角。

禁止卡片套卡片。页面 section 不要做成一个大浮动卡片。卡片只用于资产、持仓、交易、KYC 状态、推荐记录等独立信息单元。

## Header

目标：像金融 App 的操作栏，不像网页 hero。

规则：

- Header 高度应随 safe area 计算，内容垂直避开灵动岛。
- 标题居中，字重 800，字号 22-24。
- 左侧可放 scope 文案或返回按钮，但不能遮挡标题。
- 右侧只放一个主动作：`Connect` / 钱包短地址 / 设置图标。
- 登录按钮不使用大胶囊，不占据 Header 视觉中心。

推荐登录按钮：

- 文案：`Connect` 或 `Sign in`。偏 Web3 钱包语境时用 `Connect`。
- 高度：44。
- 圆角：16。
- 背景：`primary`。
- 字号：15-16，字重 700。
- 左右 padding：16-18。

已登录状态：

- 显示短地址，例如 `0x7A...91`。
- 使用 `primarySoft` 背景和 `primary` 文本。
- 不在 Header 展示完整钱包地址。

## Bottom Tab

底部主导航固定 5 个：

1. Launchpad
2. Market
3. Referral
4. Dashboard
5. My

访问规则：

- `Launchpad`、`Market`、`Referral`、`My` 未登录可访问。
- `Dashboard` 未登录点击触发登录，不展示假数据。
- Wallet、KYC、邀请好友、Settings 收纳到 `My`，不放入底部主 tab。

视觉规则：

- 每项必须有线性图标 + 短标签。
- 图标 24，标签 12-13。
- 选中态使用 `primarySoft` 背景、`primary` 图标和文字。
- 未选中态使用 `muted`。
- 保持稳定宽高，切换时不能挤压文字或导致换行。

## My / Profile

My 是账户入口，不是 Dashboard。

内容结构：

- 顶部可以显示用户身份摘要、KYC 状态或钱包短地址。
- 主列表采用 iOS 设置页式 row：
  - 左侧标题。
  - 可选副标题。
  - 右侧 chevron。
  - 每行底部分割线。
- Sign out 必须与设置列表分区，不要混在列表内部。

推荐 My 列表：

- Wallet
- KYC
- 邀请好友
- Settings

Sign out：

- 独立 section。
- 可以是 outlined danger 或低强调按钮。
- 不建议使用和主登录一样的深绿实心按钮。

## Invite Sheet

邀请好友使用 bottom sheet，符合移动端交互。

结构：

- 顶部：标题 `选择邀请类型`，右侧关闭图标。
- 说明：`复制链接发送给你的朋友即可完成邀请。`
- 类型选择：
  - `投资者`
  - `藏家 - 需艺委会审核评级，授予声誉积分`
  - `艺术家 - 需艺委会审核评级，授予声誉积分`
  - `机构 - 需艺委会审核评级，授予声誉积分`
- 链接框：浅灰背景，展示生成链接。
- 操作：`Copy link` 或系统分享按钮。

视觉规则：

- Sheet 顶角 `xl`。
- 选中项使用浅绿背景和绿色边框。
- 未选中项白底、浅边框。
- 链接框使用 `surfaceMuted`，不要和主按钮争抢。

## Launchpad / Market

这两个页面决定产品第一印象。

Launchpad：

- 像艺术资产发行入口。
- 强调状态：Upcoming、Open、Closed、Sold out。
- 资产卡片需要固定图片比例，避免列表跳动。
- 主行动不是“Buy now”满屏轰炸，而是根据状态显示 `View details` / `Join sale`。
- 顶部平台统计使用横向 Summary Strip，不照搬桌面四列大卡。
- Summary Strip 是信任背书，不是主内容；资产图、作品名和发售状态才是 Launchpad 主角。
- 列表必须支持下拉刷新和上拉加载，不能一次性拉全量。
- 首次加载使用 skeleton，下拉刷新不闪白，上拉加载不重复请求下一页。

Market：

- 像艺术代币市场。
- 支持搜索、排序、状态筛选。
- 信息密度可以高于 Launchpad，但仍避免桌面表格思维。

详细 Task 方案：

- `docs/plans/rn-full-app-port/tasks/2026-07-03-task-03-public-assets-launchpad-market.md`

## Asset Detail

资产详情页不能把桌面左右栏压缩到手机上。

移动端结构：

- 大图。
- 状态标签、token code、艺术家、作品名。
- 当前价格、发售进度、参与者、已筹资、剩余时间。
- 资格状态提示。
- Sticky segmented tabs：`详情 / 估值 / 规则 / 链上`。
- 底部固定 CTA。

购买输入不直接放在详情页内容里。点击底部 CTA 后，后续购买流程使用 bottom sheet 承载金额输入、余额、份额预估和确认动作。

详情 tabs：

- `详情`：作品描述、艺术家、项目说明。
- `估值`：估值机构、日期、金额、报告编号、市场分析、免责声明、完整报告外链。
- `规则`：总发行量、公开发售、预留股份、解锁条件、结算资产、白名单要求、发售后权益。
- `链上`：合约地址、代币标准、区块链、事件时间线、区块浏览器外链。

详细 Task 方案：

- `docs/plans/rn-full-app-port/tasks/2026-07-03-task-04-asset-detail-readonly-layout.md`

## Dashboard

Dashboard 是已登录工作台。

优先级：

1. KYC / account readiness。
2. Holdings / asset value。
3. Pending actions。
4. Recent activity。
5. Referral / points summary。

不要做欢迎页。用户登录后要看到资产、状态和下一步动作。

## Motion

动效服务状态变化，不做装饰。

- Tab 切换：轻微 opacity / background transition。
- Bottom sheet：从底部进入，带阻尼。
- Loading：使用 skeleton 或稳定高度，不要 spinner 占满屏。
- 交易 / 注册 / KYC：状态变化要明确，避免用户怀疑是否成功。

## Copywriting

语言要像金融产品，不像营销落地页。

推荐：

- `Connect`
- `View details`
- `Complete KYC`
- `Copy link`
- `Tokenized art assets`
- `Sale opens soon`

避免：

- `Start your amazing journey`
- `Discover infinite possibilities`
- `Join the revolution`
- 过度解释 App 功能的长文案。

## Code Rules

新增 UI 必须优先使用共享 token：

- `src/shared/ui/theme.ts`
- `src/shared/ui/Button.tsx`
- `src/shared/ui/AppText.tsx`
- `src/shared/ui/Card.tsx`

新增 screen 不允许随手硬编码新主题色。确实需要新色值时，先补到本文件和 `theme.ts`，再使用。

新增可复用控件建议放在：

- `src/shared/ui/AppHeaderButton.tsx`
- `src/shared/ui/ListRow.tsx`
- `src/shared/ui/BottomSheet.tsx`
- `src/shared/ui/StatusPill.tsx`

每个后续 Task 的 UI 验收需要检查：

- 是否符合 Tokenized Art Finance 主题。
- 是否使用共享 token。
- 是否避免卡片套卡片。
- 是否覆盖 loading、empty、error、disabled 状态。
- 是否在 iPhone 灵动岛和小屏设备上不遮挡内容。

## Prototype

当前主题原型：

- `docs/prototypes/rn-tokenized-art-finance-theme.svg`
- `docs/prototypes/rn-task03-04-launchpad-detail-flow.svg`

主题原型用于统一审美方向；Task 3 / 4 信息架构原型用于确认 Launchpad 列表、资产详情、详情 tabs、购买 bottom sheet 的信息组织方式。它们不作为像素级实现稿。后续如进入 Figma，可以以此为初版设计 brief。
