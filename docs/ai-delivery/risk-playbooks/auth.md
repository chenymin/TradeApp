# Risk Playbook: auth

适用于涉及登录、登出、session 管理、token 刷新或身份验证流程的需求。

## Required Design Questions

- token 存储位置是什么？是否满足当前合规要求？
- session 失效后的用户流向是什么？是否有 refresh 机制？
- 是否存在多 provider（wallet / email / OAuth）？session 交换流程是否明确？
- 权限敏感操作是否在服务端验证 token 合法性，而非依赖前端状态？

## Suggested Forbidden Patterns

- 禁止在前端直接信任 localStorage 中的 userId 做权限判断
- 禁止跳过 token 验证直接信任请求体中的 user_id 参数
- 禁止将 session token 以明文形式记录到日志

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| 无 localStorage userId 权限判断 | `rg "localStorage.*userId\|localStorage.*user_id" src/ --type ts` | 无匹配 |
| 无明文 token 日志 | `rg "console\.log.*token\|console\.log.*session" src/ --type ts` | 无匹配 |
| 类型检查 | `npx tsc --noEmit` | exit 0 |

## Review Focus

- token 刷新路径是否覆盖 session 过期场景
- 敏感操作是否在 Edge Function 中二次验证 JWT
- 登出是否清理全部 session 状态（客户端 + 服务端）

## Common Rollback Concerns

- auth 流程回滚可能导致已登录用户强制下线，需提前通知
- token 格式变更需同步更新客户端解析逻辑
