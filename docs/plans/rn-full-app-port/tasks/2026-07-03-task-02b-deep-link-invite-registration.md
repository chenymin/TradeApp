# Task 2b：Deep Link / Invite Registration Handoff

来源：[rn-full-app-port implementation](../../2026-07-02-rn-full-app-port-implementation.md)

- 业务场景：已登录用户在 App 内邀请好友，好友通过邀请 URL 打开 Web fallback、安装或打开 App，并最终进入登录 / 注册流程；注册时沿用 Task 2 的 `register-user` workflow 绑定邀请 payload。
- 参考 Web 实现：
  - `/Users/rwa_start/ProjectSource/ArtStarFront/src/components/dashboard/InviteModal.tsx`
  - `/Users/rwa_start/ProjectSource/ArtStarFront/src/lib/referralUtils.ts`
- Web 端现有链接规则：
  - `investor`: `${origin}/register?ref=${inviteCode}&type=investor`
  - `collector`: `${origin}/register?ref=${inviteCode}&type=collector`
  - `creator`: `${origin}/register?ref=${inviteCode}&type=creator`
  - `institution`: `${origin}/register?ref=${inviteCode}&type=institution`

## 范围

- 范围内：
  - 新增 RN 邀请链接 domain：根据 Web fallback origin、invite code 和目标用户类型生成邀请链接。
  - 新增 App 内“邀请好友”入口的基础 modal / sheet：选择 `investor`、`collector`、`creator`、`institution`，展示链接，支持系统分享和复制。
  - 新增 deep link intake adapter：处理 `Linking.getInitialURL()` 和 `Linking.addEventListener("url", ...)`，把可识别的 `/register?ref=...&type=...` 或 App scheme URL 转成 Task 2 registration payload。
  - 已安装 App：点击 Universal Link / App Link / custom scheme 后进入 App，存储 invitation payload，并将用户引导到登录状态。
  - 未安装 App：Web fallback 页面继续承载下载 / 打开 App 引导；App 端只约定链接参数和 fallback contract。
  - 安装后无法恢复参数时：提供手动输入邀请码的后续兜底入口定义，但首版可只记录为 UI / product fallback，不强制实现完整表单。
- 范围外：
  - 不实现 Web fallback 页面本身。
  - 不实现第三方 deferred deep link SaaS。
  - 不新增后端 referral / attribution API。
  - 不修改 `register-user` Edge Function。
  - 不实现完整 Referral dashboard、leaderboard、佣金记录；这些仍归 Task 6。

## URL 与 Handoff 契约

- Canonical Web invite URL 保持兼容 Web：
  - `https://<web-origin>/register?ref=<inviteCode>&type=<userType>`
- App 可识别 URL 形态：
  - Universal Link / App Link：同 canonical Web invite URL。
  - Custom scheme：`mytradeapp://register?ref=<inviteCode>&type=<userType>`。
- 支持参数：
  - `type`: `investor | collector | creator | institution`。
  - `ref`: 推荐码。
  - `invitation_token`: 邀请 token。
  - `ref` 与 `invitation_token` 二选一，沿用 Task 2 的 `registrationPayload` 校验。
- Handoff 行为：
  - 识别有效邀请 URL 后调用 `handleRegistrationLink` 存储 payload。
  - 如果当前未登录，保持 public shell 可见，并通过 header / auth action 进入登录；登录后 Task 2 workflow 使用 stored payload 注册。
  - 如果当前已登录，清除 payload 或提示“该邀请链接仅适用于新用户”，不得重新绑定推荐关系。
  - payload 不是身份凭据，不参与权限判断。

## App 安装与跳转策略

- 已安装 App：
  - iOS 使用 Universal Links，Android 使用 App Links；开发环境可先用 custom scheme 验证。
  - 打开 App 后只做 payload intake，不直接绕过登录。
- 未安装 App：
  - URL 落到 Web `/register` fallback 页面，由 Web 页面展示下载 App、打开 App 和继续 Web 注册的入口。
  - App 首版不保证安装后自动恢复参数；如果没有第三方 deferred deep link 或原生 install referrer，安装后参数可能丢失。
- 可选后续增强：
  - iOS pasteboard / Android install referrer / Firebase Dynamic Links 替代方案评估。
  - 手动输入邀请码兜底。
  - Web fallback 页面显示二维码 / App Store / TestFlight / APK 下载入口。

## 预计影响文件

- `src/features/referral/domain/inviteLinks.ts`
- `src/features/referral/components/InviteFriendSheet.tsx`
- `src/features/referral/workflow/inviteShareWorkflow.ts`
- `src/features/registration/workflow/registrationLinkHandler.ts`
- `src/app/linking/createLinkingAdapter.ts`
- `src/app/AppRoot.tsx` 或 `src/app/navigation/AppNavigator.tsx`
- `src/shared/platform/shareAdapter.ts`
- `src/shared/platform/clipboardAdapter.ts`
- 对应 `__tests__`

## 结构验收

- URL 构造在 domain 层，不在组件里拼接。
- `Linking`、`Share`、Clipboard 只在 platform adapter。
- invite sheet 只调用 workflow / adapter，不直接写 SecureStore、不直接调用 `register-user`。
- App link payload intake 复用 Task 2 `handleRegistrationLink` 和 `registrationPayload` 校验。
- 未登录 / 已登录逻辑由 auth workflow 和 navigation gate 处理，不在邀请组件中信任 user id。

## 可测试性验收

- `inviteLinks` 覆盖 4 种用户类型、invite code 编码、custom scheme / web fallback origin。
- `registrationLinkHandler` 覆盖 canonical Web URL、custom scheme URL、invalid type、missing ref/token、mutually exclusive 参数。
- `inviteShareWorkflow` 使用 fake share / fake clipboard 测试 success、copy failure、share cancellation。
- Linking adapter 使用 fake Linking 测试 initial URL、runtime URL event、unsubscribe cleanup。

## 验收标准

- 已登录用户可从 My / Referral 入口打开邀请好友 UI。
- 用户可选择邀请对象类型，生成与 Web 兼容的 `/register?ref=...&type=...` 链接。
- 复制 / 分享成功后有明确状态反馈。
- App 冷启动收到邀请 URL 时能存储 payload；随后登录走 Task 2 注册链路。
- App 运行中收到邀请 URL 时能存储 payload；未登录用户进入登录动作后完成注册。
- 已登录用户打开邀请 URL 不重新绑定推荐关系。
- 无效 URL 不进入注册流程，并保留用户当前页面。

## 测试

- 先写 failing tests：
  - `npm test -- src/features/referral src/features/registration src/app/linking`
- 实现后运行：
  - `npm test -- src/features/referral src/features/registration src/app/linking`
  - `npm test -- src/app/navigation src/app/providers`
  - `npx tsc --noEmit`
  - `npm run ai:audit -- rn-full-app-port`
- Forbidden scans：
  - `node scripts/verify-no-match.mjs -e "register-user" -e "functions/v1" src/features/referral --glob "*.tsx"`
  - `node scripts/verify-no-match.mjs -e "window\\." -e "document\\." -e "navigator\\." src/features/referral src/app/linking --glob "*.ts" --glob "*.tsx"`

## 可追溯关系

- 邀请好友注册。
- URL 引导 App 安装 / 打开。
- 首次登录注册。
- Referral 分享链路。

## 实现状态

- Completed for Task 2b slice（2026-07-03）。
- 依赖 Task 2 已完成的 `registrationPayload`、`registrationPayloadStorage`、`registrationLinkHandler`、`register-user` workflow。
- 已实现文件：
  - `src/features/referral/domain/inviteLinks.ts`
  - `src/features/referral/workflow/inviteShareWorkflow.ts`
  - `src/features/referral/components/InviteFriendSheet.tsx`
  - `src/app/linking/createLinkingAdapter.ts`
  - `src/shared/platform/clipboardAdapter.ts`
  - `src/shared/platform/shareAdapter.ts`
  - `src/app/AppRoot.tsx`
  - `src/app/navigation/AppNavigator.tsx`
  - `test/mocks/expo-clipboard.ts`
  - `test/mocks/react-native.tsx`
  - `vitest.config.ts`
- 已实现测试：
  - `src/features/referral/__tests__/inviteLinks.test.ts`
  - `src/features/referral/__tests__/inviteShareWorkflow.test.ts`
  - `src/features/referral/__tests__/InviteFriendSheet.test.tsx`
  - `src/app/linking/__tests__/createLinkingAdapter.test.ts`
  - 更新 `src/app/navigation/__tests__/AppNavigator.test.tsx`
- 已运行验证：
  - `npm test -- src/features/referral src/features/registration src/app/linking`
  - `npm test -- src/app/navigation src/app/providers`
  - `npm test -- src`
  - `npx tsc --noEmit`
- UI 调整：
  - 邀请好友面板已按移动端 bottom sheet 交互调整为中文标题、说明、胶囊类型选择、灰色链接卡片和黑色 Copy link 按钮。
  - 面板已从 Profile 内容流移到 `AppShell` overlay slot，固定贴底并提高 zIndex / elevation，避免在小屏或底部导航上方显示不完整。
  - Profile 菜单和 Sign out 操作已分区展示，避免退出按钮混在 Wallet / KYC / 邀请好友 / Settings 列表里。
- 剩余边界：
  - 当前 App 内邀请入口使用 `DEMO-CODE` 和 `https://app.mytrade.local` 占位；真实 invite code 和 web origin 需要在 Task 6 Referral / Dashboard read model 接入用户数据后替换。
  - Universal Link / Android App Link 的原生域名关联文件和线上 Web fallback 页面尚未实现。
  - 安装后 deferred attribution 仍不保证恢复参数；后续如需要需评估 install referrer / pasteboard / 第三方 deferred deep link。
