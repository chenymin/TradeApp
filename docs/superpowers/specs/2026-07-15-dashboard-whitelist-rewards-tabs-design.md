# Dashboard Whitelist And Rewards Tabs Design

**Date:** 2026-07-15
**Feature:** `rn-full-app-port`
**Tasks:** Task 6B information-architecture correction and Task 7A Whitelist read-only
**Status:** Approved for implementation planning

## Goal

Correct the authenticated Dashboard information architecture so Holdings, Transactions, Whitelist, and Rewards are four sibling tabs. Keep Invite Friends as a direct link-generation action in Profile, and add a mobile-first read-only Whitelist experience without weakening KYC or identity-data security boundaries.

## Corrected Information Architecture

The authenticated Dashboard segmented control uses this fixed order:

1. `Holdings`
2. `Transactions`
3. `Whitelist`
4. `Rewards`

The Dashboard header, profile summary, portfolio metrics, refresh action, and segmented control remain common. Only the active tab body changes.

`Rewards` renders the existing My Rewards capability inside Dashboard. It no longer owns a separate protected-page entry and no longer contains the Invite Friends launcher.

`Whitelist` renders the Task 7A read-only KYC status and, only for approved users, identity details.

The Profile menu keeps `邀请好友` as a command. Selecting it loads the authenticated user's invite prerequisites and opens the existing invite-type/link sheet directly. It must not navigate to Rewards.

Internal routes remain useful entry aliases:

- `referral` opens Dashboard with `Rewards` selected.
- `kyc` opens Dashboard with `Whitelist` selected.
- `dashboard` opens Dashboard with `Holdings` selected.

The public bottom-tab `Referral` route remains unchanged and must not inherit private Rewards authorization assumptions.

## Dashboard List Architecture

Every active Dashboard body uses one vertical virtualized list. No `FlatList` or `SectionList` is nested inside another vertical virtualized list.

A focused `DashboardHeader` component renders shared profile/portfolio content and the four-tab segmented control. The active body owns its list and receives this header as its list header:

- Holdings and Transactions reuse the Dashboard list.
- Whitelist uses a bounded read-only list for status and identity rows.
- Rewards uses its existing virtualized referral/point list and internal `Referrals / Points / Commission` selector.

Switching an outer Dashboard tab unmounts the inactive body. This releases Whitelist identity data from component memory and prevents inactive lists from retaining scroll or request state unnecessarily.

## Whitelist Mobile Layout

The supplied desktop reference defines the information hierarchy, not a literal two-card mobile layout.

On phones, Whitelist uses one full-width vertical flow:

1. Status header with shield icon, status title, and short explanation.
2. Status facts with full-width label/value rows separated by thin dividers.
3. Identity heading, followed by full-width label/value rows when identity data is available.

Status facts include:

- `KYC verification`
- `Verification date`
- `Valid until`

Approved identity facts include:

- `Name`
- `Country / region`
- `Document type`
- `Document number`
- `Date of birth`

The phone layout avoids decorative nested cards, horizontal tables, and values that depend on a desktop-width right column. Labels and values can wrap independently, with values right-aligned only when enough width remains. On wider tablets the two logical sections may appear in two columns, but phone behavior is the acceptance target.

## Whitelist Status Contract

The latest KYC application remains the trusted status source. Display behavior is:

| Status | User-facing state | Task 7A action |
| --- | --- | --- |
| no application | Whitelist not started | Status only; Task 7B owns start |
| `pending` | Complete KYC steps | Status only; Task 7B owns resume |
| `under_review` | Review in progress | Wait; no duplicate start |
| `awaiting_resubmission` | More information required | Status only; Task 7B owns resume |
| `rejected` | Whitelist not approved | Contact support guidance |
| `approved` | Whitelist approved | Show verification facts and load identity details |

A repository error is `status unavailable`, never `not started`.

The current product rule displays `Permanent` as validity for approved status. Verification date comes from `reviewed_at`; a missing valid date displays `Unavailable` rather than a fabricated date.

## Approved Identity Details

Identity details are fetched from the authenticated `kyc-applicant-details` Edge Function only when the latest status is `approved`.

The client request contains no user id. It uses the current Supabase access token, and the server must derive identity from the verified JWT.

The read model contains:

```text
fullName
country
docType
docNumber
dateOfBirth
```

Security rules:

- Do not call the details endpoint for any non-approved status.
- Do not log response payloads, access tokens, names, birth dates, or document numbers.
- Do not persist identity details to SecureStore, AsyncStorage, query caches, analytics, or crash breadcrumbs.
- Mask the document number before rendering. Preserve at most the first four and last four visible characters; short values are fully masked.
- Do not provide copy actions for identity fields.
- Clear details when Whitelist unmounts, viewer identity changes, session becomes unavailable, or logout occurs.

An identity-detail failure does not change an approved Whitelist status. It produces an inline `Identity details unavailable` state with explicit retry.

## Rewards Tab Correction

The existing Rewards screen keeps:

- total and four point balances;
- tier and tier-benefit descriptions;
- referral records;
- latest 50 point-ledger entries;
- `Referrals / Points / Commission` internal selector;
- independent loading, empty, error, and retry states;
- commission security-review state with no production commission request.

It removes:

- the top-level `My Rewards` route title when embedded in Dashboard;
- the Invite Friends section;
- standalone protected-route navigation assumptions.

The Rewards implementation accepts the shared Dashboard header as its list header so the outer screen still contains only one vertical virtualized list.

## Invite Friends Command

Profile `邀请好友` remains a direct command:

1. A logged-out user starts login and no private dependency is called.
2. An authenticated user loads Rewards profile and latest KYC status independently.
3. KYC must be approved and the profile must contain an invite code.
4. `EXPO_PUBLIC_WEB_ORIGIN` must be a validated HTTPS origin.
5. When all gates pass, open `InviteFriendSheet` with the real code and origin.

Failure states are explicit:

- session unavailable: sign in again;
- KYC not approved: open Dashboard Whitelist tab;
- invite code unavailable: show an unavailable message;
- public origin absent: show `Invite sharing is not configured`;
- repository failure: show retryable invite-loading feedback.

No placeholder code or local origin is allowed.

## Dependency Boundaries

- Dashboard and screen components do not import Supabase or `fetch`.
- KYC status, identity details, Rewards profile, and referrals are injected services.
- The identity client exposes `fetchDetails(accessToken)` and has no user-id argument.
- Invite loading reuses existing Rewards profile/KYC dependencies without duplicating database mappings.
- KYC start/resume, provider SDK lifecycle, and submission callbacks remain Task 7B and are not added here.
- Payout confirmation remains Task 6C and is not added here.

## Error And Refresh Behavior

- Dashboard refresh reloads common Dashboard data and the currently mounted tab's data.
- Whitelist status and identity errors are independent.
- Rewards partial failures remain independent.
- A failed Whitelist or Rewards request never hides the common Dashboard header or other tabs.
- Authentication errors are not displayed as empty business data.
- Retry actions operate only on the failed section.

## Accessibility And Responsive Rules

- All four outer tabs expose tab role and selected state.
- Status is expressed in text and iconography, not color alone.
- The shield icon uses the existing Lucide icon library.
- Rows keep stable ids or stable field keys; list indexes are not keys.
- Long names, country values, document types, referral emails, and sources wrap without overlapping adjacent content.
- At a 320-pixel phone width, tab labels remain readable; the segmented control may use smaller fixed text but does not horizontally scroll.
- Touch targets remain at least 40 pixels high.

## Testing And Verification

Implementation begins with failing tests for:

- exact outer-tab order: Holdings, Transactions, Whitelist, Rewards;
- selecting Rewards renders the real Rewards data inside Dashboard;
- selecting Whitelist renders all KYC status states;
- approved status is the only state that calls identity details;
- identity document masking and invalid-date fallback;
- identity detail failure leaves approved status visible and retries independently;
- switching away from Whitelist clears identity details by unmounting the body;
- no active Dashboard tree contains nested vertical virtualized lists;
- Profile Invite Friends opens the real invite sheet and does not navigate to Rewards;
- logged-out, KYC, invite-code, origin, and repository-error invite gates;
- internal `referral` and `kyc` routes select the correct Dashboard tab.

Verification includes the full test suite, TypeScript, AI Delivery audit/verify, forbidden-pattern scans, an iOS production bundle, and authenticated iOS/Android mobile visual QA. Web rendering is not an acceptance path unless Expo Web dependencies are separately added.

## Rollback And Stop Conditions

This change is read-only and has no migration. Rollback restores the two-tab Dashboard and standalone Rewards route wiring.

Stop before enabling identity details if the Edge Function accepts a client user id, returns non-approved identities, or cannot prove JWT-derived ownership. Stop before enabling invite sharing if the public registration origin is not confirmed. Commission and payout gates remain unchanged.
