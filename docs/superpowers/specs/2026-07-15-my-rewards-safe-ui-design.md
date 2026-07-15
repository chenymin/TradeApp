# My Rewards Safe UI Design

**Date:** 2026-07-15
**Feature:** `rn-full-app-port`
**Task:** 6B - My Rewards UI
**Status:** Approved for implementation planning

## Goal

Deliver an authenticated My Rewards screen that can be opened and verified in the React Native app using the Task 6A read models. The first verifiable slice shows real profile points, recent point activity, referral records, and tier benefits without exposing unsafe commission data or generating unusable invite links.

## Scope

The screen includes:

- Four point balances: referral, trading, reputation, and task points.
- Total points and the user's current tier.
- KYC-aware invite status and invite code display.
- Referral records and the latest 50 point ledger entries.
- Tier benefit descriptions for known tiers.
- A commission tab that clearly reports that commission data is unavailable while backend authorization is under review.
- Independent loading, empty, error, and retry states for profile, referrals, and point ledger data.
- Navigation from the protected `referral` route.
- Removal of the duplicate point ledger list from Dashboard while retaining its points summary.

The screen does not include:

- Reads from `my_commission_summary` or `my_commission_details`.
- Payout confirmation or any other commission write.
- A fake or fixture-backed commission balance in production UI.
- Invite-link generation until a valid public Web origin is configured.
- KYC start/resume behavior, which belongs to Task 7B.

## Information Architecture

My Rewards is a protected route available only after the auth session is ready. It uses one virtualized list for the whole screen so the summary content and active result list scroll together without nesting a `FlatList` inside a `ScrollView`.

The list header contains:

1. A compact rewards identity row with tier and total points.
2. A two-column grid containing the four point balances.
3. An invite section.
4. Tier benefits.
5. A segmented control for `Referrals`, `Points`, and `Commission`.

The list body changes with the active segment:

- `Referrals`: referral record rows.
- `Points`: point ledger rows.
- `Commission`: one non-interactive security-review state, with no repository request.

## Components And Boundaries

`RewardsScreen` owns screen state, parallel loading, refresh, and selection of the active list. It receives repositories and viewer/session data through typed dependencies and does not import Supabase, `fetch`, Clipboard, Share, or React Native Linking.

Focused components provide rendering only:

- `PointsSummary` renders the total and four balances.
- `InviteSection` renders the KYC gate, invite code, and disabled/configuration state.
- `TierBenefitsSection` renders known tier benefits and a stable unknown-tier fallback.
- `ReferralRecordRow` renders a referral identity, status, type/tier, points, and date.
- `PointLedgerRow` renders point type, source, signed amount, balance, and date.
- `CommissionUnavailableState` explains the temporary security gate without exposing backend details.

Default service construction remains outside the screen. `AppRoot` creates production dependencies and `AppNavigator` injects them into the protected route.

## Data Flow

The screen loads only when `isSessionReady` is true and an authenticated viewer exists.

On first load or manual refresh:

1. Fetch the rewards profile using the authenticated viewer id.
2. Fetch the latest 50 point ledger entries using the authenticated viewer id.
3. Fetch referral records using the current access token; the client API accepts no user id.
4. Settle each request independently so one failure does not hide successful sections.
5. Never call either commission view.

The viewer id comes only from the verified auth viewer. The access token comes only from the current Supabase session and is passed directly to the authenticated Edge Function client. Neither value is logged or rendered.

## Invite Behavior

Invitation remains subject to two independent gates:

- The profile must have an invite code and Dashboard KYC status must be `approved`.
- A validated `EXPO_PUBLIC_WEB_ORIGIN` must be present in centralized public configuration.

When either gate is missing, the section shows the relevant next step and does not construct, copy, or share a URL. When both gates are satisfied, the existing invite sheet and its four target types can be opened with the real invite code and configured origin.

KYC approval here is an interface gate only. Referral qualification remains a backend responsibility.

## Error And Empty States

Each remote section has a distinct state:

- Loading shows a stable inline placeholder without changing the screen height abruptly.
- Empty is used only after a successful request returns no records.
- Retryable failures expose a retry action for that section.
- Authentication failures tell the user to sign in again and do not appear as empty data.
- Permission or invalid-response failures use an unavailable state and do not continuously retry.

Profile failure leaves referral and point history visible when those requests succeed. Referral failure leaves point data visible, and point failure leaves referral data visible.

The commission state is intentionally unavailable, not an error resulting from a request. Its text states that settlement data is temporarily unavailable pending a security review.

## Formatting And Accessibility

- Point values use existing reward formatting rules: integers have no decimal suffix; decimal values show at most two places.
- Long email addresses, sources, and identifiers wrap or truncate without changing row controls.
- Rows use stable business ids, never list indexes.
- Segments expose selected state and all actions have accessibility labels.
- Status is communicated in text as well as color.
- The layout supports small mobile widths and large values without horizontal scrolling.

## Testing And Verification

Implementation starts with failing tests that cover:

- Protected-session handling.
- Four point balances, total points, and tier benefits.
- Unknown-tier fallback.
- Referral and point segment switching.
- Independent success, empty, failure, and retry behavior.
- Commission repository functions are never called.
- KYC and public-origin invite gates.
- Dashboard no longer renders a point ledger tab.
- Navigation renders My Rewards on the protected `referral` route.

Machine verification includes focused Jest tests, the full test suite, TypeScript checking, forbidden-pattern scans from the Task 6/7 business plan, and `ai:audit`. Visual verification covers a small mobile viewport, long text, empty data, partial errors, and refresh behavior.

## Security Stop Conditions

Commission reads remain disabled until backend owners provide evidence that anonymous access is revoked, both views use the intended invoker semantics, underlying tables enforce RLS, and two authenticated users cannot read each other's rows. Payout confirmation remains a separate Task 6C change requiring its own review and kill switch.

Invite sharing remains disabled until the product owner confirms the public Web registration origin. No local, Expo, or placeholder origin is used as a fallback.
