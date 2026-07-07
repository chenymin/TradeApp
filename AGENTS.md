<!-- ai-delivery-kit:start -->
## AI Delivery Rules

This project uses `@artstar/ai-delivery-kit` to manage AI-assisted delivery from requirements to shipping.

## AI Delivery Trigger Rules

Use AI Delivery whenever the task is related to a tracked feature.

- Before starting feature work, call `ai_delivery_next` with the feature slug.
- Before editing requirements, solution design, or implementation-plan documents, call `ai_delivery_next`.
- After editing requirements, solution design, or implementation-plan documents, call `ai_delivery_audit`.
- Before claiming a stage is ready, call `ai_delivery_audit`.
- Before advancing stages, call `ai_delivery_audit`; only call `ai_delivery_advance` after audit passes.
- Before coding, follow the risk playbooks and project rules surfaced by `ai_delivery_next`.
- If MCP is unavailable, use `npm run ai:next -- <feature-slug>`, `npm run ai:audit -- <feature-slug>`, and `npm run ai:advance -- <feature-slug>`.
- If the feature slug is unclear, ask the user instead of guessing.
<!-- ai-delivery-kit:end -->
