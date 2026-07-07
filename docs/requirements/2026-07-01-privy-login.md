# 需求说明：Privy Login

日期：2026-07-01
Feature slug：`privy-login`
状态：草稿

## 业务目标

在 React Native 客户端中接入 Privy 登录，让用户可以通过钱包或 Privy 支持的登录方式完成身份验证，并通过已实现的 Supabase 登录接口换取应用会话，进入已登录的 App 使用状态。

本需求只定义客户端登录体验、客户端状态流转和与 Supabase 登录接口的契约；Privy token 校验、用户同步、角色分配、Supabase JWT 签发、RLS 生效等可信逻辑由已实现的 Supabase 接口负责。

## 用户角色

- 未登录用户：首次打开 App 或 session 已失效，需要完成登录。
- 已登录用户：本地存在有效 Supabase 会话，可以进入受保护页面。
- 被停用用户：Privy 身份有效，但 Supabase 接口判定账号不可用，需要看到明确阻断提示。
- 客服 / 运营：不在本次客户端实现范围内，但账号停用提示需要指向人工支持路径。

## 风险标签

- [x] auth / 登录
- [x] permission / 权限
- [ ] payment / 支付
- [ ] kyc / 身份认证
- [ ] webhook / 外部回调
- [ ] realtime / 实时同步
- [x] database / 数据写入
- [x] rls / Supabase 权限
- [x] frontend-performance / 前端性能
- [ ] contract / 合约交互

## 范围内

- 在 React Native 客户端初始化 Privy Provider 和 Supabase client 所需的客户端配置。
- 提供登录入口，调用 Privy React Native SDK 完成登录、连接钱包或 Privy 支持的身份验证流程。
- 登录成功后从 Privy SDK 获取 access token，并调用已实现的 Supabase 登录接口完成 session exchange。
- 将 Supabase 接口返回的会话写入客户端安全存储，并让后续 Supabase 请求携带已登录身份。
- 根据登录、交换、失败、账号停用、session 过期等状态更新 UI 和导航。
- 提供登出能力，清理 Privy 客户端状态、Supabase session 和本地安全存储。
- 对网络失败、Privy 取消登录、token 获取失败、Supabase 接口 401 / 403 / 5xx 做用户可理解的错误反馈。
- 为登录 workflow、状态映射、接口错误处理和关键 UI 流程提供测试或手动 QA 路径。

## 范围外

- 不实现或修改 Supabase Edge Function / 后端接口；本次假设 Supabase 登录接口已完成。
- 不在客户端验证 Privy token 真伪，不在客户端同步用户资料、分配角色或签发 Supabase JWT。
- 不实现 KYC、支付、合约交互、资产交易、充值提现或链上签名业务。
- 不实现运营后台、账号停用管理、角色管理或用户资料编辑。
- 不实现多设备 session 管理、服务端 refresh token 轮换或强制下线能力；如后端接口不支持 refresh，本次按重新登录处理。
- 不把钱包地址、email、userId 或本地缓存作为权限判断的可信来源。

## 业务规则

- 用户必须先完成 Privy 登录，客户端才可以请求 Supabase 登录接口。
- 客户端请求 Supabase 登录接口时只能传递 Privy access token；钱包地址、email、Privy user id 即使可从 SDK 读取，也只能用于展示或埋点，不得作为可信身份参数。
- Supabase 登录接口是应用身份的唯一可信来源：是否创建用户、绑定哪个用户、账号是否停用、拥有何种角色、返回何种 Supabase session，均以后端响应为准。
- 登录成功的定义是：Privy 登录成功、Supabase 登录接口返回成功、客户端 Supabase session 写入成功，三者同时成立。
- 如果 Privy 登录成功但 Supabase session exchange 失败，客户端必须保持未登录或失败状态，不得进入受保护页面。
- 如果 Supabase 接口返回 401，客户端应清理本次临时 token 状态并提示重新登录。
- 如果 Supabase 接口返回 403，客户端应展示账号不可用 / 联系客服提示，并不得重试进入 App。
- 如果 Supabase 接口返回 5xx 或网络超时，客户端可允许用户手动重试；自动重试最多一次，避免重复弹窗或循环请求。
- 客户端应使用安全存储保存 Supabase session，例如 iOS Keychain / Android Keystore / Expo SecureStore；不得把 token 明文写入日志、普通 AsyncStorage 或可见调试输出。
- 登出必须同时清理 Supabase session、本地安全存储、Privy 登录状态和内存中的用户状态。
- App 启动时可以尝试恢复本地 Supabase session；恢复失败、session 过期或接口返回未授权时，应回到未登录状态。
- 登录状态变化只能驱动导航和展示，不得绕过后端权限或 RLS。

## 状态模型

| 状态 | 可信来源 | 含义 | 允许流转 |
| ---- | -------- | ---- | -------- |
| `logged_out` | 客户端 session 恢复结果、用户登出动作 | 无有效 Supabase 会话，展示登录入口 | `privy_authenticating`、`restoring_session` |
| `restoring_session` | 客户端安全存储 + Supabase session 恢复结果 | App 启动时尝试恢复本地会话 | `authenticated`、`logged_out`、`auth_failed` |
| `privy_authenticating` | Privy SDK 回调 | 用户正在 Privy 登录、连接钱包或取消登录 | `privy_authenticated`、`logged_out`、`auth_failed` |
| `privy_authenticated` | Privy SDK access token 获取结果 | Privy 身份已完成，但尚未换取 Supabase 会话 | `exchanging_session`、`auth_failed`、`logged_out` |
| `exchanging_session` | Supabase 登录接口响应 | 客户端正在用 Privy token 换取应用会话 | `authenticated`、`account_disabled`、`auth_failed`、`logged_out` |
| `authenticated` | Supabase 登录接口成功响应 + 客户端 session 写入结果 | 已建立应用会话，可以进入受保护页面 | `logging_out`、`restoring_session`、`auth_failed` |
| `account_disabled` | Supabase 登录接口 403 响应 | 账号被服务端阻断，不允许进入 App | `logged_out` |
| `auth_failed` | Privy SDK 错误、Supabase 接口错误、session 写入失败 | 登录失败或会话不可用，展示错误与重试入口 | `privy_authenticating`、`logged_out` |
| `logging_out` | 用户登出动作 + 清理结果 | 正在清理 Privy、Supabase 和本地 session | `logged_out`、`auth_failed` |

## 权限和可信边界

- 谁可以读：未登录用户只能读取公开登录页和公开配置；已登录用户可读取后端 RLS 允许的本人数据和应用数据。
- 谁可以写：客户端只能通过已登录 Supabase session 发起后端允许的写请求；登录流程中的用户创建、角色绑定、账号状态写入由 Supabase 登录接口完成。
- 可信判断所在层：Privy token 真伪、用户身份映射、账号状态、角色、JWT 签发和 RLS 授权都在 Supabase 接口 / 数据库层判断。
- 前端职责：默认只负责展示和交互，除非方案明确允许，否则不做可信业务判断。
- 客户端不可信内容：钱包地址、email、Privy user id、URL 参数、本地缓存、AsyncStorage / SecureStore 中可读出的 userId、前端全局状态。
- Secret 边界：React Native 客户端只能持有 Privy App ID、Supabase URL、Supabase publishable / anon key 等可公开配置；Privy App Secret、Supabase service role key、JWT secret 不得进入客户端包、日志或文档。

## 数据来源

- Privy React Native SDK：登录弹窗 / 原生流程、登录成功状态、access token、可展示的钱包或 email 信息。
- Supabase 登录接口：本次需求假设已实现，客户端通过该接口换取应用用户信息和 Supabase session；接口是应用身份和账号状态的可信来源。
- Supabase client：保存和恢复 session，后续访问受 RLS 保护的数据。
- 客户端安全存储：保存 Supabase session，用于 App 重启后的会话恢复。
- React Navigation / App 状态管理：根据登录状态切换登录栈和已登录应用栈，仅作为 UI 状态来源。

## 验收场景

| 场景 | Given | When | Then |
| ---- | ----- | ---- | ---- |
| 正常路径：首次钱包登录 | 用户未登录且网络正常 | 用户点击登录并完成 Privy 钱包登录，客户端调用 Supabase 登录接口成功 | 客户端写入 Supabase session，进入已登录首页，后续 Supabase 请求带 authenticated 身份 |
| 正常路径：App 启动恢复 session | 本地安全存储存在未过期 Supabase session | 用户重新打开 App | 客户端恢复 session 并进入已登录栈，不重复弹出 Privy 登录 |
| 正常路径：登出 | 用户处于已登录状态 | 用户点击登出并确认 | Privy 状态、Supabase session、本地安全存储和内存用户状态被清理，导航回登录页 |
| 用户取消登录 | 用户未登录 | 用户打开 Privy 登录流程后取消 | 客户端回到 `logged_out`，不调用 Supabase 登录接口，不展示错误弹窗轰炸 |
| Privy token 获取失败 | Privy SDK 登录回调成功但 access token 获取失败 | 客户端准备调用 Supabase 登录接口 | 客户端进入 `auth_failed`，不进入 App，不记录 token，允许用户重新登录 |
| Supabase 401 | Privy access token 已获取 | Supabase 登录接口返回 401 | 客户端清理本次登录状态，提示登录已失效或请重新登录，停留在登录页 |
| Supabase 403 | Privy access token 已获取 | Supabase 登录接口返回 403 | 客户端展示账号不可用 / 联系客服提示，不进入受保护页面，不自动循环重试 |
| Supabase 5xx / 网络失败 | Privy access token 已获取 | Supabase 登录接口超时或返回 5xx | 客户端展示网络或服务异常，最多自动重试一次，并提供手动重试 |
| session 写入失败 | Supabase 登录接口返回成功 | 客户端安全存储或 Supabase setSession 失败 | 客户端清理半完成状态并提示重试，不进入已登录栈 |
| 权限边界 | 客户端可读取钱包地址或 userId | 用户尝试进入需要权限的数据页面 | 页面访问以后端 Supabase session 和 RLS 响应为准，不因本地 userId 存在而放行 |

## 风险和开放问题

- 非阻塞：Supabase 登录接口路径、请求方法和响应字段需在方案设计中与已实现接口对齐；本文按 `POST /functions/v1/wallet-login`、`Authorization: Bearer <privyToken>`、返回应用用户和 Supabase token / session 的模式描述。
- 非阻塞：Supabase session 是否包含 refresh token 取决于已实现接口；如果仅返回短期 JWT，客户端在过期后走重新登录。
- 非阻塞：Privy 支持的钱包、邮箱、Apple / Google 等登录方式以当前 Privy App 配置为准；客户端需求不强制新增 provider。
- 非阻塞：纯 email 登录且无钱包地址的用户映射规则由 Supabase 接口负责；客户端只展示接口返回结果。
- 非阻塞：账号停用提示文案和客服入口需要产品确认，方案阶段可先使用通用提示。
- 延后：多账号切换、多设备管理、服务端 session revoke、角色选择和资料补全不在本次需求范围。

## 进入开发检查清单

- [x] 业务目标、范围内、范围外可以用一句话讲清楚。
- [x] 核心业务规则、状态模型、权限和可信边界没有歧义。
- [x] 数据来源明确，不依赖前端猜测。
- [x] 正常、空 / 失败 / 权限路径都有验收场景。
- [x] 开放问题已标记为阻塞、非阻塞或延后。
