# Risk Playbook: database

适用于所有涉及数据库写入、schema 变更、迁移或批量操作的需求。

## Required Design Questions

- 写入路径是什么？是直接写表还是经过约定的 RPC / 服务层？
- 是否涉及 schema 变更？migration 编号是否已对齐需求、方案、实现计划？
- 是否存在跨表事务？失败时的回滚路径是什么？
- 是否有批量写入？是否有性能影响评估？
- 索引是否足够？高频查询是否已通过 EXPLAIN 验证？

## Suggested Forbidden Patterns

- 禁止绕过约定的数据写入路径（如直接 INSERT 而非 RPC）
- 禁止在前端或入口层直接调用危险写操作
- 禁止在同一 migration 中混合 schema 变更和数据迁移

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| 禁止绕过写路径 | `rg "\.from\(.+\)\.insert\|\.upsert\|\.update\|\.delete" src/ --type ts` | 仅出现在约定的 service/hook 层 |
| migration 编号一致 | `npm run ai:audit -- feature-name` | audit 通过，无 migration-number-mismatch |
| 类型检查 | `npx tsc --noEmit` | exit 0 |

## Review Focus

- 写入路径是否经过 RPC 或约定的 service 层
- migration 是否可单独回滚
- 事务边界是否清晰
- 高频查询是否有索引支撑

## Common Rollback Concerns

- 数据 migration 是否可逆（down migration 是否存在）
- schema 变更是否有 NOT NULL 陷阱影响已有数据
- 批量操作是否有幂等保障
