# Verification Run：rn-full-app-port

Generated：2026-07-14T02:02:44.968Z
Status：PASS
Pass / Total：8 / 8

## Commands

| 验证目标 | 命令 | 状态 | 耗时 |
| -------- | ---- | ---- | ---- |
| TypeScript | `npx tsc --noEmit` | pass | 1947ms |
| 全量单元测试 | `npm test -- src` | pass | 1025ms |
| ai-delivery 审核 | `npm run ai:audit -- rn-full-app-port` | pass | 100ms |
| 无 UI 直连 Edge Function | `node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "register-user" -e "generate-signature" -e "get-my-referrals" src/ --glob "*.tsx"` | pass | 35ms |
| 无 token / session / signature 明文日志 | `node scripts/verify-no-match.mjs -e "console\\.log.*token" -e "console\\.warn.*token" -e "console\\.error.*token" -e "console\\.log.*session" -e "console\\.warn.*session" -e "console\\.error.*session" -e "console\\.log.*signature" -e "console\\.warn.*signature" -e "console\\.error.*signature" -e "logger\\..*token" -e "logger\\..*session" -e "logger\\..*signature" src/ --glob "*.ts" --glob "*.tsx"` | pass | 33ms |
| 无 Web-only API 泄漏 | `node scripts/verify-no-match.mjs -e "react-router-dom" -e "react-helmet-async" -e "@radix-ui" -e "className=" -e "window\\." -e "document\\." -e "sessionStorage\\." -e "localStorage\\." -e "navigator\\." src/ --glob "*.ts" --glob "*.tsx"` | pass | 28ms |
| 禁止 UI 直接写表 | `node scripts/verify-no-match.mjs -e "\\.from\\(.+\\)\\.insert" -e "\\.from\\(.+\\)\\.upsert" -e "\\.from\\(.+\\)\\.update" -e "\\.from\\(.+\\)\\.delete" src/ --glob "*.tsx"` | pass | 28ms |
| 无 index key 列表 | `node scripts/verify-no-match.mjs "key=\\{.*index\\}" src/ --glob "*.tsx"` | pass | 27ms |
