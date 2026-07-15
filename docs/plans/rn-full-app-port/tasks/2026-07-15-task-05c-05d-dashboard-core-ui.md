# Task 5C/5D：Dashboard Core UI 实施计划

**Goal:** 用 Task 5A/5B 的真实 read model 替换 Dashboard 占位页，并补 KYC 只读摘要。

**范围:** Profile、tier/points、最近 50 条积分流水、KYC 状态、holdings、transactions、commission summary、refresh、nickname edit、局部错误和空态；不实现 KYC 提交、佣金明细、推荐明细或 payout。

**实现:** 测试 KYC、points 和 commission repository/guard；再测试 `DashboardScreen` 加载、tab、外链、空态和昵称刷新；最后从 `AppRoot` 注入默认 services，在 `AppNavigator` 替换 `RoutePlaceholder`。Commission 只读取已约定 view；`PGRST205`、`42P01` 或 relation missing 显式映射为 unavailable，其他错误继续抛出。

**门禁:** Screen 不 import Supabase/viem；钱包来自 `AuthViewer`；KYC 只作展示，不作为购买授权；列表使用 `FlatList`；外链通过 `ExternalLinkAdapter`。

**验证:** `npm test -- src/features/dashboard src/app/navigation`、全量测试、typecheck、forbidden scans、AI Delivery audit。
