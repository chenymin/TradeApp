import type { KycIdentityDetails } from "../domain/kycIdentityDetails";

export type KycIdentityDetailsErrorCode =
  | "forbidden"
  | "invalid_response"
  | "network_unavailable"
  | "server_unavailable"
  | "unauthorized";

export class KycIdentityDetailsError extends Error {
  readonly code: KycIdentityDetailsErrorCode;
  readonly retryable: boolean;

  constructor(
    code: KycIdentityDetailsErrorCode,
    { retryable }: { retryable: boolean },
  ) {
    super(code);
    this.name = "KycIdentityDetailsError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type KycIdentityDetailsClient = {
  fetchDetails(accessToken: string): Promise<KycIdentityDetails>;
};

export function createKycIdentityDetailsClient({
  endpoint,
  fetch: fetchImpl,
}: {
  endpoint: string;
  fetch: typeof fetch;
}): KycIdentityDetailsClient {
  return {
    async fetchDetails(accessToken) {
      if (!accessToken.trim()) {
        throw new KycIdentityDetailsError("unauthorized", { retryable: false });
      }

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          body: "{}",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
      } catch {
        throw new KycIdentityDetailsError("network_unavailable", {
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
        throw new KycIdentityDetailsError("invalid_response", {
          retryable: false,
        });
      }

      return parseIdentityDetails(payload);
    },
  };
}

function mapHttpError(status: number): KycIdentityDetailsError {
  if (status === 401) {
    return new KycIdentityDetailsError("unauthorized", { retryable: false });
  }
  if (status === 403) {
    return new KycIdentityDetailsError("forbidden", { retryable: false });
  }
  return new KycIdentityDetailsError("server_unavailable", {
    retryable: status >= 500,
  });
}

function parseIdentityDetails(value: unknown): KycIdentityDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidResponse();
  }

  const row = value as Record<string, unknown>;
  const keys = [
    "country",
    "dateOfBirth",
    "docNumber",
    "docType",
    "fullName",
  ] as const;

  if (keys.some((key) => !(key in row) || !isNullableString(row[key]))) {
    throw invalidResponse();
  }

  return {
    country: normalizeText(row.country),
    dateOfBirth: normalizeText(row.dateOfBirth),
    docNumber: normalizeText(row.docNumber),
    docType: normalizeText(row.docType),
    fullName: normalizeText(row.fullName),
  };
}

function invalidResponse(): KycIdentityDetailsError {
  return new KycIdentityDetailsError("invalid_response", { retryable: false });
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
