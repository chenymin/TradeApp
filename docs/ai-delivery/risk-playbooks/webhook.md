# Risk Playbook: webhook

适用于接收外部 webhook、处理异步回调或消费事件队列的需求。

## Required Design Questions

- 是否有签名验证？如何防止伪造请求？
- 是否保证幂等性？重复投递同一事件是否安全？
- 失败时是否有重试机制？重试风暴如何防止？
- 事件处理是否有超时限制？超时后的状态如何清理？

## Suggested Forbidden Patterns

- 禁止在未验证签名的情况下处理 webhook payload
- 禁止依赖 webhook payload 中的 user_id 做权限判断（需服务端二次验证）
- 禁止在处理函数中直接执行不可重入的写操作而不设幂等键

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| 签名验证存在 | `rg "signature\|hmac\|webhook.*secret\|verif" src/ --type ts` | 存在验证逻辑 |
| 幂等键存在 | `rg "idempotency\|event_id\|dedup" src/ --type ts` | 存在幂等实现 |
| 类型检查 | `npx tsc --noEmit` | exit 0 |

## Review Focus

- 签名验证是否在处理业务逻辑前执行
- 幂等键是否持久化（数据库层而非内存）
- 重试场景是否做过端到端测试

## Common Rollback Concerns

- 已处理的 webhook 事件无法"取消"，回滚须对业务数据做补偿
- 签名密钥轮换需与事件源方协调，有时间窗口风险
