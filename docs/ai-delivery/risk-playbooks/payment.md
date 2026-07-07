# Risk Playbook: payment

适用于涉及支付、充值、提现、退款或资金转移的需求。

## Required Design Questions

- 资金流转路径是什么？每一步的可信来源是哪里？
- 是否有幂等保障？同一笔支付请求重复发送会怎样？
- 失败时的补偿机制是什么？是否有人工介入通道？
- 是否有金额精度问题（小数点、currency decimals）？

## Suggested Forbidden Patterns

- 禁止由前端传入金额后直接执行支付，金额必须服务端二次确认
- 禁止在支付完成前标记订单为 paid
- 禁止使用浮点数做金额计算（须用整数或 Decimal 库）

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| 无前端金额直传 | `rg "amount.*body\|price.*req\.body" src/ --type ts` | 无匹配 |
| 无浮点金额计算 | `rg "parseFloat.*amount\|amount.*\* 0\." src/ --type ts` | 无匹配 |
| 类型检查 | `npx tsc --noEmit` | exit 0 |

## Review Focus

- 支付状态机是否完整（pending → processing → paid / failed）
- 退款和部分退款是否有独立的幂等路径
- 外部支付渠道的异步回调/确认是否被正确等待与校验

## Common Rollback Concerns

- 已确认的支付/转账通常无法直接撤销，须通过退款或补偿流程处理
- 退款流程需与支付渠道协调，存在时间延迟
- 金额精度问题导致的差异需对账机制兜底
