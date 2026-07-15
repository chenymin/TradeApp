# Task 5B：Holdings 与 Transactions 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 为已认证 viewer 提供只读持仓、成本、PnL 和购买交易 read model。

**Architecture:** Supabase repository 只读取当前已验证钱包的 `mint_events` 及关联资产；链 adapter 按资产 `chain_id` 分组批量读取 `balanceOf`、`priceUSDT` 和 USDT decimals；纯 domain 函数使用 decimal string/BigInt 计算成本和汇总；loader 只在 viewer 与 Supabase session 均就绪时执行。

**Tech Stack:** TypeScript、Supabase JS adapter、viem public client、Vitest。

---

### Task 1：Decimal 与 holdings read model

**Files:**
- Create: `src/features/dashboard/domain/decimal.ts`
- Create: `src/features/dashboard/domain/holdings.ts`
- Test: `src/features/dashboard/__tests__/holdings.test.ts`

- [ ] 先写失败测试，覆盖多笔成本聚合、零 shares、当前余额成本、负 PnL、无成本时 gain 为 null。
- [ ] 运行 `npm test -- src/features/dashboard/__tests__/holdings.test.ts`，确认因模块缺失失败。
- [ ] 实现非负数据库 decimal 规范化，以及基于 BigInt 的加、减、乘、除和百分比计算。
- [ ] 实现 holdings、transactions 和 summary 纯映射。
- [ ] 重跑测试，确认通过。

### Task 2：Mint events repository 与私有查询 guard

**Files:**
- Create: `src/features/dashboard/services/dashboardMintEventsRepository.ts`
- Create: `src/features/dashboard/services/dashboardHoldingsLoader.ts`
- Test: `src/features/dashboard/__tests__/dashboardMintEventsRepository.test.ts`
- Test: `src/features/dashboard/__tests__/dashboardHoldingsLoader.test.ts`

- [ ] 先写失败测试，锁定查询字段、lowercase wallet、`is_deleted=false`、时间倒序、关联资产映射和 RLS 错误传播。
- [ ] 写 guard 测试，确认 viewer/session/wallet 任一缺失时不查询。
- [ ] 运行测试并确认红灯。
- [ ] 实现 repository 和 loader；空数组是合法结果，查询错误必须抛出。
- [ ] 重跑测试，确认通过。

### Task 3：多链 holdings adapter

**Files:**
- Create: `src/features/dashboard/services/dashboardChainHoldingsAdapter.ts`
- Test: `src/features/dashboard/__tests__/dashboardChainHoldingsAdapter.test.ts`

- [ ] 先写失败测试，覆盖 BSC 56/97 分组、18 decimals 余额、各链 USDT decimals、无效地址、单资产失败和整链 RPC 失败。
- [ ] 运行测试并确认红灯。
- [ ] 使用 `publicChainRegistry` 注入的 viem client 实现只读 multicall，不复制 RPC URL 或合约地址。
- [ ] 重跑测试，确认通过。

### Task 4：交易外链与默认运行时组合

**Files:**
- Create: `src/features/dashboard/domain/dashboardExplorer.ts`
- Create: `src/features/dashboard/services/createDefaultDashboardHoldingsLoader.ts`
- Test: `src/features/dashboard/__tests__/dashboardExplorer.test.ts`

- [ ] 先写失败测试，覆盖 chain 56/97、非法 tx hash 和不支持链。
- [ ] 运行测试并确认红灯。
- [ ] 实现 HTTPS BscScan URL mapper，并将 Supabase repository、chain registry 和 loader 组合为默认 runtime。
- [ ] 重跑 Task 5B 定向测试。

### Task 5：验证与审查

- [ ] 运行 `npm test -- src/features/dashboard src/features/auth src/app/providers`。
- [ ] 运行 `npm test -- src` 和 `npm run typecheck`。
- [ ] 扫描 UI 直连 Supabase、写链 API、service-role key、token/session 日志和 index key。
- [ ] 运行 `npm run ai:audit -- rn-full-app-port`。
- [ ] 记录限制：首版只发现 mint events 关联资产；完全由外部转入的资产需要后端钱包索引或全资产扫描。

## 安全与失败边界

- 查询钱包地址只能来自 `AuthViewer.walletAddress`，不得来自 route 参数。
- RLS 仍是跨用户隔离的最终边界；客户端 `.eq("buyer_wallet", ...)` 只是收窄查询，不是授权。
- 不使用 service-role key，不新增 schema/migration，不进行链上写入。
- 数据库金额和链上 raw bigint 不使用 JavaScript 浮点数计算。
- 单链或单资产读取失败不得删除数据库交易，也不得伪造余额为零。
