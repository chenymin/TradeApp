# Risk Playbook: realtime

适用于涉及 WebSocket、Supabase Realtime 订阅、轮询或链上事件监听的需求。

## Required Design Questions

- 订阅在组件卸载时是否正确取消？是否有内存/连接泄漏风险？
- 消息到达频率是多少？是否会触发大范围 re-render？
- 断线后是否有重连机制？重连期间的数据缺口如何处理？
- 实时数据与服务端状态的一致性如何保证？是否需要全量重拉做兜底？

## Suggested Forbidden Patterns

- 禁止在未取消订阅的情况下卸载组件（须在 useEffect cleanup 中调用 unsubscribe/channel.remove）
- 禁止将实时推送数据直接写入 Context Provider 的顶层状态（会触发全树 re-render）
- 禁止在订阅回调中直接 setState 而不做节流或批量合并（高频更新场景）
- 禁止在轮询间隔内发起并发请求而不设锁（前一个请求未返回时禁止再发）

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| cleanup 存在 | `rg "unsubscribe\|channel\.remove\|clearInterval\|clearTimeout" src/ --type ts` | 存在清理逻辑 |
| 无裸 setInterval | `rg "setInterval" src/ --type ts` | 每处均有对应 clearInterval |
| 类型检查 | `npx tsc --noEmit` | exit 0 |

## Review Focus

- useEffect 的 cleanup 函数是否覆盖全部订阅和计时器
- 订阅回调是否包含防抖/节流，避免 re-render 风暴
- 断线重连后是否有数据一致性保障（重拉或增量补偿）
- 实时数据是否只存在 local state 或专用 store，而非 Context 顶层

## Common Rollback Concerns

- 订阅泄漏在开发环境难以复现，需在生产流量下压测验证
- 轮询频率变更需同时评估后端 RLS 查询压力
- Supabase Realtime channel 名称变更会导致旧客户端收不到推送，需滚动发布
