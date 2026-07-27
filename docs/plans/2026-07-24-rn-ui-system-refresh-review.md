# Review 清单：React Native UI System Refresh

日期：2026-07-27
Feature slug：`rn-ui-system-refresh`
状态：通过，保留人工发布门禁

## 业务 Review

- [x] 当前 diff 满足已批准的 Dashboard、Wallet、导航和 shared UI 验收场景。
- [x] 当前 diff 没有新增业务行为；wallet、auth、Dashboard 数据加载和路由契约保持不变。
- [x] 范围内和范围外仍然被遵守。
- [x] loading、empty、partial、error、recovery 和连续 wallet action 已由自动化覆盖。

## 架构 Review

- [x] 视觉规则位于 shared primitives 或 feature presentation 层。
- [x] 前端视觉状态没有被用作身份、钱包或数据写入的可信来源。
- [x] 数据继续来自现有 Viewer、Dashboard loaders 和 Wallet workflows。
- [x] 复用了现有 Button、Pressable、SegmentedControl、FlatList 和 workflow 模式。
- [x] 新增抽象限于 theme、AppText、GlassSurface 和 Skeleton。
- [x] Screen 和 navigation 入口没有新增 provider、session、数据访问或业务判断。
- [x] adapter、feature presentation 和 workflow 职责没有互相泄漏。
- [x] 没有新增大型 action switch、registry 或 handler map。
- [x] 本功能没有多策略业务分发需求；glass capability 由单一 adapter selector 隔离。
- [x] skeleton animation 与 accessibility cleanup 集中在 `SkeletonGroup`。

## 代码 Review

- [x] TypeScript 检查通过。
- [x] loading、empty、partial、error 和 recovery 状态均有测试。
- [x] native capability 查询失败、listener cleanup 和重复 wallet action 风险已覆盖。
- [x] 无新增 secret、token、provider body 或完整钱包地址日志。
- [x] 聚焦测试与 94 files / 564 tests 全量回归通过。

## 模块内聚与可测试性 Review

- [x] 新增模块均有单一 presentation 职责。
- [x] 不存在新增的“什么都做”函数或文件。
- [x] 业务规则、IO、副作用和 UI 展示保持分层。
- [x] glass 与 skeleton selector 可脱离网络和真实 native 环境测试。
- [x] capability、motion 和 fallback 分支以命名纯函数表达。
- [x] 测试通过 deterministic loaders/workflows 和 native module mocks 覆盖。
- [x] 新增 UI API 输入输出明确，不依赖 secret、网络或 runtime env。
- [x] feature-specific rows 未抽成共享模型，避免无收益抽象。
- [x] native-only 材质与设备 accessibility 行为保留人工验收门禁。

## 代码规则 Review

- [x] 未修改现有业务状态机，也未新增零散业务 boolean。
- [x] visual selected/loading 状态不替代 Viewer 或 wallet authority。
- [x] selector 与 formatter 无副作用；native listener 有 cleanup。
- [x] 本功能无 webhook、支付、KYC、合约或数据库写入变更。
- [x] presentation error 有 opaque/static fallback，不只依赖日志。
- [x] 表、字段、RLS、索引、事务和数据库接口均未改变。
- [x] Dashboard 保留 FlatList；Android 禁止 live blur；skeleton 每组一个 animation value。
- [x] 每个验收场景有自动化或明确的人工 QA stop boundary。
- [x] 新增抽象只隔离稳定视觉能力。
- [x] 未新增 env var 或 secret。
- [x] 无 schema、接口响应、状态枚举或外部回调格式变更。

## 架构漂移 Review

- [x] 当前 diff 符合方案设计中的 shared、navigation、Dashboard、Wallet 边界。
- [x] 新增与修改文件职责可由实现计划中的文件表逐一说明。
- [x] 页面增量用于表达现有状态矩阵，没有形成新的业务入口。
- [x] feature row 保持本地是有意选择，当前重复不足以支持共享抽象。
- [x] GlassSurface 与 Skeleton 抽象分别隔离 native capability 和动画生命周期。

## 问题列表

| 严重级别 | Review 类型 | 问题 | 建议修复 | Must Fix | 处理结果 |
| -------- | ----------- | ---- | -------- | -------- | -------- |
| Minor | Release QA | Reduce Transparency、Reduce Motion、Dynamic Type 和双平台真实钱包连续流程尚无本次完整设备证据 | 在发布前由人工按验证矩阵执行并记录 revision、设备、wallet/chain 和结果 | No（合并）；Yes（发布） | 已记录为 stop-for-human，不表述为已通过 |
| Minor | Dependency | `expo install --check` 仍报告两个本功能前已存在的 WalletConnect 相关版本偏差 | 独立依赖维护任务评估，不在 UI 功能内升级 | No | 本功能只验证新增 glass modules 与 Expo 57 对齐 |

## 合并判断

- [x] 可以合并；代码已在 `main`，自动化与 native Debug build 通过。
- [ ] 修完 Important 后可以合并。
- [ ] Blocked，不能合并。

发布仍由人工设备矩阵阻断；本 Review 不把该矩阵声明为已完成。
