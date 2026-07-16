# Profile Invite Loading Skeleton Design

Date: 2026-07-16

Feature: `rn-full-app-port`

## Goal

Replace the visually heavy `Loading invite details` feedback card on the Profile screen with a quiet skeleton placeholder. The loading state should remain understandable to assistive technology and should not change the invite workflow.

## Scope

- Change only the `loading` presentation for the Profile invite command.
- Show the skeleton only after the user selects `邀请好友` and while invite details are loading.
- Keep the current session, KYC, invite-code, origin, error, retry, and native share behavior unchanged.
- Do not add a new dependency or animation loop.

## UI Design

- Reserve a stable 64-point-high region below the Profile menu.
- Render two neutral skeleton bars aligned with the menu content.
- Use the existing surface, border, and muted color tokens so the state reads as temporary content rather than an alert.
- Keep the Sign out action in its current position and spacing relationship.
- Expose `Loading invite details` as the loading region's accessibility label while hiding the decorative bars from the accessibility tree.

## State Behavior

- `idle`: render no invite status region.
- `loading`: render the skeleton placeholder.
- `session_unavailable`, `invite_code_unavailable`, and `origin_unavailable`: render the existing text feedback.
- `unavailable`: render the existing text feedback and Retry action.

## Testing

- Add a failing component test that holds the invite request pending and expects the skeleton loading region.
- Verify the loading region keeps the accessible loading label and does not render visible loading copy.
- Verify non-loading feedback and Retry behavior remain unchanged.
- Run the focused navigator test, TypeScript check, full test suite, and AI Delivery audit.

## Non-Goals

- No invite domain, authentication, KYC, repository, or sharing changes.
- No configuration changes to `EXPO_PUBLIC_WEB_ORIGIN`.
- No payout or commission work.
