# Verification Run：rn-wallet-switching

Generated：2026-07-22T17:03:18.524Z
Status：PASS
Pass / Total：14 / 14

## Commands

| 验证目标 | 命令 | 状态 | 耗时 |
| -------- | ---- | ---- | ---- |
| 主项目类型 | `npm run typecheck` | pass | 767328ms |
| 主项目测试 | `npm test -- --run` | pass | 3471ms |
| 主项目钱包聚焦测试 | `npm test -- --run src/features/wallet src/features/auth src/app` | pass | 1337ms |
| Management migration contract | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching test -- --run src/lib/wallet-selection-migration.test.ts` | pass | 897ms |
| Front 测试 | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching run test:run` | pass | 7276ms |
| migration 安全结构 | `rg -n "ENABLE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "FORCE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "REVOKE UPDATE ON public.investors FROM authenticated" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "GRANT EXECUTE ON FUNCTION public.select_investor_wallet" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "SECURITY INVOKER" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql` | pass | 27ms |
| 禁止移动端直写 | `! rg -n -e "investors.*\\.insert" -e "investors.*\\.upsert" -e "investors.*\\.update" -e "investors.*\\.delete" -e "investor_wallets.*\\.insert" -e "investor_wallets.*\\.upsert" -e "investor_wallets.*\\.update" -e "investor_wallets.*\\.delete" src` | pass | 17ms |
| 禁止前端 service role | `! rg -n -e service_role -e SUPA_JWT_SECRET -e WALLET_LOGIN_SECRET_KEY src package.json app.json --glob '!**/__tests__/**'` | pass | 10ms |
| 禁止 token 日志 | `! rg -n -e 'console\\.log.*token' -e 'console\\.error.*token' -e 'console\\.log.*session' -e 'console\\.error.*session' src /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | pass | 13ms |
| wallet-select 不轮换 JWT | `! rg -n -e 'signJwt' -e 'access_token' -e 'expires_in' -e 'SUPA_JWT_SECRET' /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | pass | 8ms |
| wallet selection 不替换 Supabase session | `! rg -n -e 'persistSession' -e 'replaceSession' -e 'setSession' src/features/wallet` | pass | 8ms |
| `wallet-login` 未改 | `git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching diff 1f57226 -- supabase/functions/wallet-login/index.ts` | pass | 10ms |
| 文档一致性 | `npm run ai:audit -- rn-wallet-switching` | pass | 151ms |
| Git 污染检查 | `git status --short && git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching status --short && git -C /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching status --short` | pass | 28ms |

## Manual QA

- [ ] Manual QA：iOS dev build验证连接 / SIWE / 选择 / session；Android继续作为统一后续门禁。

## 2026-07-23 Android WalletConnect Session Follow-up

- 根因证据：Android 在 MetaMask 8.2.0 返回 SIWE `personal_sign` 后产生 `session topic doesn't exist`；错误发生在 Privy link / `wallet-select` 之前，不是 BSC RPC、Edge Function或数据库错误。
- 依赖证据更正：`@reown/appkit-react-native@2.0.6` 的 `package.json` 精确依赖 `@walletconnect/universal-provider@2.21.10`；`@walletconnect/react-native-compat@2.23.10` 只提供 RN shim / native compat。两者版本不同不能证明 Universal Provider / SignClient / Core 协议栈混用，也不能单独归因为 session 恢复竞态。
- 实现与假设边界：stale signature映射为 `session_expired`；AppKit remote disconnect 后强制本地 cleanup；cleanup single-flight并阻止 Retry竞态；连接 120 秒超时；错误环境链立即清理，测试环境只复用 / 暴露链 97连接。此前用 override 将 Universal Provider / SignClient / Core 强制到 2.23.10 只是 A/B 假设，不是 AppKit 2.0.6 的官方依赖契约。
- 业务边界：stale / timeout / wrong-chain 均在 Privy link与 `wallet-select` 前停止；未修改 Edge Function、数据库、JWT、KYC或账户权益。
- 自动化验证边界：MyTradeApp全量 92 files / 512 tests、typecheck、Android `app:assembleDebug`、Android Hermes bundle export、AI Delivery 14 / 14和 `git diff --check`通过；这些结果覆盖 lifecycle guards、构建和静态一致性，不证明 2.23.10 provider override 与 AppKit 2.0.6 兼容，也不替代钱包人工连接验收。bundle仅保留第三方 package exports fallback warnings。
- 模拟器冒烟：重启 Metro并重新加载 Dev Client 后，Wallet 页面恢复 idle，旧的 activation-pending误报消失；新日志只有正常 `Running "main"`，尚未代替用户执行钱包连接或SIWE批准。
- 审查：规格审查发现并已修复 timeout-cleanup Retry竞态与错误链 snapshot复用；复审无 Critical / Important遗留。cleanup coordinator行为测试证明并发 cleanup复用同一 Promise。
- Rabby 现状：在尚未完成人工验收的 2.23.10 provider override 下，Rabby 点击 Connect 后返回 MyTradeApp，但 Reown session 未建立并最终进入 `connection_timeout`。该失败不能作为 override 验证通过或 Rabby 已修复的证据。
- [ ] Android人工 A/B 验收：钱包端删除旧测试 session，MyTradeApp只清理 Reown cache后重启；A 使用 AppKit 2.0.6 官方依赖树（Universal Provider 2.21.10 + 独立 RN compat 2.23.10），B 仅作为既有 2.23.10 provider override 对照；用户本人批准 MetaMask / Rabby连接和SIWE，记录 session 建立 / timeout，并确认 SIWE Chain ID 97、新钱包自动 active、Viewer收敛、token / expiry不变，且不再出现未处理 session-topic错误。

## 2026-07-23 End-to-End Binding and Activation Retrospective

### Incident sequence

1. Android Reown restored WalletConnect topics that no longer existed in the wallet, producing `session topic doesn't exist` and obscuring later failures.
2. After a fresh connection and successful `personal_sign`, Privy rejected `linkWithSiwe` with HTTP 422 / `invalid_data`.
3. After correcting the Privy request, the external wallet appeared in Privy linked wallets, but `wallet-select` returned HTTP 500 and logged only `wallet_select_failed {"stage":"rpc"}`.
4. A rollback-only production-compatible SQL reproduction identified PostgreSQL SQLSTATE `42702`: `operation_id` could refer to either a PL/pgSQL output variable or a table column.

### Confirmed causes

- The mobile adapter redefined the Privy `ExternalWallet` contract too loosely and submitted Reown display labels such as `MetaMask` / `Rabby` as `walletClientType`. Privy accepts canonical enum values such as `metamask` / `unknown`. The adapter also lowercased the Reown address instead of preserving an EIP-55 checksum address as required by the design.
- `select_investor_wallet` returns output variables named `operation_id` and `investor_id`, while its `ON CONFLICT` targets used the same unqualified names. PostgreSQL accepts the function definition but compiles affected PL/pgSQL statements on execution, so migration application succeeded while the first live RPC failed with `42702`.
- Client and Edge error handling collapsed distinct provider, HTTP, and database errors into generic messages. The initial Edge log retained only `stage: rpc`, discarding the safe PostgREST / SQLSTATE error code needed to locate the failing statement.
- Verification used fake provider hooks and source-text migration assertions. The available rollback SQL verification was not a blocking deployment gate, so neither Privy's runtime enum validation nor PostgreSQL's first-execution ambiguity was exercised before Android QA.

### Corrections and recovery behavior

- Correction: aligning WalletConnect protocol packages to 2.23.10 was an unsupported A/B override, not a validated fix. AppKit React Native 2.0.6 officially pins Universal Provider 2.21.10, while RN compat 2.23.10 remains an independent shim / native compatibility layer and does not justify upgrading Universal Provider, SignClient, or Core. The override had not completed manual acceptance and Rabby still returned without establishing a Reown session before `connection_timeout`, so it is not verification-pass evidence.
- Independently of the dependency hypothesis, connection timeout, single-chain validation, stale-session classification, remote disconnect followed by local cleanup, and cleanup single-flight recovery were added at the provider boundary. Their automated coverage does not establish that Rabby is fixed; the official dependency tree versus override comparison remains pending Android A/B verification.
- Reown addresses now use `viem.getAddress`; Privy metadata maps MetaMask to `metamask` and unsupported display labels such as Rabby to `unknown`. Binding errors now identify SIWE initialization, wallet signature, Privy submission, and linked-wallet response boundaries without exposing secrets.
- The deployed RPC hotfix replaced the first ambiguous conflict target with the primary-key constraint and added `#variable_conflict use_column` to resolve remaining output-variable / table-column conflicts consistently.
- PostgreSQL transaction rollback prevented partial platform writes. After the RPC hotfix, the client reused the stored operation id and retried platform activation without repeating wallet connection, signature, or Privy link.

### Promoted delivery rules

- Provider SDK contracts and canonical enum values are mandatory at adapter boundaries; UI labels are not protocol identifiers.
- Multi-boundary workflows must retain safe stage, provider/server code, HTTP status, and SQLSTATE diagnostics while redacting all secrets and payloads.
- PL/pgSQL / RPC migrations require real PostgreSQL execution tests, including every `ON CONFLICT` branch; source inspection is not an execution test.
- Cross-repository features require a merged/deployed revision matrix and one end-to-end gate spanning client, provider, Edge Function, RPC, and persisted viewer state.

### Residual actions

- [ ] Synchronize the deployed RPC hotfix back to `ArtStarManagementPlatform/supabase/migrations/045_wallet_selection.sql`; the deployed database must not remain ahead of source control.
- [ ] Add safe PostgREST `error.code` / SQLSTATE logging to the `wallet-select` dependency boundary without logging messages, parameters, addresses, tokens, or responses.
- [ ] Make `supabase/manual/verify_wallet_selection.sql` (or an equivalent disposable PostgreSQL integration test) a blocking migration gate.
- [ ] Confirm final Android convergence: the new external wallet is `Active`, exactly one platform primary exists, `investors.wallet_address` and persisted `AuthViewer.walletAddress` match, and the application token / expiry did not change.
- [ ] Treat any remaining unhandled WalletConnect `session topic doesn't exist` rejection as an independent provider lifecycle defect rather than as a wallet-selection failure.
