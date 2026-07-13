# Risk Playbook: contract

适用于涉及链上合约调用、交易签名、事件索引或链上状态读取的需求。

## Required Design Questions

- 合约调用是否需要用户签名？签名请求的 UX 失败路径是否已设计？
- decimal 单位是否已核实？（USDT 6 位、ERC-20 token 18 位，混用会导致数量级错误）
- 交易发出后是否等待 receipt？状态轮询还是 `waitForTransactionReceipt`？
- 合约事件索引（indexer）与链上状态之间的延迟如何处理？UI 是否有 pending 态？

## Suggested Forbidden Patterns

- 禁止将链上返回值直接作为 UI 展示数量而不经过 decimal 格式化
- 禁止在未收到 receipt 前将交易状态标记为"成功"
- 禁止在前端硬编码合约地址而不走 `src/lib/contracts.ts` 统一出口
- 禁止混用 USDT（6 decimals）和 ERC-20 token（18 decimals）的 BigInt 进行加减比较

## Machine Verification Suggestions

| 验证目标 | 命令示例 | 预期结果 |
| -------- | -------- | -------- |
| decimal 格式化 | `rg "formatUnits\|parseUnits" src/ --type ts` | 所有链上数值均经过格式化 |
| 合约地址统一出口 | `rg "0x[0-9a-fA-F]{40}" src/ --type ts -l` | 只有 contracts.ts 出现合约地址 |
| 类型检查 | `npx tsc --noEmit` | exit 0 |

## Review Focus

- `mint(amountUSDT)` 参数是否使用 `parseUnits(amount, 6)` 而非 18
- `approve` → `mint` 两步状态机是否有中间态 UI 和失败恢复路径
- 链上事件索引与数据库的同步延迟是否在 UI 上有明确反馈
- Testnet / Mainnet 地址切换是否完全由 `VITE_CHAIN_ID` 控制，无硬编码分支

## Common Rollback Concerns

- 已上链交易不可撤销，业务补偿须在数据库层做状态修正
- 合约地址变更需同步更新 `contracts.ts` 并重新部署，indexer 须重建历史事件
- decimal 错误会导致用户实际转账金额与预期相差 10^12 倍，属于高危 P0 缺陷
