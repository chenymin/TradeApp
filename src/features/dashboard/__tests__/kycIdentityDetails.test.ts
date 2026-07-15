import { describe, expect, it } from "vitest";

import {
  formatIdentityDate,
  maskDocumentNumber,
} from "../domain/kycIdentityDetails";

describe("KYC identity presentation", () => {
  it("preserves at most four leading and trailing document characters", () => {
    expect(maskDocumentNumber("430181200212308817"))
      .toBe("4301**********8817");
    expect(maskDocumentNumber("A12345678")).toBe("A123*5678");
  });

  it("fully masks short document values", () => {
    expect(maskDocumentNumber("A1234567")).toBe("********");
    expect(maskDocumentNumber(null)).toBe("Unavailable");
  });

  it("formats valid dates and rejects invalid dates", () => {
    expect(formatIdentityDate("2026-07-10T09:00:00Z")).toBe("2026-07-10");
    expect(formatIdentityDate("not-a-date")).toBe("Unavailable");
    expect(formatIdentityDate(null)).toBe("Unavailable");
  });
});
