export type ReferralRecordsErrorCode =
  | "forbidden"
  | "invalid_response"
  | "network_unavailable"
  | "server_unavailable"
  | "unauthorized";

export class ReferralRecordsError extends Error {
  readonly code: ReferralRecordsErrorCode;
  readonly retryable: boolean;

  constructor(
    code: ReferralRecordsErrorCode,
    { retryable }: { retryable: boolean },
  ) {
    super(code);
    this.name = "ReferralRecordsError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type ReferralRecordsClient = {
  fetchRecords(accessToken: string): Promise<ReferralRecord[]>;
};

export function createReferralRecordsClient({
  endpoint,
  fetch: fetchImpl,
}: {
  endpoint: string;
  fetch: typeof fetch;
}): ReferralRecordsClient {
  return {
    async fetchRecords(accessToken: string) {
      if (!accessToken.trim()) {
        throw new ReferralRecordsError("unauthorized", { retryable: false });
      }

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
          method: "GET",
        });
      } catch {
        throw new ReferralRecordsError("network_unavailable", {
          retryable: true,
        });
      }

      if (!response.ok) {
        throw mapHttpError(response.status);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ReferralRecordsError("invalid_response", {
          retryable: false,
        });
      }

      const records = (payload as { records?: unknown } | null)?.records;
      if (!Array.isArray(records)) {
        throw new ReferralRecordsError("invalid_response", {
          retryable: false,
        });
      }

      try {
        return records.map(mapRecord);
      } catch {
        throw new ReferralRecordsError("invalid_response", {
          retryable: false,
        });
      }
    },
  };
}

function mapHttpError(status: number): ReferralRecordsError {
  if (status === 401) {
    return new ReferralRecordsError("unauthorized", { retryable: false });
  }
  if (status === 403) {
    return new ReferralRecordsError("forbidden", { retryable: false });
  }
  return new ReferralRecordsError("server_unavailable", {
    retryable: status >= 500,
  });
}

function mapRecord(value: unknown): ReferralRecord {
  const row = value as Record<string, unknown>;
  return {
    createdAt: requiredText(row.created_at),
    id: requiredText(row.id),
    referredEmail: nullableText(row.referred_email),
    referredId: requiredText(row.referred_id),
    referredTier: normalizeTier(row.referred_tier),
    referredUserType: typeof row.referred_user_type === "string" &&
      REGISTRATION_USER_TYPES.includes(row.referred_user_type as never)
      ? row.referred_user_type as ReferralRecord["referredUserType"]
      : null,
    referredWalletAddress: nullableText(row.referred_wallet_address),
    status: normalizeReferralStatus(row.referral_status),
    totalPointsAwarded: finiteNumber(row.total_points_awarded),
  };
}

function normalizeTier(value: unknown): ReferralRecord["referredTier"] {
  return value === "S" || value === "A" || value === "B" ||
      value === "C" || value === "D"
    ? value
    : null;
}

function finiteNumber(value: unknown): number {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown): string {
  const text = nullableText(value);
  if (!text) throw new Error("Required referral field is missing");
  return text;
}
import { REGISTRATION_USER_TYPES } from "../../registration/domain/registrationPayload";
import type { ReferralRecord } from "../domain/rewardModels";
import { normalizeReferralStatus } from "../domain/rewardStatus";
