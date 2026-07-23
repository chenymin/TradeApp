# Verification Run：rn-wallet-switching

Generated：2026-07-23T03:29:33.388Z
Status：PASS
Pass / Total：14 / 14

## Commands

| 验证目标 | 命令 | 状态 | 耗时 |
| -------- | ---- | ---- | ---- |
| 主项目类型 | `npm run typecheck` | pass | 2101ms |
| 主项目测试 | `npm test -- --run` | pass | 2149ms |
| 主项目钱包聚焦测试 | `npm test -- --run src/features/wallet src/features/auth src/app` | pass | 1065ms |
| Management migration contract | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching test -- --run src/lib/wallet-selection-migration.test.ts` | pass | 768ms |
| Front 测试 | `env PATH=/Users/rwa_start/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin /Users/rwa_start/.nvm/versions/node/v22.22.0/bin/npm --prefix /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching run test:run` | pass | 6363ms |
| migration 安全结构 | `rg -n "ENABLE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "FORCE ROW LEVEL SECURITY" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "REVOKE UPDATE ON public.investors FROM authenticated" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "GRANT EXECUTE ON FUNCTION public.select_investor_wallet" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql && rg -n "SECURITY INVOKER" /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching/supabase/migrations/045_wallet_selection.sql` | pass | 24ms |
| 禁止移动端直写 | `! rg -n -e "investors.*\\.insert" -e "investors.*\\.upsert" -e "investors.*\\.update" -e "investors.*\\.delete" -e "investor_wallets.*\\.insert" -e "investor_wallets.*\\.upsert" -e "investor_wallets.*\\.update" -e "investor_wallets.*\\.delete" src` | pass | 15ms |
| 禁止前端 service role | `! rg -n -e service_role -e SUPA_JWT_SECRET -e WALLET_LOGIN_SECRET_KEY src package.json app.json --glob '!**/__tests__/**'` | pass | 9ms |
| 禁止 token 日志 | `! rg -n -e 'console\\.log.*token' -e 'console\\.error.*token' -e 'console\\.log.*session' -e 'console\\.error.*session' src /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | pass | 12ms |
| wallet-select 不轮换 JWT | `! rg -n -e 'signJwt' -e 'access_token' -e 'expires_in' -e 'SUPA_JWT_SECRET' /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching/supabase/functions/wallet-select` | pass | 7ms |
| wallet selection 不替换 Supabase session | `! rg -n -e 'persistSession' -e 'replaceSession' -e 'setSession' src/features/wallet` | pass | 7ms |
| `wallet-login` 未改 | `git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching diff 1f57226 -- supabase/functions/wallet-login/index.ts` | pass | 11ms |
| 文档一致性 | `npm run ai:audit -- rn-wallet-switching` | pass | 118ms |
| Git 污染检查 | `git status --short && git -C /Users/rwa_start/ProjectSource/ArtStarFront/.worktrees/rn-wallet-switching status --short && git -C /Users/rwa_start/ProjectSource/ArtStarManagementPlatform/.worktrees/rn-wallet-switching status --short` | pass | 24ms |

## Manual QA

- [x] Android Dashboard account aggregation：在 `emulator-5554`、已完成 active-wallet 切换的真实 investor session 中重新加载应用并刷新 Dashboard；Portfolio 保持 `$16,929.00`，两项 Holdings 保留，Transactions 继续显示该 investor 的历史购买记录。
- [x] Android Dashboard reload / refresh stability：重启 Metro、重新加载 JS bundle并点击 `Refresh dashboard` 后，Portfolio、Holdings 和 Transactions 结果保持一致；未观察到 active-wallet 切换导致的导航重置或账户数据清空。
- [x] Task 9 边界：验证期间未轮换应用 JWT、未迁移链上 Token、未修改 `wallet-login`；Wallet 页面仍保留单钱包语义。
- [x] Android Rabby Chain 97 能力边界：模拟器安装的 Rabby Mobile 0.6.81 对 `eip155:97` proposal 返回 `No supported WalletConnect namespace to approve.`；同版本公开源码 `apps/mobile/src/core/walletconnect/chainAccount.ts` 的 `getWalletConnectSupportedChains()` 只返回 `getChainList('mainnet')`，证明手动添加 BNB Testnet不会扩展 WalletConnect supported chains。该结果属于钱包能力限制，不是 Reown timeout、SIWE、Privy或平台写入失败。
- [x] Android 连续钱包操作解锁：定位到成功选择后的 `complete` state未在authoritative Viewer收敛后重置，导致可见的下一次`Use`和受控解绑按钮保持`disabled=true`。WalletScreen现在仅在Viewer active address等于完成目标时重置selection workflow；新增回归先RED后GREEN，Wallet聚焦`17 files / 119 tests`、全量`93 files / 529 tests`、typecheck与`git diff --check`通过。模拟器重新加载当前bundle后，`Use`成功打开`Switch active wallet?`，删除成功打开`Unlink wallet?`；两次均取消，未执行平台切换或Privy解绑写入。
- [ ] Android WalletConnect最终验收：Chain 97使用 MetaMask完成 connection / SIWE / 自动 active / Viewer收敛；Rabby改在Chain 56环境验收。不得为Rabby向测试环境 proposal加入56或允许跨环境链降级。
- [ ] Manual QA：iOS dev build验证连接 / SIWE / 选择 / session；Android继续作为统一后续门禁。

说明：首次 Reload 的 `Unable to load script` 来自执行沙箱禁止 Metro 监听本地端口（直接启动时报 `listen EPERM ::1:8081`），在沙箱外启动当前仓库 Metro并恢复 `adb reverse tcp:8081 tcp:8081` 后消失；该问题不属于 Dashboard 业务实现。
