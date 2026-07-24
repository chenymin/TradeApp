# MyTradeApp Design System

MyTradeApp uses Institutional Clarity: one dominant financial focus per screen, compact secondary facts, flat scannable rows, and restrained semantic color. Dashboard and Wallet are the reference implementations for future page migrations.

## Foundations

- Use the tokens exported by `src/shared/ui/theme.ts`; do not introduce page-local approximations for an existing color, spacing, radius, typography, or motion role.
- Use platform system fonts. Amounts and other comparable numbers use tabular numerals.
- Mobile page padding is 20 points, primary section spacing is 24 points, and interactive targets are at least 44 by 44 points.
- Use radii 4, 6, and 8 for surfaces. Fully rounded shapes are reserved for avatars and compact status pills.
- Emerald communicates primary actions, selected controls, and positive states. Warning and danger colors keep their own meanings. Champagne is a low-frequency brand accent, not a call to action.

## Information Hierarchy

- Each screen has one visual focus. Dashboard focuses portfolio value; Wallet focuses active wallet identity and available balance.
- Cards frame independent objects or critical summaries. Ordinary facts use spacing, headings, and dividers instead of nested cards.
- Keep feature-specific summaries, section commands, and data rows inside their feature. Shared UI contains presentation capabilities, not financial or wallet business models.

## Restrained Glass

Glass is allowed only for application chrome and temporary control layers: headers, bottom navigation, segmented controls, and overlay shells. Core amounts, list rows, errors, recovery controls, destructive actions, and QR backgrounds remain solid and high contrast.

The supported fallback order is:

1. Reduce Transparency: opaque high-contrast surface.
2. Supported iOS native glass.
3. Older iOS blur with a fixed tint and border.
4. Android static translucent surface; no live blur.
5. Opaque surface when native capability is unavailable.

## Loading States

- Skeletons reproduce the final content outline: identity, title, supporting text, amount, and action slots.
- Loading must not display a real-looking zero value.
- One skeleton group owns one animation value. Individual blocks do not create timers or listeners.
- Reduce Motion renders static skeletons.
- Loading and ready layouts keep stable dimensions to avoid visible content jumps.

## Accessibility And Resilience

- Icon commands keep explicit accessibility labels and at least a 44 by 44 point hit target.
- Long addresses, email, amounts, narrow screens, and Dynamic Type must not overlap adjacent content or actions.
- Presentation never infers session, ownership, active wallet, mutation success, or recovery completion. Those decisions remain with the existing Viewer, loaders, workflows, and backend.
