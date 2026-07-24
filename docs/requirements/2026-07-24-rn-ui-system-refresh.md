# 需求说明：React Native UI System Refresh

日期：2026-07-24
Feature slug：`rn-ui-system-refresh`
状态：草稿

## 业务目标

为 MyTradeApp 建立一套专业、可信、克制的移动端金融产品视觉系统，解决当前页面标题重复、首屏信息竞争、卡片和描边过多、文字层级不足以及跨页面样式不一致的问题。本轮以 Dashboard 和 Wallet 作为首批样板页面，在不改变任何业务行为的前提下，让用户能更快识别核心资产信息、当前状态和可执行操作。

## 用户角色

- 已登录投资者：在 iOS 或 Android 手机上查看投资组合、持仓、账户状态与钱包余额，并执行既有的钱包绑定、切换和受控解绑操作。
- 未登录或 session 不可用用户：继续看到现有登录或 session 恢复界面，本功能不改变其认证流程。

## 风险标签

- [x] auth / 登录
- [ ] permission / 权限
- [ ] payment / 支付
- [ ] kyc / 身份认证
- [ ] webhook / 外部回调
- [ ] realtime / 实时同步
- [x] database / 数据写入
- [ ] rls / Supabase 权限
- [x] frontend-performance / 前端性能
- [ ] contract / 合约交互

## 范围内

- 定义全 App 可复用的颜色、字体层级、数字样式、间距、圆角、分隔线、图标按钮、主次操作和状态反馈规范。
- 采用已确认的 `Institutional Clarity` 方向：深墨色承载核心资产摘要，祖母绿只用于主操作、选中态和正向状态，以扁平信息行和留白替代无差别卡片堆叠。
- 采用已确认的 `Restrained Apple Glass` 强度：顶部栏、分段控制、底部导航和临时操作层可以使用半透明、模糊和轻量高光；核心金额、数据列表、错误区和危险操作保持实色高对比。
- 新增可复用的内容同形骨架 primitives，并在 Dashboard 与 Wallet 中替换无结构的小方块或整块灰色占位。
- 完整改造 Dashboard 的页面身份区、投资组合摘要、辅助指标、业务 Tab、内容列表及空态、加载态、部分失败态。
- 完整改造 Wallet 的页面身份区、余额摘要、钱包列表、收款能力以及现有绑定、切换、解绑和恢复状态的视觉呈现。
- 提炼 Dashboard 和 Wallet 使用的共享 UI primitives，保证后续页面能复用同一套视觉语言。
- 在 iOS 与 Android 手机尺寸验证布局、滚动、长文本、长金额、触控区域和安全区。

## 范围外

- 本轮不迁移 Launchpad、Market、Referral、My、登录和 KYC 详情页面；它们留待后续按同一设计系统分批迁移。
- 不修改认证、session、权限、钱包绑定、钱包切换、钱包解绑、持仓加载、余额读取或错误恢复的业务逻辑。
- 不修改 API、Edge Function、数据库、RLS、合约、链配置、数据格式和缓存策略。
- 不改变底部导航的信息架构、页面顺序、路由目标和返回行为。
- 不新增暗色模式、平板专用布局、Web 端适配、品牌插画或营销页面。
- 不将全部页面、核心数据卡、列表行或危险操作做成半透明玻璃，也不为了模拟 iOS 效果牺牲 Android 可读性和性能。
- 不以隐藏错误、删除状态说明或缩减既有操作能力换取视觉简洁。

## 业务规则

- 每个页面首屏只能有一个主视觉焦点；Dashboard 聚焦投资组合总值，Wallet 聚焦当前钱包与可用余额。
- 页面不得同时使用重复的导航标题和页面标题表达同一层级。
- 卡片只用于独立对象、关键摘要或需要明确边界的操作区域；普通信息使用区块标题、留白和分隔线组织。
- 核心金额、状态、区块标题、正文、辅助说明必须具有稳定且可复用的视觉层级，页面不得通过临时字号和字重表达业务优先级。
- 颜色必须有语义：祖母绿用于主操作、选中态和正向状态；危险色只用于失败和破坏性操作；香槟色仅作为低频品牌强调，不承担主要操作。
- 玻璃效果只用于页面 chrome 和控制层，不得叠加多个高模糊表面；当平台不支持稳定模糊、用户启用降低透明度或性能预算不满足时，必须回退为不透明或低透明度的高对比表面。
- 骨架屏必须复刻最终内容的主要轮廓，包括图标或缩略图、标题、副标题、金额和操作槽位；不得用与真实内容无关的单个小方块或整行实心灰块代替。
- 骨架屏加载和真实内容出现时必须保持稳定尺寸，避免布局跳动；动画只使用缓慢、低对比的扫光或脉冲，并在用户启用减少动态效果时停止。
- Dashboard 与 Wallet 的所有既有 loading、empty、partial error、error、mutation in progress 和 recovery 状态必须保留，不得只优化正常数据态。
- 钱包 `Use`、绑定、删除和重试的可用条件、触发行为、互斥锁及状态机不因视觉调整而改变。
- 所有图标按钮保持可访问名称，交互控件最小触控区域不低于 44 x 44 points。
- 长金额、长邮箱、长钱包地址、系统字体放大和窄屏不得造成遮挡、重叠或横向溢出。

## 状态模型

| 状态 | 可信来源 | 含义 | 允许流转 |
| ---- | -------- | ---- | -------- |
| session_unavailable | 现有 Auth Viewer state | 当前无法展示受保护页面 | 仅由现有认证流程恢复或离开页面 |
| loading | 现有 Dashboard / Wallet loader 或 workflow | 页面正在读取数据或恢复状态 | ready、empty、partial_unavailable、error |
| ready | 现有 loader 与 Viewer | 核心数据可展示，既有操作按业务规则启用 | loading、mutation_in_progress、partial_unavailable、error |
| empty | 现有 loader 返回的空集合 | 数据读取成功但没有持仓、交易或可展示项目 | loading、ready、mutation_in_progress |
| partial_unavailable | 现有聚合 loader 的 warning / partial result | 页面仍可用，但一个或多个次要数据源不可用 | loading、ready、error |
| error | 现有 loader 或 workflow error | 当前区块或操作失败，可按既有规则重试 | loading、mutation_in_progress、ready |
| mutation_in_progress | 现有钱包 selection / unlink workflow | 绑定、切换、解绑或同步正在执行 | ready、error、recovery_pending |
| recovery_pending | 现有钱包 workflow | 平台状态或 Viewer 尚未收敛，需要既有恢复操作 | mutation_in_progress、ready、error |

视觉组件只消费这些既有状态，不创建新的业务状态，也不通过颜色、动画或局部 boolean 推断可信业务结果。

## 权限和可信边界

- 谁可以读：沿用现有认证用户、Supabase RLS、Edge Function 和链上读取边界；本功能不扩大读取范围。
- 谁可以写：沿用现有 wallet workflow 和后端授权路径；视觉组件不得新增写入能力。
- 可信判断所在层：认证、权限、钱包归属、active wallet、持仓与余额结果继续由现有 Viewer、workflow、后端和链上 adapter 决定。
- 前端职责：只展示现有可信状态、触发现有 command，并提供清楚的 loading、失败、恢复和 disabled 反馈。

## 数据来源

- Dashboard：现有 `profileLoader`、`holdingsLoader`、`kycLoader`、`commissionLoader` 与 `DashboardViewerState`。
- Wallet：现有 `AuthViewer`、Privy wallet metadata、wallet balance loader、wallet selection workflow 与 wallet unlink workflow。
- 设计 token：本功能新增的本地静态主题定义，不包含业务数据、密钥或远端配置。

## 验收场景

| 场景 | Given | When | Then |
| ---- | ----- | ---- | ---- |
| Dashboard 正常数据 | 已登录投资者拥有 portfolio、PnL、等级、积分、KYC 与持仓数据 | 打开 Dashboard | 首屏只有一个核心资产焦点，辅助指标层级较低，用户无需滚动即可识别总资产、PnL、当前 Tab 与首个内容区 |
| Dashboard 空数据 | 数据加载成功但没有持仓或交易 | 切换 Holdings 或 Transactions | 空态与页面结构保持稳定，不使用额外大卡片抢占核心摘要层级 |
| Dashboard 部分失败 | profile、commission、KYC 或链余额之一不可用 | 页面完成聚合加载 | 可用数据继续展示，失败信息被清楚标注但不遮挡主任务，刷新入口仍可操作 |
| Wallet 正常数据 | 账户包含 active wallet、余额与多个 linked wallets | 打开 Wallet | 用户能先识别当前钱包和余额，再识别 linked wallets 及其 Use、绑定和解绑能力 |
| Wallet mutation | 钱包正在绑定、切换、解绑、同步或等待 Viewer 收敛 | workflow 状态变化 | 对应行和操作区显示稳定进度或恢复入口，既有互斥与 disabled 规则保持不变，完成后后续操作重新可用 |
| Wallet 失败恢复 | 连接、选择、解绑或同步失败 | 用户查看错误并按既有规则重试 | 错误与目标钱包关联清楚，危险操作不会被误认为普通操作，重试不改变既有业务流程 |
| 内容同形骨架 | Dashboard 或 Wallet 首次加载且数据尚未返回 | 页面展示 loading state | 占位结构与最终摘要和列表基本一致，不出现孤立小方块，不产生明显布局跳动，减少动态效果开启时不播放扫光 |
| 克制玻璃跨平台 | 在受支持的 iOS 与 Android 手机运行样板页面 | 用户滚动、切换 Tab 或打开临时操作层 | 玻璃只出现在导航和控制表面，文字对比度和触控不受影响；模糊不可用时自动使用高对比实色回退 |
| 长内容与窄屏 | 存在长邮箱、长地址、长金额或系统字体放大 | 在支持的 iOS / Android 手机尺寸渲染 | 文本不重叠、不超出容器，金额和操作保持可读，触控区域不小于 44 x 44 points |
| 行为回归 | 视觉改造前已有 Dashboard 与 Wallet 流程 | 执行现有组件测试和连续钱包操作测试 | 数据请求、导航、Tab、刷新、绑定、切换、解绑和恢复行为与改造前一致 |

## 风险和开放问题

- 非阻塞：具体字体、字号、颜色值、间距比例和共享组件 API 在方案设计阶段确定；需求阶段只固定视觉方向与用户结果。
- 非阻塞：平板继续使用现有响应式行为并保证无布局破坏，但平板专用视觉编排延后。
- 风险：共享 token 和 primitives 会影响两个样板页的多个状态；实施必须按 token、primitive、Dashboard、Wallet 分层提交和验证，避免一次性全局替换。
- 风险：视觉简化可能误删低频错误或恢复入口；方案和测试必须逐一映射现有状态机状态。
- 风险：实时模糊和同时运行的骨架动画可能增加 GPU、内存和耗电；方案必须限制模糊层数量、动画范围并验证低端 Android 的滚动和交互稳定性。
- 风险：半透明表面会受到背景颜色影响；方案必须为文字、图标、选中态和危险操作定义不依赖背景猜测的对比度回退。
- 已确认：终端最终选择为 `Institutional Clarity`；浏览器中的其他点击仅视为比较过程，不改变最终方向。
- 已确认：玻璃强度选择为 `Restrained Apple Glass`，全玻璃方向不采用。

## 进入开发检查清单

- [x] 业务目标、范围内、范围外可以用一句话讲清楚。
- [x] 核心业务规则、状态模型、权限和可信边界没有歧义。
- [x] 数据来源明确，不依赖前端猜测。
- [x] 正常、空 / 失败 / 权限路径都有验收场景。
- [x] 开放问题已标记为阻塞、非阻塞或延后。

