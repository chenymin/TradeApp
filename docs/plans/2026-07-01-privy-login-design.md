# 方案设计：Privy Login

日期：2026-07-01
Feature slug：`privy-login`
状态：草稿

## 背景

当前项目需要在 React Native 客户端接入 Privy 登录，并复用已经实现的 Supabase 登录接口，把 Privy 身份转换为应用内 Supabase 会话。

## 推荐方案

采用“薄 UI + 登录 workflow + provider adapter + secure session storage”的客户端方案。

核心路径：

```text
React Native Login UI
  -> Privy React Native SDK
  -> get Privy access token
  -> Auth workflow
  -> Supabase login API adapter
  -> Supabase session writer
  -> Auth state store
  -> Navigation gate
```

客户端只负责发起登录、换取 session、保存 session、驱动导航和展示错误。Privy token 校验、用户 upsert、角色绑定、账号停用判断、Supabase JWT 签发和 RLS 授权全部保持在已实现的 Supabase 接口和数据库层。

本方案不新增数据库 schema，不新增 Edge Function，不修改 RLS 策略。后续实现计划只需要把客户端模块落到真实 React Native 工程结构中。

## Open Questions Resolution

| 需求中的开放问题 | 处理结论 | 是否阻塞开发 |
| ---------------- | -------- | ------------ |
| 非阻塞：Supabase 登录接口路径、请求方法和响应字段需在方案设计中与已实现接口对齐；本文按 `POST /functions/v1/wallet-login`、`Authorization: Bearer <privyToken>`、返回应用用户和 Supabase token / session 的模式描述。 | Non-blocking。方案保留 `authExchangeClient` adapter，接口路径和响应字段集中在一个模块配置，开发前用已实现接口契约校准。 | No |
| 非阻塞：Supabase session 是否包含 refresh token 取决于已实现接口；如果仅返回短期 JWT，客户端在过期后走重新登录。 | Non-blocking。workflow 支持两种响应：完整 session 或 access token-only。没有 refresh token 时，session 过期统一流转到 `logged_out` 并重新登录。 | No |
| 非阻塞：Privy 支持的钱包、邮箱、Apple / Google 等登录方式以当前 Privy App 配置为准；客户端需求不强制新增 provider。 | Resolved。客户端只打开 Privy 托管登录体验，不在本项目内维护 provider registry。 | No |
| 非阻塞：纯 email 登录且无钱包地址的用户映射规则由 Supabase 接口负责；客户端只展示接口返回结果。 | Resolved。客户端不读取 wallet address 作为身份主键，不把 email / wallet 传给 Supabase 登录接口。 | No |
| 非阻塞：账号停用提示文案和客服入口需要产品确认，方案阶段可先使用通用提示。 | Non-blocking。UI 先使用“账号暂不可用，请联系客服”通用文案，客服入口作为实现计划中的可配置 copy。 | No |
| 延后：多账号切换、多设备管理、服务端 session revoke、角色选择和资料补全不在本次需求范围。 | Deferred。显式列入范围外，不进入本阶段实现计划。 | No |

## Decision Notes

| 决策 | 原因 | 影响 |
| ---- | ---- | ---- |
| 客户端使用 workflow 封装登录流程，而不是在登录按钮里串联 SDK 和 fetch。 | 登录有多条失败路径，放在 workflow 中更容易测试和复用。 | UI 组件保持薄，测试可以绕过真实 Privy 和网络。 |
| Supabase 登录接口集中在 `authExchangeClient` adapter。 | 已实现接口契约可能和参考文档不同，集中适配能降低后续改动范围。 | 实现计划需要先确认接口响应字段，再写 adapter 测试。 |
| session 写入通过 `sessionStorage` 边界统一处理。 | React Native 安全存储、Supabase client session 和内存状态必须一起清理。 | 登入、恢复、登出都走同一套 session 边界，减少半登录状态。 |
| 不在客户端新增权限判断。 | 钱包地址、email、userId 和本地状态都可被篡改或过期。 | 页面可做展示分支，但数据读写必须以后端 session 和 RLS 结果为准。 |
| 不引入自定义 provider registry。 | Privy App 配置已经管理登录方式，本次没有多策略业务差异。 | 后续如要按地区、角色或业务线切换 provider，再引入 strategy。 |
| 实现前复核 Supabase / Privy SDK 当前文档。 | Supabase 和 Privy SDK 迭代快，React Native 初始化细节容易变。 | 实现计划必须包含官方文档复核和版本固定步骤。 |

## 分层边界

- UI：登录页、加载态、错误提示、账号停用提示和登出按钮。UI 只接收 auth state 和 command，不直接拼接接口请求。
- Workflow / service：`authWorkflow` 负责 `restoreSession`、`loginWithPrivy`、`exchangeSession`、`logout` 的状态流转和错误映射。
- Data / external provider：`privyAuthClient` 封装 Privy SDK，`authExchangeClient` 封装 Supabase 登录接口，`sessionStorage` 封装 Supabase client session 和安全存储。

## 代码结构边界

建议实现路径，最终以真实 React Native 工程目录为准：

```text
src/
  app/
    providers/
      AuthProvider.tsx
      PrivyProviderBoundary.tsx
  features/
    auth/
      components/
        LoginScreen.tsx
        AccountDisabledScreen.tsx
      hooks/
        useAuthActions.ts
        useAuthState.ts
      workflow/
        authWorkflow.ts
        authStateMachine.ts
        authErrors.ts
      services/
        privyAuthClient.ts
        authExchangeClient.ts
        sessionStorage.ts
      __tests__/
        authWorkflow.test.ts
        authStateMachine.test.ts
        authExchangeClient.test.ts
  lib/
    supabase/
      client.ts
```

- 入口层：`LoginScreen`、`AuthProvider` 和导航 gate 只绑定事件、展示状态、调用 workflow。
- 领域逻辑层：`authWorkflow` 和 `authStateMachine` 负责状态枚举、合法流转、错误分类和重试策略。
- 数据或外部系统边界：Privy SDK、Supabase login API、Supabase client session、安全存储都藏在 service adapter 后面。
- 新增行为注册方式：本阶段不需要 registry / handler map。Privy provider 类型由 Privy 控制台配置决定。
- 避免的结构漂移：禁止在 UI 组件里直接 `fetch` 登录接口；禁止在多个组件里重复 session 清理；禁止复制错误码映射。

## 模块内聚与可测试性

- 主要模块及职责：
  - `authStateMachine.ts`：定义 `AuthStatus`、合法流转和非法流转保护。
  - `authWorkflow.ts`：编排登录、session exchange、恢复、登出。
  - `authErrors.ts`：把 Privy、网络、Supabase 401 / 403 / 5xx、session 写入失败映射为 UI 可展示错误。
  - `privyAuthClient.ts`：只封装 `login` / `logout` / `getAccessToken` 等 Privy SDK 调用。
  - `authExchangeClient.ts`：只调用 Supabase 登录接口，不保存 token。
  - `sessionStorage.ts`：只负责 Supabase session 写入、读取和清理。
- 核心逻辑测试方式：workflow 测试使用 fake `privyAuthClient`、fake `authExchangeClient`、fake `sessionStorage`，不需要真实 Privy、Supabase 或网络。
- 副作用边界：请求发生在 `authExchangeClient`；session 写入和清理发生在 `sessionStorage`；导航只在 `AuthProvider` 或 navigation gate 根据状态变化触发；全局状态只由 `AuthProvider` 发布。
- 隐式依赖：依赖网络、SDK、环境变量、安全存储和系统时间。实现计划中要用依赖注入隔离这些依赖。

## 数据流

```text
首次登录

User tap login
  |
  v
LoginScreen calls authWorkflow.login()
  |
  v
privyAuthClient.login()
  |
  v
privyAuthClient.getAccessToken()
  |
  v
authExchangeClient.exchange(privyToken)
  |
  v
Supabase login API verifies token and returns app user + session
  |
  v
sessionStorage.setSession(response.session)
  |
  v
AuthProvider publishes authenticated state
  |
  v
Navigation switches to app stack
```

```text
App 启动恢复

App bootstrap
  |
  v
authWorkflow.restoreSession()
  |
  v
sessionStorage.getSession()
  |
  +-- valid session -> authenticated
  |
  +-- missing / expired / invalid -> logged_out
```

```text
登出

User tap logout
  |
  v
authWorkflow.logout()
  |
  +--> sessionStorage.clearSession()
  |
  +--> privyAuthClient.logout()
  |
  v
logged_out
```

## 状态与实时行为

- 可信来源：最终登录态以 Supabase 登录接口成功响应和本地 session 写入结果为准；账号停用以 Supabase 登录接口 403 为准。
- 状态模型：

```text
logged_out
  -> restoring_session
  -> privy_authenticating

restoring_session
  -> authenticated
  -> logged_out
  -> auth_failed

privy_authenticating
  -> privy_authenticated
  -> logged_out
  -> auth_failed

privy_authenticated
  -> exchanging_session
  -> auth_failed
  -> logged_out

exchanging_session
  -> authenticated
  -> account_disabled
  -> auth_failed
  -> logged_out

authenticated
  -> logging_out
  -> restoring_session
  -> auth_failed

account_disabled
  -> logged_out

auth_failed
  -> privy_authenticating
  -> logged_out

logging_out
  -> logged_out
  -> auth_failed
```

- 非法流转：
  - `logged_out` 不允许直接进入 `authenticated`。
  - `privy_authenticated` 不允许绕过 `exchanging_session` 进入 `authenticated`。
  - `account_disabled` 不允许进入 `authenticated`。
  - `auth_failed` 不允许携带旧 session 进入 app stack。
- 缓存 / 刷新 / webhook / realtime：本阶段不使用 webhook 或 realtime。session 恢复只读本地安全存储和 Supabase client 状态；如后端无 refresh token，过期后重新登录。

## 代码规则适用性

| 规则 | 适用 / 不适用 | 约束或决策 |
| ---- | ------------- | ---------- |
| 状态机 / 可信边界 / 副作用 | 适用 | 登录涉及 8 个状态，必须用显式状态枚举和集中 workflow，UI 不做可信判断。 |
| 数据访问 / 性能 / 测试追踪 | 适用 | 客户端不直接写业务表；测试追踪矩阵在实现计划中覆盖所有验收场景。 |
| 配置密钥 / 兼容回滚 | 适用 | 客户端只允许公开配置；接口响应兼容逻辑集中在 adapter；回滚可关闭登录入口或退回旧登录。 |
| webhook / realtime / payment / contract | 不适用 | 本次不处理外部回调、实时订阅、支付或合约交互。 |

## 失败模式

| 失败情况 | 用户影响 | 处理方式 |
| -------- | -------- | -------- |
| 用户取消 Privy 登录 | 停留在登录页 | 回到 `logged_out`，不弹出错误轰炸，不调用 Supabase 登录接口。 |
| Privy SDK 登录成功但 access token 获取失败 | 无法进入 App | 进入 `auth_failed`，提示重新登录，不记录 token。 |
| Supabase 登录接口 401 | 登录无效 | 清理临时状态，提示登录已失效或请重新登录。 |
| Supabase 登录接口 403 | 账号被阻断 | 进入 `account_disabled`，展示账号不可用 / 联系客服，不自动重试。 |
| Supabase 登录接口 5xx 或网络超时 | 登录中断 | 最多自动重试一次，失败后显示手动重试。 |
| Supabase session 写入失败 | 可能出现半登录 | 清理 Privy 临时流程和 Supabase session，回到 `auth_failed`。 |
| App 启动 session 已过期 | 用户被要求重新登录 | 恢复流程进入 `logged_out`，不展示受保护页面。 |
| 登出清理部分失败 | 可能残留本地状态 | 继续尝试清理所有本地状态，最终不允许保持 `authenticated`。 |
| 登录过程中快速重复点击 | 多次弹窗或重复请求 | UI 在 `privy_authenticating` / `exchanging_session` 禁用登录按钮；workflow 防重复执行。 |
| 后端响应字段变更 | 登录失败 | adapter 做 schema 校验，返回可恢复错误，避免 undefined crash。 |

## 权限与安全

- 谁可以读 / 写：
  - 未登录用户只能读登录页、公开配置和必要静态资源。
  - 已登录用户通过 Supabase session 访问 RLS 允许的数据。
  - 用户创建、角色绑定、账号状态写入由 Supabase 登录接口负责，客户端不直接写这些数据。
- 可信判断所在层：
  - Privy token 真伪：Supabase 登录接口。
  - 用户身份映射：Supabase 登录接口 / 数据库。
  - 角色和权限：Supabase 登录接口返回 + 数据库 RLS。
  - 账号停用：Supabase 登录接口。
- Secret / token 处理：
  - 客户端可配置：Privy App ID、Supabase URL、Supabase publishable / anon key、登录接口路径。
  - 客户端禁止配置：Privy App Secret、Supabase service role key、JWT secret。
  - 不在日志、错误上报、analytics payload 中记录 Privy token、Supabase access token、refresh token 或 service key。
  - React Native session 存储优先使用平台安全存储；如使用 Supabase 官方 React Native 指南中的 AsyncStorage 模式，必须在实现计划中记录风险和替代方案。

## 数据访问与 Supabase 影响

- 表 / 字段：本阶段不新增表、不修改字段、不写 migration。
- RLS：本阶段不新增 RLS 策略。已登录后的数据访问仍由现有 RLS 控制。
- Data API 暴露：Supabase 2026-04-28 changelog 提到新表不再自动暴露到 Data / GraphQL API；本阶段不新增表，所以无直接影响。后续如果实现计划引入表，必须补 GRANT / RLS / 暴露策略检查。
- 写入路径：客户端唯一登录写入路径是 Supabase 登录接口内部写入，客户端不直接 `.insert` / `.update` / `.upsert` 用户、角色或账号状态。
- 事务和一致性：用户 upsert、角色绑定和 JWT 签发的一致性由已实现 Supabase 接口保证。客户端只处理成功或失败结果。
- 幂等性：客户端登录重复点击通过 workflow 防重复。后端用户 upsert 幂等性由 Supabase 接口负责，本方案不新增幂等键。

## 性能影响

- Provider 范围：`AuthProvider` 只发布低频 auth state，不放入高频实时数据，避免全树频繁 re-render。
- 状态粒度：登录状态、用户摘要、错误消息分开建模，UI 只订阅需要的片段。
- memoization：仅对传给 memoized child 的 action callbacks 使用 `useCallback`，不默认过度 memoization。
- 网络请求：登录 exchange 只在 Privy token 获取成功后触发；重复点击时复用当前 in-flight 流程或直接拒绝。
- 依赖体积：Privy React Native SDK 需要 Expo / React Native 相关 peer dependencies 和 polyfills，实施前评估 Metro 配置和 bundle 影响。
- 启动性能：App 启动只做一次 session restore，不在启动阶段调用 Privy 登录弹窗。

## 配置和密钥

| 配置 | 作用域 | 是否可在客户端出现 | 说明 |
| ---- | ------ | ------------------ | ---- |
| `EXPO_PUBLIC_PRIVY_APP_ID` 或等效配置 | React Native client | 是 | Privy App ID，按实际工程 env 规范命名。 |
| `EXPO_PUBLIC_SUPABASE_URL` 或等效配置 | React Native client | 是 | Supabase 项目 URL。 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` 或 publishable key | React Native client | 是 | 客户端 Supabase key，不得使用 service role。 |
| `EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH` 或等效配置 | React Native client | 是 | 默认 `/functions/v1/wallet-login`，便于环境切换。 |
| `PRIVY_APP_SECRET` | Supabase Edge Function / server | 否 | 仅服务端验证 Privy token 使用。 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function / server | 否 | 仅服务端受控写入使用。 |
| `SUPABASE_JWT_SECRET` | Supabase / server | 否 | 仅服务端签发 / 验证 JWT 使用。 |

## 测试策略影响

```text
CODE PATHS                                      USER FLOWS
[+] authStateMachine                            [+] 首次钱包登录 [-> E2E]
  ├── happy transitions                         [+] App 启动恢复 session
  ├── illegal direct authenticated transition   [+] 登出
  └── account_disabled cannot authenticate      [+] 用户取消登录

[+] authWorkflow
  ├── login success
  ├── Privy cancel
  ├── token missing
  ├── exchange 401
  ├── exchange 403
  ├── exchange 5xx / timeout
  ├── session write failure
  └── duplicate tap / in-flight guard

[+] authExchangeClient
  ├── Authorization header uses Privy token
  ├── response schema validation
  └── no wallet/email/userId trusted from client

[+] sessionStorage
  ├── setSession success
  ├── restore valid / missing / expired
  └── clearSession clears Supabase + secure storage
```

实现计划必须包含：

- 单元测试：`authStateMachine` 所有合法 / 非法流转。
- 单元测试：`authWorkflow` 覆盖需求文档所有验收场景。
- adapter 测试：`authExchangeClient` 不发送 wallet address、email、userId 等不可信身份字段。
- storage 测试：session 写入失败和登出清理失败不会留下 `authenticated` 状态。
- UI 测试：登录按钮 loading / disabled、账号停用提示、错误重试、登出。
- E2E 或手动 QA：首次钱包登录、App 重启恢复、登出、403 阻断、网络失败重试。

## 备选方案

| 方案 | 决策 | 原因 |
| ---- | ---- | ---- |
| UI 组件内直接调用 Privy SDK 和 Supabase fetch | Rejected | 登录分支多，容易形成胖组件，也难以测试失败路径。 |
| 直接使用 Supabase Auth provider，不通过 Privy | Rejected | 需求明确使用 Privy，且 Supabase 接口已实现 Privy token exchange。 |
| 客户端传 walletAddress / email 给 Supabase 接口 | Rejected | 客户端身份字段不可信，会扩大伪造风险。 |
| 引入完整 auth finite-state-machine 库 | Rejected | 当前状态模型可用轻量 reducer / switch 实现，引入库增加依赖和学习成本。 |
| 后端新增 refresh / revoke 能力 | Deferred | 超出客户端需求范围，后续可作为独立 auth hardening 需求。 |

## NOT in scope

- Supabase Edge Function 实现或修改：接口已实现，本阶段只定义客户端契约。
- 数据库 migration / RLS 策略：本阶段不新增表和策略。
- KYC、支付、合约、充值提现：和 Privy 登录不是同一交付单元。
- 多账号切换、多设备管理、强制下线：需要服务端 session 能力，单独设计。
- 角色选择和资料补全：登录后的 onboarding，不阻塞本次 session 建立。

## What already exists

- 参考方案：`/Users/rwa_start/ProjectSource/ArtStarFront/docs/plans/2026-03-06-wallet-login-flow.md` 已定义 Web 端 Privy -> Supabase Edge Function -> Supabase JWT 的身份链路。本方案复用可信边界，不复用 Web UI 代码。
- Supabase 登录接口：用户说明“Supabase 接口已实现”。本方案把它视为可信身份边界，不重新实现。
- 当前仓库：目前只有 ai-delivery 文档、模板和 package 配置，没有 React Native 源码。实现计划需要先定位或建立真实 app 目录。

## 评审决策记录

| 日期 | 决策 | 原因 | 影响 |
| ---- | ---- | ---- | ---- |
| 2026-07-01 | 采用客户端 workflow + adapter 方案 | 登录流程有多 SDK / 网络 / 存储副作用，集中编排更可测 | 后续实现围绕 `authWorkflow` 拆任务 |
| 2026-07-01 | 不新增后端和数据库变更 | Supabase 接口已实现，本次交付聚焦 React Native 客户端 | database / rls 风险以边界审查为主 |
| 2026-07-01 | session 过期优先重新登录 | refresh token 能力取决于已实现接口，需求未要求新建 refresh | 用户可能在过期后重新走 Privy 登录 |

## Consistency Check

- [x] 需求开放问题已在 Open Questions Resolution 中闭环。
- [x] 方案修正需求假设时，已在 Decision Notes 中记录原因和影响。
- [x] 权限、可信边界、数据读写路径与风险标签一致。
- [x] 方案没有引入范围外功能。
- [x] `payment`、`webhook`、`kyc`、`contract` 明确不适用。

## 方案评审清单

- [x] 业务规则放在正确层，前端不是敏感决策可信来源。
- [x] 数据流有唯一可信来源，权限检查明确。
- [x] 失败模式、错误反馈、重试 / 降级或 stop-for-human 已说明。
- [x] 入口层、领域逻辑和副作用边界明确。
- [x] 核心逻辑可独立测试，每个验收场景有测试或手动 QA 方式。
- [x] auth 风险已说明 token 存储、session 失效、provider 来源和服务端验证。
- [x] permission / rls 风险已说明客户端不做可信授权，跨用户隔离由 RLS 保证。
- [x] database 风险已说明无客户端直接写表、无 migration、本阶段不新增 schema。
- [x] frontend-performance 风险已说明 provider 范围、低频状态和重复点击防护。
