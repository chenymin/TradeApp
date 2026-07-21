# Verification Run：rn-wallet-switching

Generated：2026-07-21T06:03:06.582Z
Status：PASS
Pass / Total：12 / 12

## Commands

| 验证目标 | 命令 | 状态 | 耗时 |
| -------- | ---- | ---- | ---- |
| 主项目类型 | `npm run typecheck` | pass | 2394ms |
| 主项目测试 | `npm test -- --run` | pass | 3107ms |
| 主项目钱包聚焦测试 | `npm test -- --run src/features/wallet src/features/auth src/app` | pass | 1408ms |
| Management migration contract | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching test -- --run src/lib/wallet-selection-migration.test.ts` | pass | 1189ms |
| Front 测试 | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching run test:run` | pass | 8165ms |
| migration 安全结构 | `rg -n "ENABLE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "FORCE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "REVOKE UPDATE ON public.investors FROM authenticated" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "GRANT EXECUTE ON FUNCTION public.select_investor_wallet" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "SECURITY INVOKER" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql` | pass | 34ms |
| 禁止移动端直写 | `! rg -n -e "investors.*\\.insert" -e "investors.*\\.upsert" -e "investors.*\\.update" -e "investors.*\\.delete" -e "investor_wallets.*\\.insert" -e "investor_wallets.*\\.upsert" -e "investor_wallets.*\\.update" -e "investor_wallets.*\\.delete" src` | pass | 18ms |
| 禁止前端 service role | `! rg -n -e service_role -e SUPA_JWT_SECRET -e WALLET_LOGIN_SECRET_KEY src package.json app.json --glob '!**/__tests__/**'` | pass | 10ms |
| 禁止 token 日志 | `! rg -n -e 'console\\.log.*token' -e 'console\\.error.*token' -e 'console\\.log.*session' -e 'console\\.error.*session' src /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | pass | 13ms |
| `wallet-login` 未改 | `git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching diff 1f57226 -- supabase/functions/wallet-login/index.ts` | pass | 17ms |
| 文档一致性 | `npm run ai:audit -- rn-wallet-switching` | pass | 197ms |
| Git 污染检查 | `git status --short && git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching status --short && git -C /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching status --short` | pass | 29ms |

## Manual QA

- [ ] Manual QA：iOS dev build验证连接 / SIWE / 选择 / session；Android继续作为统一后续门禁。
