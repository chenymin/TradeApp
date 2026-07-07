# AI Delivery Trigger Policy

## Purpose

This project uses AI Delivery as the delivery control plane. Agents must call the AI Delivery MCP tools, or the CLI fallback when MCP is unavailable, at the workflow boundaries below.

## Required Triggers

| Moment | Primary action | CLI fallback |
| --- | --- | --- |
| Before starting or resuming feature work | `ai_delivery_next` | `ai-delivery next <feature>` |
| Before moving to the next stage | `ai_delivery_audit` then `ai_delivery_advance` | `ai-delivery audit <feature>` then `ai-delivery advance <feature>` |
| After implementation changes | `ai-delivery verify <feature> --write` | `ai-delivery verify <feature> --write` |
| Before PR / ship handoff | `ai_delivery_audit` and `ai-delivery ship <feature>` | `ai-delivery audit <feature>` and `ai-delivery ship <feature>` |

## Feature Identification

If the feature slug is unclear, ask the user. Do not invent a slug.

## Enforcement Level

This version is advisory. Agent rules and `ai-delivery doctor` make the policy visible and checkable. Blocking hooks are intentionally deferred.

## 中文说明

MCP 是能力层，trigger policy 是行为层，`ai-delivery doctor` 是诊断层。本版本不会安装阻断式 shell/editor hook；它通过常驻规则和 doctor 检查让流程更容易被遵守。
