#!/usr/bin/env sh
set -eu

EVENT="${1:-${AI_DELIVERY_EVENT:-SessionStart}}"
FEATURE="${2:-${AI_DELIVERY_FEATURE:-}}"
EXPECTED_STAGE="${AI_DELIVERY_EXPECTED_STAGE:-}"

set -- session-check --event "$EVENT"

if [ -n "$FEATURE" ]; then
  set -- "$@" --feature "$FEATURE"
fi

if [ -n "$EXPECTED_STAGE" ]; then
  set -- "$@" --expected-stage "$EXPECTED_STAGE"
fi

exec node ./bin/ai-delivery.mjs "$@"
