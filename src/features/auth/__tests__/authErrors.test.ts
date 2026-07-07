import { describe, expect, it } from "vitest";

import { classifyAuthError } from "../workflow/authErrors";

describe("classifyAuthError", () => {
  it("classifies expected Privy, Supabase, network, and storage failures", () => {
    expect(classifyAuthError({ source: "privy", reason: "cancelled" })).toEqual({
      code: "privy_cancelled",
      retryable: false,
    });

    expect(classifyAuthError({ source: "exchange", status: 401 })).toEqual({
      code: "unauthorized",
      retryable: false,
    });

    expect(classifyAuthError({ source: "exchange", status: 403 })).toEqual({
      code: "account_disabled",
      retryable: false,
    });

    expect(classifyAuthError({ source: "exchange", status: 503 })).toEqual({
      code: "server_unavailable",
      retryable: true,
    });

    expect(classifyAuthError({ source: "network", reason: "timeout" })).toEqual({
      code: "network_timeout",
      retryable: true,
    });

    expect(classifyAuthError({ source: "storage", operation: "set_session" })).toEqual({
      code: "session_storage_failed",
      retryable: false,
    });
  });
});
