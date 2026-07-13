# Task 3 Delivery Evidence：RN Public Assets、Launchpad、Market

日期：2026-07-13
Feature slug：`rn-full-app-port`
阶段：编码实现
结论：Task 3 code complete；不推进 AI Delivery stage。

## Scope

- 实现公开 `art_assets` / `artwork_submissions` 只读 repository 和 cursor-style pagination。
- 通过 viem 按 chain ID 批量读取 `saleActive`、`sold`、`SALE_CAP`、`saleStartTime`、`saleEndTime`。
- 实现 chain-authoritative 展示状态；RPC 失败使用不可信数据库 fallback，禁止据此获得购买资格。
- 实现 reducer-backed list workflow、request ID 竞态保护、刷新、加载更多、筛选、搜索防抖和排序。
- 实现 RN `FlatList` Launchpad、Market、AssetCard、Summary Strip 和导航接入。
- 资产点击只进入 Task 4 Detail placeholder；没有 KYC、余额、approve、mint、transfer、realtime 或其它写操作。

## Automated Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full Vitest suite | pass | 34 test files / 146 tests |
| TypeScript | pass | `npm run typecheck` exit 0 |
| AI Delivery audit | pass | no cross-document consistency findings |
| AI Delivery verify | pass | 8 / 8 deterministic checks |
| AI Delivery ship | pass | all configured gates passed; PR / CI / connector review remain advisory external evidence |
| Asset/navigation regression | pass | 14 test files / 68 tests before final full run |
| UI Supabase boundary | pass | no `.from(` or Supabase import in asset screens/components/hooks |
| Chain write boundary | pass | no `writeContract`, `sendTransaction`, `approve`, or `mint(` in assets feature |
| FlatList key rule | pass | no `key={index}` in asset TSX |
| Secret boundary | pass | no production `service_role` or public service-key pattern |
| Expo Metro | pass | `http://localhost:8083/status` returned `packager-status:running` |

## Review Findings

| Severity | Area | Finding | Resolution |
| --- | --- | --- | --- |
| Important | Supabase search | A single PostgREST `.or()` cannot safely span `art_assets` and `artwork_submissions`. | Fixed with two read-only queries: root symbol search and `artwork_submissions!submission_id!inner` referenced-table search; results merge by asset ID before cursor slicing. |
| Minor | List keys | Static loading skeletons used an array index key. | Replaced with stable fixed skeleton IDs; forbidden scan now passes. |

No open Critical or Important code findings remain.

## Security And Data Boundaries

- The app uses only the public Supabase client; no service-role or secret key is introduced.
- Repository operations are limited to SELECT filtering, ordering, and range reads.
- Database fallback is display-only and always has `canTrustForPurchase = false`.
- Contract calls are page-scoped, read-only, grouped by chain, and use `allowFailure: true` for per-asset isolation.
- No schema or migration change is included.

## Stop For Human

- Before deployment, confirm `art_assets` and `artwork_submissions` are exposed through the Supabase Data API to `anon` and protected by the intended SELECT RLS policies.
- Run iOS and Android device QA for safe-area layout, real image loading, pull-to-refresh, pagination, tab switching, and slow/offline RPC fallback.
- Do not auto-deploy, auto-merge, or advance the feature stage from this Task 3 completion.

## Rollback

- Revert Task 3 commits to restore Launchpad/Market placeholders; no database or chain state requires rollback.
- If RPC behavior is unstable, keep database list display but disable release until chain fallback and status labels pass device QA.
