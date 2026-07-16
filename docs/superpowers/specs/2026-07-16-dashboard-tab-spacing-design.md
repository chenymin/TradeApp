# Dashboard Tab Spacing Design

Date: 2026-07-16

Feature: `rn-full-app-port`

## Problem

Switching from Holdings or Transactions to Whitelist or Rewards shifts the shared Dashboard header, summary cards, segmented control, and tab content horizontally. Holdings and Transactions use `spacing.md` (16 px) for the active `FlatList` content container, while Whitelist and Rewards use `spacing.lg` (24 px).

## Decision

Use `spacing.md` as the horizontal content padding for all four Dashboard tabs. This preserves the current Holdings and Transactions layout, keeps more usable width on phones, and removes the 8 px shift on each side when tabs change.

The fix is limited to the outer `FlatList` content containers in `WhitelistScreen` and `RewardsScreen`. It does not change:

- Dashboard summary or segmented-control styling
- List row padding and separators
- Whitelist status or identity presentation
- Rewards internal tabs or business behavior
- Scrolling, refresh, loading, empty, or error states

## Verification

Add a Dashboard regression test that switches through Holdings, Transactions, Whitelist, and Rewards and asserts that the active vertical `FlatList` uses the same 16 px horizontal content padding in every state.

Run the focused Dashboard, Whitelist, and Rewards tests, TypeScript type checking, `git diff --check`, and the AI Delivery audit and verification gates.

## Acceptance Criteria

- The shared Dashboard content no longer shifts horizontally when any of the four tabs is selected.
- All four active list containers use 16 px horizontal padding.
- Existing touch targets, labels, list virtualization, and data behavior remain unchanged.
