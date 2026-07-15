# 实现计划：React Native 全量 App 迁移

日期：2026-07-02
Feature slug：`rn-full-app-port`
状态：草稿

## 输入文档

- 需求文档：`docs/requirements/2026-07-02-rn-full-app-port.md`
- 方案设计：`docs/plans/2026-07-02-rn-full-app-port-design.md`
- UI 规范：`docs/plans/rn-full-app-port/ui-guidelines.md`

## 实现策略

以当前 Expo / React Native 项目为宿主，按阶段重建移动端 App：先完成 Auth/Register 和基础导航，再迁移公开资产浏览，随后补 Dashboard / Referral / KYC，最后实现 Wallet / Purchase / Transfer。每一阶段都必须可独立运行、测试和回滚；不得把 Web UI 代码逐文件复制到 RN。

移动端 UI 统一采用 **Tokenized Art Finance UI System**：Web3 艺术品代币化金融方向，强调克制、高级、可信、资产感和链上感。后续每个 Task 的 UI 实现都必须先参考 `docs/plans/rn-full-app-port/ui-guidelines.md`，避免临时调样式导致界面割裂。

## 路线图执行约定

本计划是 `rn-full-app-port` 的 Epic 级路线图，不作为一次性全量编码说明书使用。编码时必须一次只执行当前 Task；进入下一个 Task 前，先补齐该 Task 的 slice 级实现说明，明确接口契约、页面状态、错误态、测试和手动 QA，再继续编码。

从 Task 2 起，详细实现方案统一放在 `docs/plans/rn-full-app-port/tasks/` 下；本总文档只保留 Task 摘要、状态、关键契约和链接，确保 ai-delivery 仍能读取路线图，同时避免单文件持续膨胀。

每个 Task 开工前必须完成：

- 在 `docs/plans/rn-full-app-port/tasks/` 下补充或校准当前 slice 的接口契约、状态流转、错误码、UI 验收和验证命令，并在本实现计划的对应 Task 下保留摘要链接。
- 如果该 Task 涉及高风险能力（auth、KYC、payment、wallet、contract、RLS、realtime），必须写清可信来源、禁止前端决策的边界、回滚 / stop-for-human 条件。
- 如果发现原需求或方案仍过粗，先更新 `docs/requirements/2026-07-02-rn-full-app-port.md` 或 `docs/plans/2026-07-02-rn-full-app-port-design.md`，再运行 ai-delivery audit。
- 只有当前 Task 的 slice 文档通过 audit 后，才进入该 Task 的测试先行编码。
- Task 完成后，把业务追踪矩阵中对应行从 `Planned` 更新为已实现位置、验证命令和残余风险；不得提前标记后续 Task。

Task 1 可以直接作为第一批编码 slice；Task 2 起必须在编码前补充更细的实现细节，尤其是 Edge Function request / response / error contract、移动端页面状态和跨平台 QA。

Task 1 的首版 foundation shell 已完成，但导航 UI 只满足结构可运行，不满足正式移动端信息架构。进入 Task 2 前必须先完成 Task 1b：Navigation UI refinement，把导航从临时文字壳升级为可承载后续 feature 的 MainTabs 框架。

## Decision Notes

| 决策 | 来源 | 原因 | 实现影响 |
| ---- | ---- | ---- | -------- |
| C 范围作为最终目标，但分阶段交付 | 需求 / 方案 | 全量迁移涉及 auth、KYC、wallet、contract、realtime、RLS，风险过高 | 任务拆为 5 个阶段，后续编码只做当前阶段 task |
| 重建 RN UI，不复制 Web JSX / Tailwind / Radix | 方案 | Web 组件大量依赖 DOM 和浏览器 API | 新增 RN UI kit、screen、navigation；Web 组件只作行为参考 |
| 外部能力 adapter 化 | 方案 | Privy Expo、KYC、chain wallet provider 存在移动端差异 | 新建 service / adapter，screen 不直接调用 SDK |
| KYC 首版 WebView / browser adapter | 方案 | 原生 Sumsub SDK 选型延后 | KYC task 先做 launcher 和状态刷新，不实现原生 SDK |
| 链上读写拆开 | 方案 | 链上读可用 viem public client，写依赖钱包 provider | Public discovery 阶段可读链；Purchase / Transfer 独立验证 |
| `wallet-login` 不模拟长期 refresh | 方案 | 后端返回短期 JWT | sessionStorage 保存 accessToken/expiresAt；过期后重新登录 |

## 结构约束

- 入口文件职责：`App.tsx`、`src/app/AppRoot.tsx` 和 navigation root 只挂 Provider、navigation、root fallback，不写业务分支。
- 新增行为挂载位置：
  - Navigation：`src/app/navigation/*`
  - Config：`src/app/config/*`
  - UI primitives：`src/shared/ui/*`
  - Platform adapters：`src/shared/platform/*`
  - Chain adapters：`src/lib/chain/*`
  - Feature modules：`src/features/{auth,registration,assets,dashboard,referral,kyc,wallet,purchase}/*`
- 领域逻辑所在模块：每个 feature 的 `domain` / `workflow` / `services` 子目录；纯函数不得 import RN、SDK 或真实 client。
- 禁止膨胀的文件：`App.tsx`、`src/app/AppRoot.tsx`、`src/features/auth/components/LoginScreen.tsx`、未来 `AssetDetailScreen.tsx`、`DashboardScreen.tsx`、`WalletScreen.tsx` 单文件不得承载 workflow、API、错误分类、状态机和复杂数据映射。
- 可接受抽象：只在隔离平台差异、外部 SDK、数据契约或状态机时新增；不要创建无业务含义的通用层。

## 结构验收标准

| 约束 | 验收方式 |
| ---- | -------- |
| 入口层保持薄 | `App.tsx` / `AppRoot.tsx` code review，只允许 Provider、navigation、fallback |
| Screen 不直接请求外部系统 | Forbidden pattern scan + code review |
| 大型页面拆分为 section components | AssetDetail、Dashboard、Wallet review 中无单文件承载全部业务逻辑 |
| 外部 SDK 通过 adapter | Privy、Supabase、KYC、wallet、chain、platform 能力只在 service / adapter |
| 阶段可回滚 | 每阶段新增 route / tab / feature 可被移除或禁用，不影响已完成阶段 |

## 模块内聚与可测试性验收标准

| 约束 | 验收方式 |
| ---- | -------- |
| 业务规则可脱离 UI 测试 | domain / workflow tests 覆盖状态机、映射、错误分类和 guard |
| IO 与数据转换分离 | repository/service tests 使用 fake fetch / fake Supabase / fake wallet |
| 副作用集中 | SecureStore、Linking、Share、Realtime、交易写入均通过 adapter |
| 列表性能可控 | 资产、交易、推荐、佣金列表使用 FlatList / SectionList 或分页 |
| 验收场景可追踪 | 业务追踪矩阵每行映射到 Task 和测试 / QA |

## 代码规则约束

- 状态模型：Auth、Registration、KYC、Purchase、Wallet 必须有显式状态或可测试 reducer / workflow；非法流转用测试覆盖。
- 可信边界：账号、角色、KYC、推荐、购买资格、签名、RLS、合约结果都不由前端最终判断。
- 副作用：
  - 请求：service / repository。
  - 写入：workflow 调用 service，或 wallet adapter 发交易。
  - 订阅：realtime adapter，screen focus + AppState active 才启用。
  - 导航：navigation gate / screen action。
  - 全局状态：AuthProvider / QueryClient。
- 错误和回滚：每阶段 route / tab 可通过 feature flag 或 navigation 移除回滚；交易类功能生产前必须 stop-for-human。
- 配置和密钥：只允许 `EXPO_PUBLIC_*` 公开配置；不得把 secret 写入 `.env.example` 以外的文档真实值。

## Forbidden Patterns

- 禁止在 screen / component 中直接拼接 Edge Function URL 或调用 `fetch("/functions/v1")`。验证：`node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "register-user" -e "generate-signature" -e "get-my-referrals" src/ --glob "*.tsx"` 无 UI 命中。
- 禁止 UI 组件直接写 Supabase 表。验证：`node scripts/verify-no-match.mjs -e "\\.from\\(.+\\)\\.insert" -e "\\.from\\(.+\\)\\.upsert" -e "\\.from\\(.+\\)\\.update" -e "\\.from\\(.+\\)\\.delete" src/ --glob "*.tsx"` 无命中。
- 禁止绕过约定的数据写入路径。验证：`rg "\\.from\\(.+\\)\\.(insert|upsert|update|delete)" src/ --glob "*.ts" --glob "*.tsx"` 只允许 repository / service 中经 review 的文件。
- 禁止仅依赖前端权限判断。验证：`rg "isAdmin.*(insert|update|delete)|kycApproved.*writeContract|walletAddress.*register-user" src/ --glob "*.ts" --glob "*.tsx"` 无命中或有测试说明。
- 禁止明文记录 token / session / signature / secret / KYC 原文。验证：`node scripts/verify-no-match.mjs -e "console\\.log.*token" -e "console\\.warn.*token" -e "console\\.error.*token" -e "console\\.log.*session" -e "console\\.warn.*session" -e "console\\.error.*session" -e "console\\.log.*signature" -e "console\\.warn.*signature" -e "console\\.error.*signature" -e "console\\.log.*secret" -e "console\\.warn.*secret" -e "console\\.error.*secret" -e "logger\\..*token" -e "logger\\..*session" -e "logger\\..*signature" -e "logger\\..*secret" src/ --glob "*.ts" --glob "*.tsx"`。
- 禁止直接移植 Web-only 依赖到 RN screen。验证：`node scripts/verify-no-match.mjs -e "react-router-dom" -e "react-helmet-async" -e "@radix-ui" -e "className=" -e "window\\." -e "document\\." -e "sessionStorage\\." -e "localStorage\\." -e "navigator\\." src/ --glob "*.ts" --glob "*.tsx"` 无未隔离命中。
- 禁止大列表不用虚拟化。验证：review 所有资产、交易、推荐、佣金列表必须使用 `FlatList` / `SectionList` 或分页组件。
- 禁止在 App 启动或全局 Provider 中放高频变化状态。验证：code review + profiler / manual QA。

## Machine Verification

| 验证目标 | 命令 | 预期结果 |
| -------- | ---- | -------- |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| 全量单元测试 | `npm test -- src` | exit 0 |
| ai-delivery 审核 | `npm run ai:audit -- rn-full-app-port` | exit 0 |
| 无 UI 直连 Edge Function | `node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "register-user" -e "generate-signature" -e "get-my-referrals" src/ --glob "*.tsx"` | 仅 service tests 允许；UI 无命中 |
| 无 token / session / signature 明文日志 | `node scripts/verify-no-match.mjs -e "console\\.log.*token" -e "console\\.warn.*token" -e "console\\.error.*token" -e "console\\.log.*session" -e "console\\.warn.*session" -e "console\\.error.*session" -e "console\\.log.*signature" -e "console\\.warn.*signature" -e "console\\.error.*signature" -e "logger\\..*token" -e "logger\\..*session" -e "logger\\..*signature" src/ --glob "*.ts" --glob "*.tsx"` | 无命中 |
| 无 Web-only API 泄漏 | `node scripts/verify-no-match.mjs -e "react-router-dom" -e "react-helmet-async" -e "@radix-ui" -e "className=" -e "window\\." -e "document\\." -e "sessionStorage\\." -e "localStorage\\." -e "navigator\\." src/ --glob "*.ts" --glob "*.tsx"` | 无未隔离命中 |
| 禁止 UI 直接写表 | `node scripts/verify-no-match.mjs -e "\\.from\\(.+\\)\\.insert" -e "\\.from\\(.+\\)\\.upsert" -e "\\.from\\(.+\\)\\.update" -e "\\.from\\(.+\\)\\.delete" src/ --glob "*.tsx"` | 无命中 |
| 无 index key 列表 | `node scripts/verify-no-match.mjs "key=\\{.*index\\}" src/ --glob "*.tsx"` | 无命中 |

## Consistency Check

- [x] 需求、方案、实现计划的文件路径、字段名和验收场景一致。
- [x] 方案 Decision Notes 已反映到实现策略和任务。
- [x] 每个 Forbidden Pattern 都有机器验证或 review 检查。
- [x] 每个验收场景都能追踪到任务、测试或手动 QA。

## 任务拆分

### Task 1：App foundation、navigation、config、UI primitives

- 状态：done
- 业务场景：所有移动端页面需要统一导航、配置读取、基础 UI 和错误边界。
- 范围内：新增 App config module、navigation shell、public/protected route gate、基础 `Screen`, `Text`, `Button`, `Card`, `Input`, `SegmentedControl`, `ListState` primitives、fatal config screen。
- 范围外：不实现具体业务 screen；不接 KYC / wallet / chain 写操作。
- 预计影响文件：
  - `src/app/AppRoot.tsx`
  - `src/app/config/publicConfig.ts`
  - `src/app/navigation/AppNavigator.tsx`
  - `src/shared/ui/*`
  - `src/shared/platform/*`
  - `src/app/__tests__/publicConfig.test.ts`
  - `src/app/navigation/__tests__/navigationState.test.ts`
- 结构验收：`AppRoot` 只组合 Provider 和 Navigator；UI primitives 无业务请求；config 不暴露 secret。
- 可测试性验收：config parser、navigation route definitions、fatal config state 可脱离 RN runtime 测试。
- 验收标准：App 可进入 public shell；缺配置时显示 fatal config；protected route 未登录时引导登录。
- 测试：
  - 先写 `publicConfig.test.ts` 覆盖缺失 env 和合法 env。
  - 先写 navigation state 测试覆盖 public/protected route gate。
  - 运行 `npm test -- src/app` 和 `npx tsc --noEmit`。
- 可追溯关系：公开 Launchpad、Session 过期、iOS / Android QA 的基础。
- 实现状态：Completed for foundation slice（2026-07-02）。
- 已实现文件：
  - `src/app/config/publicConfig.ts`
  - `src/app/config/FatalConfigScreen.tsx`
  - `src/app/navigation/navigationState.ts`
  - `src/app/navigation/AppNavigator.tsx`
  - `src/shared/ui/*`
  - `src/test/renderElement.ts`
  - `src/app/AppRoot.tsx`
  - `src/app/providers/PrivyProviderBoundary.tsx`
- 已实现测试：
  - `src/app/config/__tests__/publicConfig.test.ts`
  - `src/app/config/__tests__/FatalConfigScreen.test.tsx`
  - `src/app/navigation/__tests__/navigationState.test.ts`
  - `src/app/navigation/__tests__/AppNavigator.test.tsx`
  - 更新 `src/app/providers/__tests__/PrivyProviderBoundary.test.tsx`
- 已运行验证：
  - `npm test -- src/app src/features/auth`
  - `npm test -- src`
  - `npx tsc --noEmit`
  - `npm run ai:audit -- rn-full-app-port`
  - `rg "functions/v1|wallet-login|register-user|generate-signature|get-my-referrals" src/ --glob "*.tsx"`
  - `rg "key=\\{.*index\\}" src/ --glob "*.tsx"`
- 剩余边界：Task 1 只提供 public / protected shell、fatal config、route gate 和 UI primitives；Launchpad、Market、Dashboard、Wallet、KYC 等真实业务 screen 仍由后续 Task 实现。

### Task 1b：Navigation UI refinement、mobile app shell、tab/header system

- 业务场景：用户打开 App 后需要看到像真实投资工具的移动端导航，而不是临时文字壳；后续 Launchpad、Market、Dashboard、Wallet、KYC、Referral、Purchase、Transfer 都必须挂在稳定的信息架构上。
- 范围内：
  - 将临时 `PublicShell` / `ProtectedShell` 重构为登录前后共享的 `MainTabs` 可测试导航 shell。
  - 新增 route registry、tab metadata、header metadata、route placeholder 组件。
  - 新增 `AppHeader`、`BottomTabBar`、`RoutePlaceholder`、`AppShell` 等导航 UI 组件。
  - 未登录状态默认进入 `Launchpad`，header 提供登录入口；登录不再嵌入首页内容流。
  - 底部 tab 固定为 `Launchpad`、`Market`、`Referral`、`Dashboard`、`My`。
  - `Launchpad`、`Market`、`Referral`、`My` 为公开入口，未登录可直接切换；`Dashboard` 需要登录，未登录点击触发登录。
  - 已登录状态默认进入 `Dashboard`。
  - `My/Profile` 作为 Wallet、KYC、邀请好友、Settings、Logout 的入口容器；Wallet / KYC / 邀请好友不作为底部主 tab。
  - 购买、转账、KYC launcher 保留为 stack detail / sheet / modal 入口，不进入底部 tab。
  - 更新 UI theme，补齐导航所需的 typography、status colors、tab sizing、safe area spacing。
- 范围外：
  - 不实现真实 Launchpad、Market、Dashboard、Wallet、KYC、Referral 数据。
  - 不接 Supabase 查询、Realtime、KYC、wallet、chain 或 purchase workflow。
  - 不引入新的业务权限判断；受保护访问仍由 auth state 和后续后端 / RLS 判断。
- 预计影响文件：
  - `src/app/navigation/AppNavigator.tsx`
  - `src/app/navigation/navigationState.ts`
  - `src/app/navigation/components/AppHeader.tsx`
  - `src/app/navigation/components/BottomTabBar.tsx`
  - `src/app/navigation/components/RoutePlaceholder.tsx`
  - `src/app/navigation/components/AppShell.tsx`
  - `src/shared/ui/theme.ts`
  - `src/app/navigation/__tests__/navigationState.test.ts`
  - `src/app/navigation/__tests__/AppNavigator.test.tsx`
  - 可能新增 `src/app/navigation/__tests__/navigationChrome.test.tsx`
- 结构验收：
  - `AppNavigator` 只组合 auth gate、main tabs 和 fallback。
  - route / tab / header 元数据集中在纯函数模块，能脱离 RN runtime 测试。
  - navigation components 不直接 import Supabase、Privy、wallet、KYC、chain service。
  - 后续业务 screen 通过 route registry 注册，不在导航组件里写业务内容。
- 可测试性验收：
  - navigation state tests 覆盖 public routes、protected routes、account disabled、initial route、tab metadata。
  - component tests 覆盖 logged out shell、authenticated tabs、active tab label、login action placement、logout/profile action placement。
  - Forbidden scan 证明导航 UI 没有直接 Edge Function、Supabase 写入、Web-only API。
- 验收标准：
  - 未登录：首屏显示 Launchpad app shell、顶部登录动作、底部 tab 为 Launchpad / Market / Referral / Dashboard / My；Launchpad / Market / Referral / My 可切换，Dashboard 触发登录。
  - 已登录：首屏显示 Dashboard app shell，底部 tab 为 Launchpad / Market / Referral / Dashboard / My；tab 尺寸稳定、标签不换行。
  - Login：只通过 header button、受保护动作或 auth-required state 进入，不在 Public content 中作为大卡片堆叠。
  - My/Profile：承载 Wallet、KYC、邀请好友、Settings、Logout 入口。
  - Restoring / fatal config / account disabled 状态仍有明确 root fallback。
- 测试：
  - 先写 failing tests：`npm test -- src/app/navigation`
  - 实现后运行：`npm test -- src/app/navigation src/app/config src/features/auth`
  - 运行：`npx tsc --noEmit`
  - 运行：`npm run ai:audit -- rn-full-app-port`
  - 运行 forbidden scans：UI Edge Function、UI direct write、Web-only API、index key。
- 可追溯关系：公开 Launchpad、Market 浏览、Dashboard、Wallet 查看、KYC 未开始、Referral、Session 过期、iOS / Android QA 的导航基础。
- 实现状态：Completed（2026-07-02）。
- 已实现文件：
  - `src/app/navigation/AppNavigator.tsx`
  - `src/app/navigation/navigationState.ts`
  - `src/app/navigation/components/AppHeader.tsx`
  - `src/app/navigation/components/BottomTabBar.tsx`
  - `src/app/navigation/components/RoutePlaceholder.tsx`
  - `src/app/navigation/components/AppShell.tsx`
  - `src/shared/ui/theme.ts`
- 已实现测试：
  - 更新 `src/app/navigation/__tests__/navigationState.test.ts`
  - 更新 `src/app/navigation/__tests__/AppNavigator.test.tsx`
  - 新增 `src/app/navigation/__tests__/navigationChrome.test.tsx`
- 已运行验证：
  - `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx`
  - `npm test -- src/app/navigation`
  - `npm test -- src/app src/features/auth`
  - `npm test -- src`
  - `npx tsc --noEmit`
- 交互状态：
  - Main tab 点击已支持本地切换；`Launchpad / Market / Referral / Dashboard / My` 会更新 active tab 和 placeholder 内容。
  - 未登录用户可切换 `Launchpad`、`Market`、`Referral`、`My`；点击 `Dashboard` 会触发登录动作，不切换到受保护内容。
  - Wallet 已从底部 tab 移入 `My/Profile` 入口，后续真实 Wallet screen 仍由 Task 8 接入。
  - 该切换只改变本地导航 UI，不新增任何受保护数据读取或业务权限判断。
- 剩余边界：Task 1b 只提供 app shell、route metadata、header、bottom tabs 和 placeholders；真实 Launchpad、Market、Dashboard、Wallet、KYC、Referral、Purchase、Transfer 仍由后续 feature tasks 实现。

### Task 2：Auth/Register workflow 完整化

- 状态：done
- 详细实现方案：[2026-07-03-task-02-auth-register-workflow.md](rn-full-app-port/tasks/2026-07-03-task-02-auth-register-workflow.md)
- 业务场景：用户通过 Privy 登录后，按 `wallet-login.user_status` 完成新用户注册、邀请注册或孤儿账号恢复。
- 当前 slice 目标：把已完成的 Privy -> `wallet-login` 登录链路升级为可处理 `existing`、`new`、`orphaned`、邀请注册和账号阻断的移动端注册 workflow；不进入真实 Dashboard 数据、KYC、Wallet 或链上交易。
- App 端邀请注册形态：邀请仍以链接为主；App 解析 `type + ref` 或 `type + invitation_token` 并暂存，登录后调用 `register-user`；未安装 App 时先落 Web fallback。
- 关键契约：`wallet-login` 暴露 `user_status`；`register-user` 使用 Bearer access token 和 `{ selected_type, referrer_code?, invitation_token? }`。
- 验收摘要：`new` 自动注册，`orphaned` 无 payload 进入 recovery，existing with invite 不重新绑定邀请，账号暂停 / 关闭进入 blocked state。
- 实现状态：Completed for Task 2 slice（2026-07-03）。
- 验证摘要：`npm test -- src/features/auth src/features/registration`、`npm test -- src/app/providers`、`npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx`、`npx tsc --noEmit` 已通过。

### Task 2b：Deep Link / Invite Registration Handoff

- 详细实现方案：[2026-07-03-task-02b-deep-link-invite-registration.md](rn-full-app-port/tasks/2026-07-03-task-02b-deep-link-invite-registration.md)
- 业务场景：已登录用户在 App 内邀请好友，好友通过邀请 URL 打开 Web fallback、安装或打开 App，并最终进入登录 / 注册流程。
- 当前 slice 目标：把 Web 端 `InviteModal` 的“选择用户类型 + 生成邀请链接 + 复制”迁移为 RN 邀请分享入口，并接上 App deep link intake，让 `/register?ref=...&type=...` 能落到 Task 2 的 registration payload。
- 关键契约：canonical invite URL 继续兼容 Web：`https://<web-origin>/register?ref=<inviteCode>&type=<userType>`；App 额外支持 `mytradeapp://register?ref=<inviteCode>&type=<userType>`。
- 验收摘要：可选择 `investor / collector / creator / institution` 生成邀请链接；复制 / 分享有反馈；冷启动和运行中收到邀请 URL 均能暂存 payload；未登录后续登录注册使用 payload；已登录打开邀请 URL 不重新绑定推荐关系。
- 实现状态：Completed for Task 2b slice（2026-07-03）。
- 验证摘要：`npm test -- src/features/referral src/features/registration src/app/linking`、`npm test -- src/app/navigation src/app/providers`、`npm test -- src`、`npx tsc --noEmit` 已通过。
- 边界：当前邀请入口使用 `DEMO-CODE` 和 `https://app.mytrade.local` 占位；真实 invite code / web origin、Web fallback 页面、Universal Link / Android App Link 域名关联、deferred attribution 仍由后续 Referral / release tasks 完成。

### Task 3：Asset data、Launchpad screen、Market screen

- 状态：done
- 详细实现方案：[2026-07-03-task-03-public-assets-launchpad-market.md](rn-full-app-port/tasks/2026-07-03-task-03-public-assets-launchpad-market.md)
- 业务场景：未登录和已登录用户都能浏览公开资产、筛选 Launchpad、搜索 / 排序 Market。
- 当前 slice 目标：迁移公开资产列表为 RN repository / mapper / pagination workflow，新增 Launchpad 和 Market 移动端列表；Launchpad 使用单列 `FlatList`、状态 tabs、横向 Summary Strip、下拉刷新和上拉加载；Market 使用同一套列表能力并补搜索 / 排序 shell。
- 关键契约：公开资产列表使用 cursor 风格 pagination；`AssetPageRequest` 包含 filter、search、sort、cursor、pageSize；`AssetPageResult` 返回 items、nextCursor、totalCount；列表会读取 Supabase `art_assets` / `artwork_submissions`，并通过 read-only 合约 adapter 批量读取 `saleActive`、`sold`、`SALE_CAP`、`saleStartTime`、`saleEndTime` 推导展示状态。
- 状态策略：展示、筛选和排序优先使用链上状态；数据库 `status` 只作为 loading / error / unsupported fallback。任何数据库 fallback 得出的 `active` 都不能作为购买可信来源。
- UI 摘要：Launchpad 首屏为 Header、标题说明、筛选 tabs、横向指标条、资产列表；资产卡展示图片、状态、艺术家、作品名、token code、价格、可购份额、进度、参与人数、剩余时间。
- 列表交互：首次 skeleton；下拉刷新第一页；上拉加载下一页；切换筛选重置 cursor 并回顶部；刷新 / 加载更多并发互斥；旧请求返回不得覆盖新筛选。
- 范围内：迁移 `mapAssetRow`、`useArtAssets`、`useMarketAssets` 为 RN repository / hooks；新增 Launchpad screen、AssetCard、Launchpad Summary Strip、Market screen、empty/loading/error/refresh/loading-more/end states。
- 范围外：不做 Asset Detail 购买面板；不做链上写；Market 交易只打开外链。
- 已实现文件：
  - `src/features/assets/domain/assetModels.ts`
  - `src/features/assets/domain/assetDisplayStatus.ts`
  - `src/features/assets/domain/assetMappers.ts`
  - `src/features/assets/domain/assetListState.ts`
  - `src/features/assets/services/assetRepository.ts`
  - `src/features/assets/services/assetContractReadAdapter.ts`
  - `src/features/assets/services/publicAssetPageLoader.ts`
  - `src/features/assets/services/createRuntimePublicAssetLoader.ts`
  - `src/features/assets/services/createDefaultPublicAssetLoader.ts`
  - `src/features/assets/hooks/usePublicAssetList.ts`
  - `src/features/assets/components/AssetCard.tsx`
  - `src/features/assets/components/LaunchpadSummaryStrip.tsx`
  - `src/features/assets/components/PublicAssetList.tsx`
  - `src/features/assets/screens/LaunchpadScreen.tsx`
  - `src/features/assets/screens/MarketScreen.tsx`
  - `src/app/AppRoot.tsx`
  - `src/app/navigation/AppNavigator.tsx`
- 结构验收：Supabase 查询在 repository；screen 使用 `FlatList`；图片有固定 aspect ratio；无 `key={index}`。
- 可测试性验收：status trust、asset mapper、Supabase repository、viem adapter、aggregation loader、list reducer/hook、Market search/sort、screen 和 navigation 均使用 deterministic fake 测试。
- 验收标准：公开 Launchpad 和 Market 可用；加载、空态、失败态完整；未登录可访问。
- 测试：
  - `npm test -- src/features/assets`
  - `rg "key=\\{.*index\\}" src/features/assets --glob "*.tsx"` 无命中。
- 可追溯关系：公开 Launchpad、Market 浏览。
- 实现状态：Completed（2026-07-13）。
- 验证摘要：全量 `npm test` 通过 34 个测试文件 / 146 个测试；`npm run typecheck`、`npm run ai:audit -- rn-full-app-port`、UI 无 Supabase 直连、无写链 API、无 index key、无生产 service-role 泄漏扫描通过。
- Review 摘要：Supabase 搜索拆分为 symbol 根表查询与 `artwork_submissions!inner` 关联查询，避免 PostgREST 跨表 `.or()`；链上失败只降级为不可购买信任的数据库展示；无未解决 Critical / Important 代码发现。
- 发布边界：部署前人工确认 `art_assets`、`artwork_submissions` 对 `anon` 暴露且 SELECT RLS 正确；iOS / Android 实机布局、图片加载、下拉刷新和滚动分页 QA 仍是发布 stop-for-human，不影响 Task 4 继续开发。

### Task 4：Asset Detail、chain read adapter、purchase eligibility read-only

- 详细实现方案：[2026-07-03-task-04-asset-detail-readonly-layout.md](rn-full-app-port/tasks/2026-07-03-task-04-asset-detail-readonly-layout.md)
- 业务场景：用户进入资产详情，查看艺术品信息、估值、规则、sale 状态和购买资格提示。
- 当前 slice 目标：把桌面详情页的左右栏改为移动端纵向详情 + sticky segmented tabs + 底部固定 CTA；展示作品信息、估值报告、发行规则、合约信息和事件时间线；仅做 read-only 购买入口 shell。
- 关键契约：详情 tab 为 `overview / valuation / rules / onchain`；底部 CTA 状态为 `connect_required / kyc_required / not_started / not_eligible / sale_open / sold_out / sale_closed / read_only`；详情读取 Supabase `art_assets` / `artwork_submissions` / `asset_valuation_reports` / `mint_events`，并通过 read-only 合约 adapter 读取价格、发售进度、余额 / allowance 预览和 sale 时间。
- 状态策略：详情页必须复用 Task 3 的 Sale Status Resolution Policy；只有 `source = chain`、`chainStatus = ready` 且 `displayStatus = active` 时，底部 CTA 才允许进入购买入口。数据库 fallback 只能展示，不允许购买。
- UI 摘要：首屏展示大图、状态、token code、艺术家、作品名、价格、进度、参与者、已筹资、资格提示；购买输入不放在页面右栏，后续 Task 9 使用 bottom sheet。
- 范围内：Asset Detail screen、asset detail repository、chain read client、sale status derivation、purchase eligibility pure logic、估值 / 规则 / 链上 sections、BscScan / Pancake external links。
- 范围外：不发 approve / mint；不请求 generate-signature；真实 `generate-signature -> approve -> mint -> receipt` 购买写链路归 Task 9。
- 预计影响文件：
  - `src/features/assets/screens/AssetDetailScreen.tsx`
  - `src/features/assets/services/assetDetailRepository.ts`
  - `src/features/assets/domain/saleStatus.ts`
  - `src/lib/chain/publicClient.ts`
  - `src/features/purchase/domain/purchaseEligibility.ts`
  - 对应 tests。
- 结构验收：链上读取封装在 `publicClient` / repository；eligibility 是纯函数；screen 不直接调用 viem。
- 可测试性验收：sale status、eligibility、contract address guards 使用 fake data 测试。
- 验收标准：资产详情展示完整；未登录 / KYC 未通过 / sale 未开放 / 无合约时按钮状态正确。
- 测试：`npm test -- src/features/assets src/features/purchase src/lib/chain`。
- 可追溯关系：公开资产详情、购买失败中的非写入阻断。
- 实现状态：Code complete（2026-07-14）。已实现只读详情 repository、BSC 56/97 合约读取、四个详情 tab、可信 CTA、局部错误降级、安全外链、placeholder 与来源 tab 返回；全量 `45` 个测试文件 / `201` 个用例和 TypeScript 检查通过。KYC / whitelist 在当前 auth runtime 中保持显式 `unknown`，不会由客户端推断；真实购买仍归 Task 9。iOS / Android 实机布局、真实 RLS 和外链行为仍为发布前人工门禁。

### Task 5：Dashboard data、profile、holdings、points、commission read model

- 业务场景：已登录用户打开 Dashboard 查看个人资料、昵称、KYC 摘要、持仓、交易、积分、推荐和佣金概览。
- 范围内：迁移 user profile、holdings、mint events、chain holdings read、points、commission read model；移动端用 card / section list。
- 范围外：不实现 KYC 提交流程、不实现购买 / 转账。
- 预计影响文件：
  - `src/features/dashboard/screens/DashboardScreen.tsx`
  - `src/features/dashboard/services/dashboardRepository.ts`
  - `src/features/dashboard/domain/commissionReadModel.ts`
  - `src/features/dashboard/domain/holdings.ts`
  - `src/features/dashboard/components/*`
  - `src/features/dashboard/__tests__/*`
- 结构验收：Dashboard screen 拆 section components；佣金和 holdings 计算在 domain；RLS 数据读取在 repository。
- 可测试性验收：holdings merge、commission mapping、nickname validation 纯测试。
- 验收标准：已登录且 session 可用时展示 Dashboard；RLS/401 时回到 auth error；空数据有空态。
- 测试：`npm test -- src/features/dashboard`。
- 可追溯关系：Dashboard、Session 过期。

### Task 6：Referral、invite links、leaderboard、share flow

- 详细业务契约：[Task 6/7 Rewards 与 Whitelist](rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md)
- 业务场景：未登录用户查看推荐规则 / 排行榜；已登录用户查看四类积分、个人邀请链接、推荐记录、积分流水、佣金摘要和明细，并通过系统复制 / 分享。
- 范围内：
  - Task 6A：Rewards read models、invite link builder、`get-my-referrals`、point ledger、commission summary/details。
  - Task 6B：My Rewards UI、三类虚拟化列表、tier benefits、share / clipboard adapter。
  - Task 6C：`confirm-payout` 独立受控写，含显式确认、幂等、刷新、feature flag 和资金边界 review。
  - 原计划的 public referral rules / leaderboard 仍保留在公开 `referralPublic` route，不与私有 Rewards 授权混用。
- 范围外：不新增推荐后端；不由客户端计算或授予积分 / 返佣；不执行实际链上付款。
- 预计影响文件：
  - `src/features/referral/screens/ReferralPublicScreen.tsx`
  - `src/features/referral/screens/RewardsScreen.tsx`
  - `src/features/referral/domain/inviteLinks.ts`
  - `src/features/referral/domain/commissionAmounts.ts`
  - `src/features/referral/services/referralRepository.ts`
  - `src/features/referral/services/commissionPayoutClient.ts`
  - `src/shared/platform/shareAdapter.ts`
  - `src/shared/platform/clipboardAdapter.ts`
  - 对应 tests。
- 结构验收：分享能力在 platform adapter；链接 builder 纯函数；token 不进入分享内容。
- 可测试性验收：deep link / web fallback link、clipboard/share error、commission decimal mapping 和 payout 状态机使用 fake adapter/client。
- 验收标准：有 invite code 且 KYC approved 时可复制/分享；三类私有列表有独立 loading / empty / error；确认 payout 后进入待付款而非已付款；未登录只看公开规则和 leaderboard。
- 测试：`npm test -- src/features/referral src/shared/platform`。
- 可追溯关系：Referral、邀请注册。

### Task 7：KYC status、KYC launcher、post-return refresh

- 详细业务契约：[Task 6/7 Rewards 与 Whitelist](rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md)
- 业务场景：用户从 Dashboard 进入完整 Whitelist 页面，查看状态、审核时间、有效期和 approved-only identity details；可在允许状态启动 / 恢复 KYC，返回后刷新服务端状态。
- 范围内：
  - Task 7A：完整只读 Whitelist、六种状态、approved-only identity details、敏感数据清理。
  - Task 7B：`kyc-init` / `kyc-mark-submitted`、确认过的 WebView / hosted bridge launcher adapter、AppState / deep-link return refresh。
- 范围外：不集成 Sumsub 原生 SDK；不处理 webhook。
- 预计影响文件：
  - `src/features/kyc/screens/KycScreen.tsx`
  - `src/features/kyc/services/kycRepository.ts`
  - `src/features/kyc/services/kycLauncher.ts`
  - `src/features/kyc/domain/kycStatus.ts`
  - 对应 tests。
- 结构验收：KYC URL 获取和打开在 service / adapter；screen 不直接打开 WebView URL；返回后重新查询 Supabase。
- 可测试性验收：KYC 状态映射、approved details gate、launcher success/failure、AppState refresh 使用 fake adapter。
- 验收标准：未开始、pending、under_review、awaiting_resubmission、rejected、approved 都有状态；under_review / rejected 不重复启动；未 approved 不请求 identity details；返回 App 后只从服务端刷新。
- 测试：`npm test -- src/features/kyc`。
- 可追溯关系：KYC 未开始、KYC 需补件、购买成功前置条件。

### Task 8：Wallet read-only、QR、copy/share、wallet security state

- 业务场景：用户打开 Wallet 查看地址、链、余额、绑定钱包、二维码、复制 / 分享地址和安全限制。
- 范围内：wallet adapter、balance read client、QR component、clipboard/share、wallet security policy、wallet manager UI。
- 范围外：不发 transfer；不做真实签名写操作。
- 预计影响文件：
  - `src/features/wallet/screens/WalletScreen.tsx`
  - `src/features/wallet/services/walletProviderAdapter.ts`
  - `src/features/wallet/services/walletBalanceRepository.ts`
  - `src/features/wallet/domain/walletSecurity.ts`
  - `src/features/wallet/components/*`
  - 对应 tests。
- 结构验收：Privy Expo wallet 调用在 adapter；余额读取使用 chain read client；QR/share 在 platform adapter。
- 可测试性验收：security policy、balance formatting、copy/share state 使用 fake adapters。
- 验收标准：Wallet 查看正常；embedded wallet 未满足 passkey MFA 时显示安全阻断；余额加载 / 错误态完整。
- 测试：`npm test -- src/features/wallet`。
- 可追溯关系：Wallet 查看、Wallet 安全阻断。

### Task 9：Purchase dry-run / testnet write workflow

- 业务场景：用户在资产详情完成购买流程，先请求后端签名，再 approve / mint，并等待 receipt。
- 范围内：purchase workflow、signature client、allowance / balance read、approve/mint transaction adapter、receipt polling、testnet / dry-run guard。
- 范围外：不默认开启生产真实上链；生产开关需人工确认。
- 预计影响文件：
  - `src/features/purchase/workflow/purchaseWorkflow.ts`
  - `src/features/purchase/services/signatureClient.ts`
  - `src/features/purchase/services/purchaseTransactionAdapter.ts`
  - `src/features/purchase/components/PurchasePanel.tsx`
  - `src/features/assets/screens/AssetDetailScreen.tsx`
  - 对应 tests。
- 结构验收：PurchasePanel 只调用 workflow action；交易 adapter 注入 fake provider 可测；signature 请求不在 UI。
- 可测试性验收：用户拒签、KYC required、wallet_not_linked、chain mismatch、insufficient balance、signature expired、success flow 都有测试。
- 验收标准：testnet/dry-run 可完成状态流转；生产真实交易默认 stop-for-human。
- 测试：`npm test -- src/features/purchase`。
- 可追溯关系：购买成功、购买失败。

### Task 10：Transfer workflow

- 业务场景：用户从 Wallet 发起 native / ERC20 转账，签名后等待 receipt 并刷新余额。
- 范围内：transfer workflow、address/amount validation、native/ERC20 transfer adapter、receipt polling、success/failure UI。
- 范围外：不绕过 passkey / wallet security；不提供批量转账。
- 预计影响文件：
  - `src/features/wallet/workflow/transferWorkflow.ts`
  - `src/features/wallet/services/transferAdapter.ts`
  - `src/features/wallet/components/TransferSheet.tsx`
  - 对应 tests。
- 结构验收：validation 纯函数；transfer adapter 注入 wallet provider；screen 不直接 `writeContract`。
- 可测试性验收：无钱包、非法地址、金额超额、用户拒签、receipt success/failure。
- 验收标准：转账成功显示 tx hash 和 explorer 链接；失败可重试；余额刷新。
- 测试：`npm test -- src/features/wallet`。
- 可追溯关系：转账成功、Wallet 安全阻断。

### Task 11：Realtime invalidation、AppState focus policy、protected cache cleanup

- 业务场景：已登录页面在活跃时自动刷新资料、KYC、推荐、佣金，登出时清理缓存。
- 范围内：realtime adapter、focus/AppState gate、query invalidation map、logout cache cleanup。
- 范围外：不处理 webhook；不全局常驻所有订阅。
- 预计影响文件：
  - `src/shared/realtime/realtimeInvalidation.ts`
  - `src/app/providers/QueryProvider.tsx`
  - `src/features/auth/workflow/authWorkflow.ts`
  - 对应 tests。
- 结构验收：订阅策略集中；feature 只声明 queryKeys / table / filter；AppState background 释放。
- 可测试性验收：fake realtime client 覆盖 subscribe/unsubscribe、focus changes、logout cleanup。
- 验收标准：活跃页面更新可刷新；后台无重复订阅；登出清 protected caches。
- 测试：`npm test -- src/shared/realtime src/app/providers src/features/auth`。
- 可追溯关系：Realtime / 刷新、Session 过期。

### Task 12：Final mobile QA、risk reviews、ship gate

- 业务场景：全量移动端迁移完成后，按风险标签进行安全、数据、性能、KYC、payment、contract 和最佳实践检查。
- 范围内：运行 Final Verification，补 run artifact，iOS / Android 手动 QA，记录残余风险和 stop-for-human 边界。
- 范围外：不自动上线生产真实交易；不自动 merge/deploy。
- 预计影响文件：
  - `docs/ai-delivery/runs/YYYY-MM-DD-rn-full-app-port-verification.md`
  - 可能更新 `docs/plans/2026-07-02-rn-full-app-port-implementation.md`
- 结构验收：验证证据可复现；未解决 Critical / Important 不进入完成。
- 可测试性验收：所有机器验证命令有结果；手动 QA 明确设备和构建方式。
- 验收标准：typecheck/test/audit/forbidden scans 通过；iOS/Android QA 无阻塞；风险 review 记录完成。
- 测试：见 Final Verification Required。
- 可追溯关系：iOS / Android QA 和全量完成定义。

## 业务追踪矩阵

| 业务场景 | 实现位置 | 测试 / 验证 | 状态 |
| -------- | -------- | ----------- | ---- |
| 公开 Launchpad | Task 1：public shell / route gate；Task 3：assets repository、chain aggregation、LaunchpadScreen | `npm test -- src/features/assets src/app/navigation`；全量 `npm test`；iOS/Android 发布前 QA | Implemented; device QA pending |
| 公开资产详情 | Task 1、4：AssetDetailScreen、chain read、eligibility | `npm test -- src/features/assets src/features/purchase src/lib/chain`；QA | Planned |
| Market 浏览 | Task 3：MarketScreen、filter/sort/search | `npm test -- src/features/assets`；全量 `npm test`；iOS/Android 发布前 QA | Implemented; device QA pending |
| 首次登录注册 | Task 2：authWorkflow、registrationWorkflow | `npm test -- src/features/auth src/features/registration` | Planned |
| 邀请注册 | Task 2、6：deep link parser、registration payload、invite links | registration/referral tests；deep link QA | Planned |
| 孤儿账号恢复 | Task 2：orphaned recovery workflow | registration workflow tests | Planned |
| 账号被暂停 / 关闭 | Task 2：account blocked mapping and UI | auth workflow tests | Planned |
| Dashboard | Task 1：protected shell / route gate 已完成；Task 5：DashboardScreen、repositories、domain mappers | Task 1：`npm test -- src/app src/features/auth`；Task 5 待 `npm test -- src/features/dashboard`；QA | Foundation done; feature Planned |
| KYC 未开始 | Task 7：KYC status and launcher | `npm test -- src/features/kyc`；QA | Planned |
| KYC 需补件 | Task 7：KYC status mapping and relaunch | KYC tests；QA | Planned |
| Referral | Task 6：ReferralScreen、share adapter、repositories | `npm test -- src/features/referral src/shared/platform`；QA | Planned |
| Wallet 查看 | Task 8：WalletScreen、balance repository、QR/share | `npm test -- src/features/wallet`；QA | Planned |
| Wallet 安全阻断 | Task 8、10：walletSecurity, transfer guard | wallet tests | Planned |
| 转账成功 | Task 10：transferWorkflow、transferAdapter | wallet fake provider tests；testnet QA | Planned |
| 购买成功 | Task 4、7、9：eligibility、KYC、purchase workflow | purchase tests；testnet/dry-run QA | Planned |
| 购买失败 | Task 4、9：purchase error states | purchase workflow tests | Planned |
| Session 过期 | Task 1：auth gate shell 已完成；Task 2、11：session restore, cache cleanup | Task 1：`npm test -- src/app src/features/auth`；auth tests；QA | Foundation done; remaining Planned |
| Realtime / 刷新 | Task 11：realtime invalidation | realtime adapter tests | Planned |
| iOS / Android QA | Task 1：foundation shell 可运行基础；Task 12：verification run artifact | Task 1：typecheck/tests/audit；manual QA run artifact 待 Task 12 | Foundation code done; manual QA Planned |

## Final Verification Required

| 验证项 | 命令或动作 | 完成判定 |
| ------ | ---------- | -------- |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit / integration tests | `npm test -- src` | exit 0 |
| AI Delivery audit | `npm run ai:audit -- rn-full-app-port` | exit 0，无当前阶段 blocker |
| UI Edge Function scan | `node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "register-user" -e "generate-signature" -e "get-my-referrals" src/ --glob "*.tsx"` | UI 无直连 Edge Function |
| Secret / token log scan | `node scripts/verify-no-match.mjs -e "console\\.(log\|warn\|error).*token" -e "console\\.(log\|warn\|error).*session" -e "console\\.(log\|warn\|error).*signature" -e "logger\\..*(token\|session\|signature)" src/ --glob "*.ts" --glob "*.tsx"` | 无敏感日志 |
| Web-only API scan | `rg "react-router-dom\|react-helmet-async\|@radix-ui\|className=\|window\\.\|document\\.\|sessionStorage\|localStorage\|navigator\\." src/ --glob "*.ts" --glob "*.tsx"` | 无未隔离 Web-only API |
| UI direct write scan | `rg "\\.from\\(.+\\)\\.(insert\|upsert\|update\|delete)" src/ --glob "*.tsx"` | UI 无直接写表 |
| Index key scan | `rg "key=\\{.*index\\}" src/ --glob "*.tsx"` | 无 index key |
| Manual QA | iOS development build、Android development build；覆盖登录、注册、公开浏览、Dashboard、KYC 入口、Wallet、purchase dry-run / testnet、transfer testnet | 结果写入回复或 `docs/ai-delivery/runs/YYYY-MM-DD-rn-full-app-port-verification.md` |

## 完成定义

| 条件 | 判定方式 |
| ---- | -------- |
| 每个验收场景都有对应实现和验证方式 | 业务追踪矩阵全部从 `Planned` 更新为实现位置和验证结果 |
| 业务边界、权限边界和代码结构边界与方案一致 | Consistency Check 和 code review 均无未解决冲突 |
| loading、空态、错误态、权限态按需覆盖 | UI / workflow tests 和手动 QA 覆盖 |
| 测试通过，Review 无未解决 Critical / Important 问题 | Final Verification Required 全部通过 |
| 高风险延后项无模糊状态 | 生产真实上链、KYC 原生 SDK、推送通知、多链扩展均标记为完成或延后 |
