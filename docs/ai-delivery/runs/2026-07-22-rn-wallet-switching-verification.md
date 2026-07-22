# Verification Run：rn-wallet-switching

Generated：2026-07-22T02:15:01.448Z
Status：PASS
Pass / Total：14 / 14

## Commands

| 验证目标 | 命令 | 状态 | 耗时 |
| -------- | ---- | ---- | ---- |
| 主项目类型 | `npm run typecheck` | pass | 2123ms |
| 主项目测试 | `npm test -- --run` | pass | 2709ms |
| 主项目钱包聚焦测试 | `npm test -- --run src/features/wallet src/features/auth src/app` | pass | 1218ms |
| Management migration contract | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching test -- --run src/lib/wallet-selection-migration.test.ts` | pass | 910ms |
| Front 测试 | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching run test:run` | pass | 6658ms |
| migration 安全结构 | `rg -n "ENABLE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "FORCE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "REVOKE UPDATE ON public.investors FROM authenticated" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "GRANT EXECUTE ON FUNCTION public.select_investor_wallet" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "SECURITY INVOKER" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql` | pass | 25ms |
| 禁止移动端直写 | `! rg -n -e "investors.*\\.insert" -e "investors.*\\.upsert" -e "investors.*\\.update" -e "investors.*\\.delete" -e "investor_wallets.*\\.insert" -e "investor_wallets.*\\.upsert" -e "investor_wallets.*\\.update" -e "investor_wallets.*\\.delete" src` | pass | 20ms |
| 禁止前端 service role | `! rg -n -e service_role -e SUPA_JWT_SECRET -e WALLET_LOGIN_SECRET_KEY src package.json app.json --glob '!**/__tests__/**'` | pass | 9ms |
| 禁止 token 日志 | `! rg -n -e 'console\\.log.*token' -e 'console\\.error.*token' -e 'console\\.log.*session' -e 'console\\.error.*session' src /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | pass | 11ms |
| wallet-select 不轮换 JWT | `! rg -n -e 'signJwt' -e 'access_token' -e 'expires_in' -e 'SUPA_JWT_SECRET' /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | pass | 7ms |
| wallet selection 不替换 Supabase session | `! rg -n -e 'persistSession' -e 'replaceSession' -e 'setSession' src/features/wallet` | pass | 7ms |
| `wallet-login` 未改 | `git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching diff 1f57226 -- supabase/functions/wallet-login/index.ts` | pass | 17ms |
| 文档一致性 | `npm run ai:audit -- rn-wallet-switching` | pass | 170ms |
| Git 污染检查 | `git status --short && git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching status --short && git -C /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching status --short` | pass | 45ms |

## Viewer-only Contract Evidence

- MyTradeApp full suite passed: 92 files / 494 tests. The wallet/auth/app focused suite passed: 34 files / 237 tests.
- ArtStarFront full suite passed on Node 22: 55 files / 292 tests. The Management migration contract passed: 1 file / 1 test.
- `wallet-select` returns only `idempotent`, `operation_id`, and authoritative `user`; production Edge Function source contains no `signJwt`, `access_token`, `expires_in`, or `SUPA_JWT_SECRET` reference.
- The mobile parser rejects any wallet-select success response containing token or session fields and independently parses the Viewer response.
- Secure session replacement reads the current stored session, rejects missing, expired, or account-mismatched records, preserves `accessToken`, `refreshToken`, and `expiresAt`, and replaces only `viewer`.
- The workflow validates operation id and selected wallet address before persistence. AuthProvider and storage validate the current Viewer id, while auth generation prevents a late result from crossing logout or account changes.
- Recovery uses the same operation id and normalizes legacy `session_persisting` / `session_sync_pending` metadata to `viewer_persisting` / `viewer_sync_pending` without storing credentials.

## Review Results

### Auth And Security

Result: pass; no unresolved Critical or Important finding.

- Wallet selection does not rotate JWT, change refresh token, call Supabase `setSession`, or extend the existing expiry.
- Privy token verification, exact linked-wallet matching, investor lookup, and account status checks remain server-side. The client cannot supply an investor id.
- No service-role secret or sensitive token/session logging was found in the scanned mobile and wallet-select production paths.

### Data And RLS

Result: pass for the Task 7 delta.

- Task 7 has no migration, RPC, or manual SQL diff. `wallet-login/index.ts` also has no diff from baseline `1f57226`.
- The existing operation table still has ENABLE/FORCE RLS, and authenticated investor UPDATE remains revoked.
- `select_investor_wallet` remains `SECURITY INVOKER` and executable only through the service-role grant; mobile has no direct investor or investor-wallet write path.

### Business Boundary

Result: pass.

- Active-wallet changes remain inside the same investor account. The authoritative Viewer id must match the current and stored account before local persistence.
- Task 7 changes only response/session synchronization. It does not write or recalculate KYC, holdings, rewards, commissions, referrals, points, tier, or other investor rights.
- Existing `wallet-login`, Privy SIWE, Reown connection behavior, wallet-selection RPC behavior, and JWT refresh policy remain unchanged.

## Release Boundary

- No production migration or Edge Function deployment was performed.
- Provider-backed iOS wallet scenarios remain a manual gate.
- Android build and wallet-provider verification remain intentionally deferred to the unified Android pass requested by the user.

## Manual QA

- [ ] Manual QA：iOS dev build验证连接 / SIWE / 选择 / session；Android继续作为统一后续门禁。
