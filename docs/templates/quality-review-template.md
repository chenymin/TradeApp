# 质量 Review：{{feature_title}}

日期：{{date}}
Feature slug：`{{feature_slug}}`
状态：草稿

## 输入

- 需求文档：`docs/requirements/{{date}}-{{feature_slug}}.md`
- 方案设计：`docs/plans/{{date}}-{{feature_slug}}-design.md`
- 实现计划：`docs/plans/{{date}}-{{feature_slug}}-implementation.md`
- Review 清单：`docs/plans/{{date}}-{{feature_slug}}-review.md`

## 风险标签

- [ ] auth / 登录
- [ ] permission / 权限
- [ ] payment / 支付
- [ ] kyc / 身份认证
- [ ] webhook / 外部回调
- [ ] realtime / 实时同步
- [ ] database / 数据写入
- [ ] rls / Supabase 权限
- [ ] frontend-performance / 前端性能
- [ ] contract / 合约交互

## Security Review

- [ ] 没有硬编码 secret、token、private key。
- [ ] 新增 env var 已说明用途、作用域、是否客户端可见。
- [ ] secret、服务端 token、签名私钥不会进入前端 bundle、日志、错误响应或文档示例。
- [ ] 用户输入已校验。
- [ ] 敏感操作有鉴权和授权。
- [ ] 错误信息不会泄露敏感数据。
- [ ] webhook 有签名校验、幂等性和重放防护。
- [ ] KYC、支付、合约等可信判断不在前端完成。

## Data / Supabase Review

- [ ] 数据库写入路径明确。
- [ ] 表、字段、RLS / 权限、索引、事务或一致性要求已说明。
- [ ] RLS policy 覆盖读写权限。
- [ ] 查询有明确过滤条件，不会跨用户泄露数据。
- [ ] migration 可回滚或兼容旧数据。
- [ ] realtime / webhook 更新不会造成重复写入或状态倒退。
- [ ] schema、接口响应、状态枚举或外部回调格式变更有兼容和回滚说明。

## Performance Review

- [ ] React hooks 依赖稳定，避免重复请求或重复订阅。
- [ ] 列表、表格或高频更新路径有性能评估。
- [ ] 高频状态没有放入过大的 React context、provider 或顶层状态导致大范围 rerender。
- [ ] realtime 更新有去重、节流或合理的 query invalidation。
- [ ] 大对象、派生数据或 expensive computation 使用合适的 memoization。
- [ ] loading、empty、error 状态不会引起布局抖动。

## Best Practices Review

- [ ] 沿用现有项目结构和命名习惯。
- [ ] 没有为单个需求引入过重抽象。
- [ ] 抽象只在降低真实重复、隔离变化、表达领域概念或提供稳定扩展点时新增。
- [ ] 状态模型清晰，没有用多个 boolean 互相推导业务状态。
- [ ] 副作用没有出现在 render / formatter / parser / selector 中。
- [ ] 业务规则、数据访问、UI 展示分层清晰。
- [ ] 测试覆盖核心业务路径和边界路径。
- [ ] 文档、实现和测试可以互相追溯。

## 结构化 Findings

| Severity | Review 类型 | Area   | Finding | Recommendation | Must Fix |
| -------- | ----------- | ------ | ------- | -------------- | -------- |
| 待填写   | 待填写      | 待填写 | 待填写  | 待填写         | Yes / No |

## 结论

- [ ] Pass
- [ ] Pass with Issues
- [ ] Blocked
