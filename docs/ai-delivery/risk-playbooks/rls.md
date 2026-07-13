# Risk Playbook: rls

适用于涉及行级权限（RLS）、跨用户数据隔离或多租户场景的需求。

## Required Design Questions

- 哪些表需要 RLS？策略是否覆盖 SELECT / INSERT / UPDATE / DELETE？
- 是否存在跨用户读取场景？隔离边界是否通过 `auth.uid()` 或角色实现？
- 是否有 Service Role 绕过 RLS 的合法场景？是否已限定在服务端？
- 前端是否存在依赖客户端参数（如 URL、请求 payload）做权限判断的逻辑？

## Suggested Forbidden Patterns

- 禁止仅依赖前端权限判断（如 `if (isAdmin)` 在组件层放行写操作）
- 禁止在 RLS 策略中引用客户端可篡改的字段
- 禁止 Service Role key 泄漏到前端代码或 .env 前缀为 VITE_ 的变量

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| 禁止前端权限判断绕过 | `rg "仅依赖前端\|isAdmin.*insert\|isAdmin.*update" src/ --type ts` | 无匹配 |
| Service Role key 未泄漏 | `rg "VITE_.*SERVICE.*KEY\|service_role" src/ --type ts` | 无匹配 |
| 类型检查 | `npx tsc --noEmit` | exit 0 |

## Review Focus

- RLS 策略是否覆盖所有写入操作
- 是否做过跨用户隔离的集成测试（用两个不同 user token 验证）
- Service Role 使用是否限定在 Edge Function 或服务端

## Common Rollback Concerns

- 禁用 RLS 策略是否会暴露数据（应先验证降级态下数据可见性）
- 回滚 migration 是否会导致 RLS 策略引用的列消失
