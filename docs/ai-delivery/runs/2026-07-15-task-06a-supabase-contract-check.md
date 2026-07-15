# Task 6A Supabase Contract Check

Date: 2026-07-15
Feature: `rn-full-app-port`
Slice: `Task 6A - Rewards read models`
Status: **BLOCKED - environment authorization gate failed**

## Scope

Read-only probes used the project's public Supabase URL and anon key. No user token, service-role key, row value, wallet, email, commission amount, or other business data was printed or stored in this artifact.

## Evidence

| Probe | Result | Interpretation |
| --- | --- | --- |
| `my_commission_summary`, expected columns, `limit=0` | HTTP 200 | View and expected columns exist in the Data API schema. |
| `my_commission_details`, expected columns, `limit=0` | HTTP 200 | View and expected columns exist in the Data API schema. |
| `my_commission_summary`, anon role, `limit=1` | HTTP 200, 1 row | Anonymous callers can read a commission summary row. This violates the private Rewards authorization boundary. |
| `my_commission_details`, anon role, `limit=1` | HTTP 200, 0 rows | No row was returned for this probe, but this does not prove authenticated ownership isolation. |

## Required Remediation

Owner: Supabase / backend schema owner.

1. Inspect both view definitions and their grants in the target project.
2. Revoke `anon` access to both views.
3. Ensure views use `security_invoker = true` on supported Postgres versions, or move them behind an equivalent protected read path.
4. Grant only the required `SELECT` permission to `authenticated`.
5. Verify the underlying ownership predicate resolves the caller from `auth.uid()` and cannot be supplied by the client.
6. Test with two authenticated users: each user sees only their own summary/details, and anon receives no commission data.
7. Confirm `confirm_commission_payout` ownership and idempotency separately before Task 6C.

## Stop Condition

Do not connect commission views to Rewards UI and do not enable payout confirmation until the remediation and two-user isolation test pass. Local repositories intentionally return explicit errors/unavailable states instead of silently treating authorization failures as empty data.
