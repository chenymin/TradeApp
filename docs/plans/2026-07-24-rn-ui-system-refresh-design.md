# 方案设计：React Native UI System Refresh

日期：2026-07-24
Feature slug：`rn-ui-system-refresh`
状态：草稿

## 背景

当前 UI 已具备完整业务能力，但全局 token 只有少量颜色、三档字号和四档间距。Dashboard 首屏同时展示导航标题、页面标题、错误条、四个同权指标卡、佣金卡和四个 Tab；Wallet 则以多个同权白色 section 承载身份、余额、linked wallets 和 Receive。结果是内容齐全但主次不清，骨架加载仍使用无结构灰块，且导航 chrome 缺少稳定的品牌与层级表达。

## 推荐方案

采用用户确认的 `Institutional Clarity + Restrained Apple Glass`：

- `Institutional Clarity` 负责信息层级：一个核心摘要、紧凑辅助信息、扁平数据行、少卡片和稳定语义色。
- `Restrained Apple Glass` 只负责页面 chrome 和控制层：顶部栏、Dashboard 分段控制、底部导航和临时操作层。核心金额、数据列表、错误和危险操作保持实色。
- Dashboard 与 Wallet 是首批完整迁移样板；只有 token、文字、玻璃和骨架进入公共 UI 层。图标按钮继续沿用现有 Pressable/Button 组合，区块标题、指标行和业务摘要保留在各 feature 内，其他业务页面内容延后迁移。
- 不改变 loader、workflow、导航目标、钱包状态机、数据访问或后端契约。

已批准的本地视觉稿：

- `.superpowers/brainstorm/34432-1784817100/content/visual-directions.html`
- `.superpowers/brainstorm/34432-1784817100/content/glass-and-skeleton.html`
- `.superpowers/brainstorm/34432-1784817100/content/dashboard-wallet-structure.html`

这些 HTML 仅是本地评审证据；本文件和后续 `DESIGN.md` 才是长期 source of truth。

## 视觉系统

### 设计原则

1. 每个页面只有一个主视觉焦点。Dashboard 为 portfolio value；Wallet 为 active wallet identity。
2. 信息通过字号、字重、留白和分隔线建立层级，不通过反复套卡片建立层级。
3. 颜色必须表达含义。祖母绿表示主操作、选中或正向状态；危险色只表示失败和破坏性操作。高频切换控件的当前选项使用 `primary` 实色底与白字，不用白底叠白色玻璃的低对比组合。
4. 玻璃是 chrome，不是内容容器。数据可读性始终优先于材质效果。
5. loading UI 必须预告真实布局，不能用匿名小方块占位。

### Color Tokens

| Token | Value | 用途 |
| ----- | ----- | ---- |
| `background` | `#F4F7F4` | 页面底色 |
| `surface` | `#FFFFFF` | 实色内容面 |
| `surfaceSubtle` | `#EDF2EF` | 次级分组与静态回退 |
| `ink` | `#172421` | 核心摘要深色面 |
| `text` | `#172026` | 主文字 |
| `muted` | `#66736E` | 辅助文字 |
| `border` | `#D8E0DC` | 分隔线 |
| `primary` | `#176B58` | 主操作与选中态 |
| `primaryStrong` | `#0F4E40` | pressed / 强调 |
| `primarySoft` | `#E0EEE8` | 低强调选中背景 |
| `positive` | `#147A5D` | 正收益、成功 |
| `warning` | `#A46718` | 需要关注但未失败 |
| `danger` | `#A33A2D` | 错误与破坏性操作 |
| `dangerSoft` | `#F7E7E3` | 错误背景 |
| `champagne` | `#B8872B` | 低频品牌强调，不用于 CTA |
| `glassFill` | `rgba(255,255,255,0.72)` | 非原生玻璃回退 |
| `glassBorder` | `rgba(255,255,255,0.88)` | 玻璃边缘 |

玻璃背景下的文字和图标不使用动态取色；每个 `GlassSurface` 都带固定的高对比前景 token 与不透明 fallback。

### Typography

本阶段使用平台原生 sans 字体，iOS 保持 SF 系统字体体验，Android 保持原生字体渲染，不引入远端字体或额外字体 bundle。所有字距为 `0`，金额使用 `fontVariant: ["tabular-nums"]`。

| Variant | Font size / line height | Weight | 用途 |
| ------- | ----------------------- | ------ | ---- |
| `display` | `32 / 38` | `800` | 核心金额，单屏最多一个 |
| `pageTitle` | `26 / 32` | `800` | 页面标题 |
| `sectionTitle` | `18 / 24` | `800` | 一级区块标题 |
| `body` | `15 / 22` | `500` | 正文与列表主文案 |
| `label` | `13 / 18` | `700` | 字段标签、按钮文字 |
| `caption` | `12 / 17` | `500` | 次要说明 |
| `micro` | `11 / 14` | `700` | badge 与极短状态 |
| `numberRow` | `16 / 22` | `700` | 列表金额 |

### Spacing And Shape

- 基础单位为 `4`：`4, 8, 12, 16, 20, 24, 32, 40`。
- 手机页面水平 padding 为 `20`，一级区块间距为 `24`，同一区块内部间距为 `12-16`。
- 圆角只使用 `4 / 6 / 8`；`full` 仅用于头像和状态 pill。
- 所有交互目标至少 `44 x 44` points。
- 阴影只用于玻璃 chrome 和浮层，内容列表不使用阴影。

### Motion

- press feedback：`120-180ms` opacity / scale，不能改变布局尺寸。
- chrome transition：`180-240ms`，仅在帮助理解层级时使用。
- skeleton pulse：`1200-1600ms` 低对比 opacity 循环，一个区块共享一个动画值。
- 系统启用 Reduce Motion 时，骨架和非必要 transition 变为静态。

## 克制玻璃实现

新增 `GlassSurface` 作为唯一玻璃入口，业务组件不得直接 import 原生玻璃或模糊库。

选择顺序：

1. 用户启用 Reduce Transparency：直接渲染高对比实色 `View`。
2. iOS 26 且 `expo-glass-effect` 可用：固定 chrome 使用原生 Liquid Glass。
3. 旧 iOS：使用 `expo-blur` 的轻量 blur + 固定 tint、border 和 shadow。
4. Android：默认使用 `glassFill + glassBorder + shadow` 的静态半透明回退，不启用持续 live blur；只有后续独立性能证据允许时才升级 Android blur。
5. 任何原生能力不可用：回退到 `surface` 或 `surfaceSubtle`，不影响布局与操作。

通过 `npx expo install expo-glass-effect expo-blur` 使用 Expo 57 对应版本；仓库的 `bundledNativeModules.json` 固定两者为 `~57.0.0`。不引入第三方 glass UI kit。

玻璃只用于：

- `AppHeader`
- `BottomTabBar`
- Dashboard `SegmentedControl`
- Invite / confirmation 等临时 overlay 的外层容器

玻璃禁止用于：

- portfolio / active wallet 核心摘要
- holdings、balances、linked wallets 列表行
- error / warning / recovery 区
- `Use`、Bind、Retry、Delete 等语义操作本体
- QR 背景

## 内容同形骨架

新增共享 `SkeletonGroup` 和 `SkeletonBlock`：

- `SkeletonGroup` 管理单个 Animated value、Reduce Motion 和 accessibility `progressbar`。
- `SkeletonBlock` 只表达 `width`、`height`、`radius` 和 tone，不单独创建动画。
- 页面级骨架保留在 feature 内，复刻真实组件结构：`DashboardSummarySkeleton`、`DashboardRowsSkeleton`、`WalletBalanceSkeleton`。
- loader 从 `loading` 进入 `ready / empty / partial_unavailable / error` 时使用相同容器尺寸，避免布局跳动。
- 骨架颜色使用 `surfaceSubtle / border`，不使用纯黑白高反差扫光。
- 不新增 skeleton 第三方依赖，不为每个 block 创建 timer 或 Reanimated worklet。

Dashboard loading 不再用 `$0.00` 冒充已加载值，也不再只显示 `Loading dashboard...`；核心摘要、四个辅助指标槽和前两条数据行使用同形骨架。Wallet balance loading 使用 symbol 图标、symbol/contract 两段文字和右侧金额形状，不再使用三个 `64px` 实心矩形。

## 页面结构

### Dashboard

1. 公共玻璃 Header 显示 ARTSTAR 品牌和既有 wallet status；feature refresh 仍留在 Dashboard 内容层，不跨层传给 AppShell。
2. 内容身份区显示 `Dashboard`、nickname/email 和 refresh；移除公共 `Home` + 内部 `Dashboard` 的重复标题语义。
3. 全宽实色深墨 summary 显示 portfolio value 与 PnL。
4. Tier/points、KYC、commission、asset count 使用两列扁平指标，不再使用四个同权卡片和独立 commission 卡。
5. 四个既有业务 Tab 使用玻璃 `SegmentedControl`，当前选项使用 `primary` 实色底与白字，其他选项保持透明灰字；value 和 route 行为保持不变。
6. holdings / transactions 保留 `FlatList` 和既有 key，列表改为分隔行；empty、partial warning 和 refresh 行为保留。
7. Whitelist 与 Rewards 的业务内容本轮不重排，只消费更新后的公共 header、tabs 和 token；其完整页面迁移仍在范围外。

### Wallet

1. 公共玻璃 Header 显示 ARTSTAR 与 Back；页面内容显示 `Wallet`、chain name 与 chain id。
2. 全宽实色深墨 summary 显示 active address、provider/kind 和 active 状态，不改变 canonical identity 来源。
3. balances 使用扁平行并显示 token identity、contract/native 辅助信息和右侧金额；refresh 保留在 section header。
4. linked wallets 使用稳定三列：身份、selection action slot、unlink action slot。spinner、Use、Connect、Remove link、Delete 和 Retry 仍与当前 target/state 对齐。
5. Bind another wallet 是实色或描边主操作，不放在玻璃行内。
6. Receive 保留 QR、完整可选地址、copy/text/image share；QR 使用纯白实色背景，避免玻璃干扰扫码。
7. phone 单列顺序为 active identity → balances → linked wallets → Receive；wide layout 保留两列，但不做平板专用重设计。

## 导航层决策

- `AppHeader` 增加视觉 variant，而不是把 feature action 提升到全局导航。
- Dashboard 与 Wallet 使用 brand variant：Header 中显示 `ARTSTAR`，页面内部保留唯一可访问页面标题。
- 其他页面继续使用 route-title variant，避免本轮间接迁移全部页面内容。
- `BottomTabBar` 保留真实 5 个 route、顺序、登录门禁和 callback，只替换 surface、selected state、spacing 和 typography。
- Dashboard / Wallet 的视觉重构不得改变 `MainTabs` route state、detail return target 或 wallet route 入口。

## Open Questions Resolution

| 需求中的开放问题 | 处理结论 | 是否阻塞开发 |
| ---------------- | -------- | ------------ |
| 非阻塞：具体字体、字号、颜色值、间距比例和共享组件 API 在方案设计阶段确定；需求阶段只固定视觉方向与用户结果。 | Resolved：采用本文 token；共享边界只包含 theme/AppText/GlassSurface/Skeleton；图标按钮沿用现有交互 primitive，业务区块标题留在 feature 内 | No |
| 非阻塞：平板继续使用现有响应式行为并保证无布局破坏，但平板专用视觉编排延后。 | Deferred：保留当前 `width >= 768` 两列与无破坏验收，不新增 tablet composition | No |
| 风险：共享 token 和 primitives 会影响两个样板页的多个状态；实施必须按 token、primitive、Dashboard、Wallet 分层提交和验证，避免一次性全局替换。 | Resolved：按 theme → primitive → navigation chrome → Dashboard → Wallet 分层实施和提交 | No |
| 风险：视觉简化可能误删低频错误或恢复入口；方案和测试必须逐一映射现有状态机状态。 | Resolved：状态映射表、Wallet target action slots 和连续 mutation tests 为阻塞验收 | No |
| 风险：实时模糊和同时运行的骨架动画可能增加 GPU、内存和耗电；方案必须限制模糊层数量、动画范围并验证低端 Android 的滚动和交互稳定性。 | Resolved：Android 默认无 live blur；每个 SkeletonGroup 单动画值；真机性能门禁 | No |
| 风险：半透明表面会受到背景颜色影响；方案必须为文字、图标、选中态和危险操作定义不依赖背景猜测的对比度回退。 | Resolved：固定前景 token、border 与 opaque fallback；Reduce Transparency 强制实色 | No |
| 已确认：终端最终选择为 `Institutional Clarity`；浏览器中的其他点击仅视为比较过程，不改变最终方向。 | Resolved：采用 `Institutional Clarity` | No |
| 已确认：玻璃强度选择为 `Restrained Apple Glass`，全玻璃方向不采用。 | Resolved：采用 `Restrained Apple Glass`，拒绝 full glass | No |

## Decision Notes

| 决策 | 原因 | 影响 |
| ---- | ---- | ---- |
| 平台原生字体，不新增字体 bundle | 与 Apple chrome 协调，减少 bundle、字体加载和中英文兼容风险 | Android 字形不会与 iOS 完全相同，但尺寸和层级一致 |
| iOS native glass，Android 静态玻璃回退 | Apple 风格与跨平台性能不能用同一 live blur 实现强行等价 | 视觉层级一致，材质细节按平台能力降级 |
| 公共 Header 用 brand variant，feature action 不上移 | 解决重复标题，同时避免 AppShell 知道 Dashboard refresh 或 Wallet balance refresh | feature 继续拥有自身副作用和测试边界 |
| 不抽象所有数据行与区块标题 | Dashboard holding、transaction、wallet 和 balance 的语义不同，标题 command slot 也绑定各自副作用 | 只共享 token、文字、玻璃和骨架，feature summary/row/header 保持内聚 |
| 不新增通用 IconButton | 现有 Pressable/Button 已能表达命令；本轮只有少量图标操作，新增抽象无法消除真实复杂度 | 使用 token、44x44 最小尺寸和 accessibility label 约束既有交互 primitive |
| 不使用第三方 skeleton library | 当前骨架形状简单，第三方库增加 bundle 和动画控制成本 | 使用 React Native Animated 与共享 group 即可 |
| 不在 loading 时显示零值 | `$0.00` 容易被误解为真实资产结果 | loading、empty 和 real zero 三种状态视觉可区分 |

## 分层边界

- UI：shared primitives 只处理视觉、accessibility 和低频系统偏好；feature components 将既有业务状态映射到视觉结构。
- Workflow / service：保持现状；Dashboard loaders、wallet selection/unlink workflows 和 receive actions 不因视觉重构改变。
- Data / external provider：保持现状；不新增请求、表访问、RPC、Edge Function、链调用或 provider SDK 调用。

## 代码结构边界

| 文件 / 模块 | 动作 | 职责 |
| ----------- | ---- | ---- |
| `DESIGN.md` | New | 全 App 视觉 source of truth，记录本方案 token 与使用规则 |
| `src/shared/ui/theme.ts` | Modify | 颜色、文字、间距、圆角、motion 与 glass fallback token |
| `src/shared/ui/AppText.tsx` | Modify | 稳定 variant 与数字 variant，不承载业务状态 |
| `src/shared/ui/GlassSurface.tsx` | New | 原生 glass / blur / static fallback 的唯一 adapter |
| `src/shared/ui/Skeleton.tsx` | New | 单动画组与基础 block，不包含 feature 文案或业务状态 |
| `src/app/navigation/components/AppHeader.tsx` | Modify | glass chrome 与 brand/route-title variant |
| `src/app/navigation/components/BottomTabBar.tsx` | Modify | glass chrome，保留现有 route contract |
| `src/features/dashboard/components/*` | Modify / New | Dashboard 结构、summary 与 feature-specific skeleton |
| `src/features/dashboard/screens/DashboardScreen.tsx` | Modify | 只映射既有 loader state、渲染列表和触发既有 commands |
| `src/features/wallet/components/*` | Modify / New | active summary、balance/list/receive 结构与 balance skeleton |
| `src/features/wallet/screens/WalletScreen.tsx` | Modify | 只组合既有 identity、workflow state 与新版 presentation |

不新增 registry、handler map 或业务 strategy。视觉 effect 选择只在 `GlassSurface` 内部使用小型 capability selector；页面不得复制 platform 分支。

图标命令不新增公共组件：Dashboard refresh、Wallet refresh、copy/share/back 等继续使用当前 Button 或 Pressable 路径，并统一应用 theme token、至少 `44 x 44` 的触控尺寸和明确 accessibility label。只有实施中出现三个以上语义一致且行为一致的重复点时，才允许通过新的设计评审提出共享抽象，本阶段实现计划不得预设该抽象。

## 模块内聚与可测试性

- `selectGlassPresentation(input)` 是纯函数，输入 platform、native availability、reduce transparency 和 variant，输出 `native_glass | blur | translucent | opaque`。
- `getSkeletonAnimationMode(reduceMotion)` 是纯函数，输出 `pulse | static`。
- shared primitives 用注入/prop 测试 presentation，不要求测试环境加载真实 native glass module。
- Dashboard 与 Wallet component tests 使用现有 deterministic loaders/workflows，验证状态、可访问名称、action slot 和结构，不访问真实网络。
- 请求、写入、导航和全局 auth state 仍只存在于原模块；Glass 和 Skeleton 不触发业务副作用。
- 新增的系统 accessibility 监听必须在卸载时清理；其状态变化低频，不进入 AuthProvider 或钱包 workflow。

## 数据流

1. 现有 Auth Viewer、Dashboard loader 或 Wallet workflow 产生可信业务状态。
2. Screen 根据现有 discriminated union / status 选择 ready、loading、empty、partial、error 或 mutation presentation。
3. loading 分支渲染 feature-specific skeleton；其他分支渲染真实数据或错误恢复入口。
4. shared UI 从 theme 读取 token，不读取 Viewer、wallet、token、network 或 storage。
5. `GlassSurface` 读取低频系统 accessibility/capability 状态并选择视觉 adapter，不改变业务状态。
6. 用户操作继续调用现有 Dashboard refresh、wallet selection/unlink 或 receive action。
7. 结果继续由现有 workflow/Viewer 收敛；视觉层不得自行判定成功。

## 状态与实时行为

- 可信来源：需求文档中列出的 Viewer、loader 和 wallet workflow。
- 业务状态机：不新增，也不改动现有合法流转。
- 新增 presentation mode：`glass = native_glass | blur | translucent | opaque`；`skeleton = pulse | static`。它们只能影响材质和动画。
- 无 realtime、webhook、polling、缓存或后台任务变更。
- Wallet `complete` 后回到 idle、selection/unlink 互斥和 target row spinner 等既有规则必须继续通过连续操作测试。

## 代码规则适用性

| 规则 | 适用 / 不适用 | 约束或决策 |
| ---- | ------------- | ---------- |
| 状态机 / 可信边界 / 副作用 | 适用 | 不改业务状态机；UI 只消费状态并调用既有 command；visual mode 不代表业务结果 |
| 数据访问 / 性能 / 测试追踪 | 适用 | 无新数据访问；Android 不启用 live blur；每个验收场景进入实现追踪矩阵 |
| 配置密钥 / 兼容回滚 | 适用 | 无 env 与 secret；原生依赖必须 dev build；可按 primitive/page 分层回滚 |
| Auth | 适用但无契约变更 | session unavailable、logout 和受保护 route 保持现状；UI 不读写 token |
| Database / RLS / index | 不适用变更 | 无 schema、migration、query、RLS、index 或事务变化；实现扫描禁止新增 UI 数据写入 |
| Frontend performance | 适用 | 保留 FlatList；限制 glass 层与 skeleton animation；避免高频 Context 和 render 内不稳定 props |

## 失败模式

| 失败情况 | 用户影响 | 处理方式 |
| -------- | -------- | -------- |
| Liquid Glass 不可用或 native module 未加载 | glass surface 无法渲染 | capability selector 回退 blur/translucent/opaque；安装后必须执行 native rebuild |
| 用户启用 Reduce Transparency | 半透明可能影响可读性 | 所有 GlassSurface 强制实色 fallback |
| 用户启用 Reduce Motion | pulse 造成不适 | SkeletonGroup 静态显示 |
| Android 静态玻璃与 iOS 材质不同 | 跨平台像素不完全一致 | 验收信息层级、颜色与间距一致，不要求材质像素等价 |
| skeleton 尺寸与真实内容不同 | 数据出现时页面跳动 | skeleton 与 content 共用稳定容器尺寸和 row metrics |
| partial data 被新版 summary 隐藏 | 用户误以为全部数据正常 | 保留 warning 与 unavailable label；partial state component tests 阻塞交付 |
| Dashboard loading 显示假零值 | 用户误判资产为零 | loading 使用骨架；真实 `0` 只在 loader ready 后显示 |
| Wallet mutation 状态在重构中丢失 | Use/Delete/Retry 错位或永久 disabled | 保留 target action slots、状态映射和连续 mutation 回归测试 |
| 长金额或 Dynamic Type 溢出 | 金额遮挡操作 | 固定 grid/flex shrink、tabular nums、必要时单行缩放；设备 QA 覆盖 |
| blur 叠层导致掉帧 | 滚动卡顿、耗电 | 只允许 chrome，Android 禁 live blur；性能不达标时 feature flagless 回退 opaque |

## 权限与安全

- 已登录和未登录 route、Auth Viewer、wallet status 与 session recovery 全部沿用现有导航/auth 边界。
- Glass/Skeleton 不读取 token、wallet provider response、数据库数据或 storage；它们只接收 presentation props。
- 完整 wallet address 只保留在既有用户可见、可选择和 accessibility 场景；不新增日志、analytics 或截图持久化。
- Delete/Remove link 必须继续使用危险色、明确 accessibility label 与现有 confirmation，不得因玻璃背景弱化。
- 不新增客户端权限判断；wallet active/linked/eligible 仍由现有 canonical identity 与 workflow selector 提供。

## 安全 Review

| 检查 | 结论 | 证据 / 后续动作 |
| ---- | ---- | --------------- |
| Auth/session 契约 | Pass by design | 不修改 AuthProvider、session storage、token refresh 或 route guard |
| 前端可信边界 | Pass by design | visual components 不推导 wallet eligibility 或 Viewer success |
| Secret/token 泄漏 | Pass by design | 无新增日志、网络或 storage；实现计划保留 token/session forbidden scans |
| 破坏性钱包操作 | Pass with regression gate | Delete/Remove link 保持实色 danger、确认和 target state；连续操作测试阻塞交付 |
| 视觉证据隐私 | Pass with manual rule | 截图只使用 deterministic fixture 或经用户批准的脱敏账号，不保存完整地址和邮箱 |

## 数据 Review

- 表、字段、RLS、索引、事务和 migration：全部无变更。
- 读取路径：继续由现有 Dashboard repositories/loaders 与 Wallet adapters 提供；shared UI 不 import Supabase client。
- 写入路径：继续由既有 wallet workflows / Edge Functions 执行；UI 不新增 `.insert/.update/.upsert/.delete`。
- 一致性：Viewer、wallet active state 与 mutation convergence 规则保持现状；玻璃或骨架不得提前显示成功。
- 性能：无新增 query、N+1、轮询、Realtime 或缓存失效。
- 后续实现计划必须运行 UI 直写表扫描并确认零新增命中。

## 性能 Review

- 新增依赖只有 Expo SDK 对齐的 `expo-glass-effect` 与 `expo-blur`；不引入 UI kit、skeleton library 或字体 bundle。
- Android 默认静态半透明，不承担 live blur GPU 成本。
- iOS 同时可见的 glass 层最多为 Header、一个 segmented control 和 BottomTabBar；列表行不使用 blur。
- 一个 SkeletonGroup 只有一个 Animated value；block 数量不产生额外 timer/listener。
- Dashboard 继续使用 FlatList 与稳定 domain key，不把大列表改为 ScrollView。
- accessibility preference 是低频状态，不放入 AuthProvider 或 wallet context；监听必须 cleanup。
- 不为形式添加 useMemo/useCallback；只在 stable adapter props 或现有 workflow identity 需要时使用。
- 设备门禁：iOS/Android 滚动与 tab/mutation 操作无明显掉帧；若失败，先回退 blur，不允许降低数据层级或删除状态。

## 最佳实践 Review

- 共享的是视觉语言与能力 adapter，不强行共享不同业务语义的数据行。
- Glass native package 只在 adapter 边界，页面不出现 Platform/SDK 分支。
- loader/workflow/domain 与 UI 继续分离，视觉重构不搬运业务判断。
- 状态测试覆盖 ready 之外的 loading、empty、partial、error、mutation 和 recovery。
- 组件尺寸通过 token 与稳定 grid/flex 约束，避免 spinner、长文本和按钮改变布局。
- `DESIGN.md` 作为未来页面迁移的约束，避免后续各页面重新发明颜色和间距。

## 测试策略

```text
Pure selectors
  [unit] glass capability + reduce transparency -> correct presentation mode
  [unit] reduce motion -> static skeleton

Shared UI
  [component] GlassSurface native/blur/static fallback
  [component] SkeletonGroup one progress surface + stable blocks
  [component] existing Button/Pressable commands retain 44x44, disabled and accessibility contracts

Navigation
  [component] Dashboard/Wallet brand header, other routes retain title
  [component] exact 5 tabs, one selected, callbacks unchanged

Dashboard
  [component] loading skeleton, ready zero, empty, partial warning, long values
  [component] refresh/nickname/tab/list callbacks unchanged

Wallet
  [component] content-shaped balance skeleton
  [component] active/linked rows, target spinner, Use/Delete/Retry slots
  [regression] bind -> switch -> switch back -> unlink -> reload -> repeat action

Device QA
  [iOS] native glass, Reduce Transparency, Reduce Motion, Dynamic Type
  [Android] translucent fallback, narrow screen, long values, mutation flow
  [wide] existing two-column Wallet remains functional
```

自动化验证还必须包括 `npx tsc --noEmit`、聚焦 UI tests、全量 tests、iOS/Android native build、无 index key、无 UI 直写表、无 token/session 日志扫描。视觉完成必须有同一 fixture 的 before/after 截图，不能只依赖 snapshot tree。

## 兼容、发布与回滚

- 原生依赖：安装后执行 CocoaPods/Gradle 同步并重新生成 dev build；Expo Go 不能作为最终玻璃证据。
- API/schema/env：无变化，不需要后端部署或环境变量。
- 分层发布：theme/primitives → navigation chrome → Dashboard → Wallet。每层独立通过后再进入下一层。
- 回滚顺序相反：Wallet → Dashboard → navigation chrome → primitives/theme；数据与 session 不受影响。
- 如果 glass 引起 native build、对比度或性能问题，只回退 `GlassSurface` 到 opaque；页面结构和 token 仍可保留。
- 其他页面可能立即看到更新后的 global Header/BottomTabBar，但其内容布局不在本轮迁移范围；QA 必须验证没有遮挡和 route 回归。

## 备选方案

| 方案 | 决策 | 原因 |
| ---- | ---- | ---- |
| Institutional Clarity + restrained glass | **Accepted** | 用户选择；层级、品牌和性能最平衡 |
| Quiet Wealth | Rejected | 更偏编辑与奢侈品，操作密度和金融可扫描性较弱 |
| Ledger Precision | Rejected | 数据效率高但过冷，对普通投资者不够友好 |
| Minimal glass | Rejected | 清晰但与现有 flat system 差异不足 |
| Full glass | Rejected | 核心数据对比度、GPU 成本和危险操作语义风险过高 |
| Android 全量 live blur | Rejected | 为材质像素一致牺牲稳定性和低端设备性能 |
| 第三方 skeleton library | Rejected | 当前需求可由小型共享 primitives 完成，新增 bundle 与动画控制不划算 |
| 一次迁移全 App | Deferred | blast radius 过大；先用两个高状态密度页面验证系统 |

## 评审决策记录

| 日期 | 决策 | 原因 | 影响 |
| ---- | ---- | ---- | ---- |
| 2026-07-23 | 全 App 设计系统，先迁移 Dashboard + Wallet | 用户选择 A | 公共系统可复用，页面迁移分批进行 |
| 2026-07-23 | 采用 Institutional Clarity | 用户选择 A | 一个核心焦点、扁平数据和克制色彩 |
| 2026-07-23 | 采用 Restrained Apple Glass | 用户选择 B | chrome 有 Apple 材质感，内容保持高对比 |
| 2026-07-23 | Dashboard 与 Wallet 结构稿通过 | 用户选择 A | 进入正式方案与实施计划，不再调整主结构 |

## Consistency Check

- [x] 需求开放问题已在 Open Questions Resolution 中闭环。
- [x] 方案修正需求假设时，已在 Decision Notes 中记录原因和影响。
- [x] 权限、可信边界、数据读写路径与风险标签一致。
- [x] 方案没有引入范围外功能。
- [x] 视觉稿中的 5 个导航目标、Dashboard 4 个业务 Tab 与 Wallet 既有能力均与当前代码一致。

## 方案评审清单

- [x] 业务规则放在正确层，前端不是敏感决策可信来源。
- [x] 数据流有唯一可信来源，权限检查明确。
- [x] 失败模式、错误反馈、重试、降级和 stop-for-human 已说明。
- [x] 入口层、领域逻辑和副作用边界明确。
- [x] 核心 selector 可脱离 UI 和真实 native module 测试；每个验收场景有自动化或设备 QA 路径。
