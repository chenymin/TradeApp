# Verification Run：privy-login

Generated：2026-07-01T13:14:32.335Z
Status：PASS
Pass / Total：10 / 10

## Commands

| 验证目标 | 命令 | 状态 | 耗时 |
| -------- | ---- | ---- | ---- |
| AI Delivery 一致性 | `node_modules/.bin/ai-delivery audit privy-login` | pass | 39ms |
| 无需求 / 方案 / 计划占位符 | `node -e 'const fs=require("fs"); const files=["docs/requirements/2026-07-01-privy-login.md","docs/plans/2026-07-01-privy-login-design.md","docs/plans/2026-07-01-privy-login-implementation.md"]; const patterns=["待填"+"写","T"+"BD","TO"+"DO","{"+"{"]; const hits=[]; for (const file of files) { const text=fs.readFileSync(file,"utf8"); for (const pattern of patterns) { if (text.includes(pattern)) hits.push(file+": "+pattern); } } if (hits.length) { console.error(hits.join("\\n")); process.exit(1); }'` | pass | 19ms |
| TypeScript 类型检查 | `npx tsc --noEmit` | pass | 1068ms |
| Auth 单元测试 | `npm test -- src/features/auth` | pass | 372ms |
| 登录接口只在 service 层 | `node scripts/verify-no-match.mjs -e "wallet-login" -e "functions/v1" src/ --glob "*.tsx"` | pass | 37ms |
| 禁止绕过约定的数据写入路径 | `node scripts/verify-no-match.mjs -e "\\.from\\(.+\\)\\.insert" -e "\\.from\\(.+\\)\\.upsert" -e "\\.from\\(.+\\)\\.update" -e "\\.from\\(.+\\)\\.delete" src/ --glob "*.ts" --glob "*.tsx"` | pass | 28ms |
| 无客户端直接写登录相关表 | `node scripts/verify-no-match.mjs -e "\\.from\\(.+\\)\\.insert" -e "\\.from\\(.+\\)\\.upsert" -e "\\.from\\(.+\\)\\.update" -e "\\.from\\(.+\\)\\.delete" src/ --glob "*.ts" --glob "*.tsx"` | pass | 26ms |
| 无 service role / secret 泄漏 | `node scripts/verify-no-match.mjs -e "service_role" -e "SERVICE_ROLE" -e "JWT_SECRET" -e "PRIVY_APP_SECRET" -e "SUPABASE_SERVICE_ROLE" src App.tsx index.ts app.json package.json` | pass | 27ms |
| 无 token / session 明文日志 | `node scripts/verify-no-match.mjs -e "console\\.log.*token" -e "console\\.warn.*token" -e "console\\.error.*token" -e "console\\.log.*session" -e "console\\.warn.*session" -e "console\\.error.*session" -e "logger\\..*token" -e "logger\\..*session" src/ --glob "*.ts" --glob "*.tsx"` | pass | 30ms |
| 无 index key 性能反模式 | `node scripts/verify-no-match.mjs "key=\\{.*index\\}" src/ --glob "*.tsx"` | pass | 25ms |
