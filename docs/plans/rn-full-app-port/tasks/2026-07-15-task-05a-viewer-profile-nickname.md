# Task 5A：Viewer、Profile 与 Nickname 实施计划

## 范围

- 将 `wallet-login` 返回的已验证用户映射为只读 viewer：`id`、`email`、`walletAddress`。
- viewer 随 Supabase session 写入安全存储，并在恢复 session 时一并恢复。
- `AuthProvider` 暴露 `viewer` 和 `isSessionReady`；只有两者都可用时才能读取私有数据。
- 新增 `user_profiles` read-only repository、points/tier formatter、nickname validator 和 `update_my_nickname` RPC adapter。
- 不实现 Dashboard 页面、holdings、transactions、commission、KYC 或 Realtime。

## 实现步骤

1. 先扩展 auth exchange/workflow/provider 测试，覆盖登录、恢复、登出时 viewer 和 session-ready 状态。
2. 扩展 auth session model，严格映射 `wallet-login.user`，并随安全 session 保存；旧 session 缺少 viewer 时不得启动私有查询。
3. 新增 profile repository 测试，覆盖字段选择、`id = viewer.id`、单行读取、数值归零和查询错误。
4. 新增纯函数测试，覆盖 tier fallback、积分格式和 nickname 的 trim、空值、相同值、254 个 Unicode code point 边界。
5. 新增 nickname RPC adapter 测试，确认只调用 `update_my_nickname({ p_nickname })`，并规范化错误。
6. 运行 dashboard/auth 定向测试、全量测试、TypeScript 检查和 AI Delivery audit。

## 结构约束

- UI/screen 不直接调用 Supabase。
- Profile 读取只允许在 `viewer !== null && isSessionReady` 后触发。
- Nickname 禁止直接更新 `user_profiles`，仅允许调用 `update_my_nickname`。
- Viewer 只接受 `wallet-login` 响应或已保存的受信 session，不接受 route 参数和本地输入。
- 数据库缺行、RLS/网络错误必须作为错误返回，不能伪装为空 profile。

## 验收命令

```bash
npm test -- src/features/dashboard src/features/auth src/app/providers
npm test -- src
npm run typecheck
npm run ai:audit -- rn-full-app-port
```
