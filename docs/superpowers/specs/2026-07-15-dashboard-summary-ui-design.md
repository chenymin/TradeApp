# Dashboard Summary UI Design

## Goal

Replace the current form-like dashboard summary with a clear mobile metric hierarchy based on approved visual option A.

## Scope

- Restyle only the Dashboard header and summary area.
- Preserve all existing loaders, verified viewer boundaries, refresh behavior, tabs, list virtualization, partial error states, and read-only business rules.
- Keep the current English product copy. Localization is outside this UI adjustment.
- Do not change Supabase, chain reads, KYC authorization, commission calculations, or financial workflows.

## Layout

The Dashboard header keeps the title and editable nickname on the left. Refresh becomes a compact icon button on the right with an accessibility label and a stable hit target.

The five current summary values are reorganized as follows:

1. A fixed two-column by two-row metric grid contains portfolio value, total PnL, tier/points, and KYC.
2. Portfolio value is the visual anchor with a dark background and light text.
3. Total PnL displays the signed amount and signed percentage on separate lines, using positive or negative status color.
4. Tier and points share one tile while remaining separately readable.
5. KYC uses the existing status label and applies a positive color only to approved/verified state.
6. Commission lifetime total moves below the grid into a compact standalone summary row. It is not part of the four primary account-health metrics.

Each metric includes a Lucide icon, concise label, and value. Tiles use the existing 8 px maximum radius, theme colors, and stable minimum heights. The grid remains two columns on supported phone widths and allows long values to wrap without overlapping adjacent content.

## Nickname Editing

Nickname editing uses a compact inline input without visible Save or Cancel buttons.

- Tapping the nickname opens the input with the current nickname selected.
- Pressing the keyboard Done action or moving focus outside the input attempts one save.
- Submitting an unchanged value exits editing without calling the nickname RPC.
- A changed valid value continues through the existing `update_my_nickname` repository and profile refresh workflow.
- Validation or repository failure keeps the input visible and shows the existing inline error below it.
- Concurrent blur and submit events must not issue duplicate nickname writes.

This change affects only the editor interaction. Nickname validation, the RPC boundary, profile refresh, and viewer authorization remain unchanged.

## Components

- `DashboardScreen` continues to own loading and tab state.
- A focused summary component renders the approved metric grid and commission row from display-ready values.
- A reusable metric tile handles icon, label, value, optional secondary value, emphasis, and status tone.
- No data access library is imported by the screen or new presentation components.

## Data And Error Behavior

The UI consumes the same `profile`, `holdings`, `kyc`, and `commission` state already loaded by `DashboardScreen`. Missing values retain the existing deterministic fallbacks. Partial loader failures continue to display the warning banner, and unavailable commission data continues to show `Unavailable` rather than inventing a value.

## Accessibility

- The refresh icon keeps the existing `Refresh dashboard` accessibility label.
- Metric labels remain visible text and do not depend on icons alone.
- Positive and negative meaning is present in signed text, not only color.
- Touch targets use stable dimensions and do not shift while values load.

## Verification

- Add a failing component test for the four primary metric tiles and separate commission summary.
- Add a failing interaction test proving the nickname editor has no action buttons and saves once on blur or keyboard submission.
- Preserve tests for loading, tabs, explorer URLs, session gating, points, and commission values.
- Run the Dashboard and navigation test suites, full source tests, TypeScript typecheck, AI Delivery audit, and diff whitespace validation.
- Inspect the rendered layout at narrow and standard phone widths to confirm no overlap, truncation, or layout shift.

## Acceptance Criteria

- The summary no longer appears as five undifferentiated text blocks.
- Portfolio value is the strongest first-viewport metric.
- The four primary metrics are visible without horizontal scrolling.
- Commission remains visible but visually secondary.
- Nickname editing has no visible Save or Cancel buttons.
- A changed nickname saves once on Done or focus loss; an unchanged nickname exits without a write.
- Existing Dashboard business behavior and security boundaries are unchanged.
