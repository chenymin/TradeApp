# Task 4 Delivery Evidence: RN Asset Detail Read-Only

日期：2026-07-14
Feature slug：`rn-full-app-port`
阶段：编码实现
结论：Task 4 code complete；不推进 AI Delivery stage。

## Scope

- 实现公开资产主详情、最新估值报告和 mint events 的只读 Supabase repositories。
- 按资产 chain ID 读取 BSC 56 / 97 合约公开状态和可选钱包预览；共享 viem client 与 USDT registry。
- 复用 Task 3 Sale Status Resolution，数据库 fallback 永远不能授权 Subscribe。
- 实现详情 hero、四个 segmented tabs、估值免责声明、发行规则、合约与事件时间线、固定 CTA。
- 实现列表 placeholder、返回来源 Launchpad / Market、安全 HTTP(S) 外链和部分失败局部空态。
- 未实现 `generate-signature`、approve、mint、receipt、transfer、realtime 或任何数据库/链写入。

## Automated Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full Vitest suite | pass | 45 test files / 201 tests |
| TypeScript | pass | `npm run typecheck` exit 0 |
| Asset/navigation/platform scope | pass | 25 test files / 121 tests |
| Diff validation | pass | `git diff --check` exit 0 |
| Database/chain write boundary | pass | no insert/upsert/update/delete, `writeContract`, `approve(`, `mint(`, or `generate-signature` in scoped production paths |
| Auth/secret boundary | pass | no service-role value, token/session logging, or localStorage identity trust in scoped paths |
| React Native boundary | pass | no `window`, `document`, or `navigator` in scoped paths |

## Risk Reviews

- Security：only public Supabase reads and viem public clients are introduced; no secret, signature, transaction, or write API enters the feature.
- Data / RLS：primary detail failure is page-level; valuation and mint-event RLS failures remain local. Production anon grants and policies require human verification.
- Payment / contract：USDT values retain BigInt until `formatUnits`; art shares use 18 decimals; mandatory contract failure produces `error`, never substituted zero.
- KYC / permission：the current auth provider exposes only login status. Wallet, KYC, and whitelist remain explicit `unknown`; the client does not infer approval.
- Idempotency / webhook / realtime：not applicable because Task 4 performs no write, webhook handling, polling, or subscription.
- Performance：one primary query followed by three concurrent optional reads; no polling/realtime; tab changes reuse one read model and do not reload.
- Rollback：revert Task 4 code to restore the prior detail placeholder. No database, contract, or user state requires compensation.

## Review Findings

| Severity | Area | Finding | Resolution |
| --- | --- | --- | --- |
| Important | Eligibility trust | Auth runtime has no trusted KYC/whitelist values. | Kept both as `unknown`; active-chain state alone cannot enable Subscribe. |
| Important | Chain failure semantics | Required multicall values could not safely default to zero. | Used a discriminated result; `error`/`unsupported` carry no numeric fields. |
| Minor | Native linking | Expo linking failures could reject into an unhandled UI promise. | Adapter catches platform failures and returns deterministic `unsupported`. |

No open Critical or Important code findings remain. The exhaustive Codex Security plugin scan was not run because its required subagent workflow is unavailable under the current session constraints; deterministic scoped security gates above passed.

## Stop For Human

- Confirm `art_assets`, `artwork_submissions`, `asset_valuation_reports`, and `mint_events` Data API exposure and intended anon/authenticated SELECT RLS policies.
- Run iOS and Android device QA for safe-area layout, fixed CTA overlap, long text, real images, slow/offline RPC, tab switching, Back behavior, and external links.
- Confirm BSC 56 / 97 RPC and deployed USDT contract addresses in the release environment.
- Track the existing Privy initialization `请求超时` behavior separately; Task 4 does not change Privy initialization.
- Do not auto-deploy, auto-merge, or advance the feature stage from this Task 4 completion.
