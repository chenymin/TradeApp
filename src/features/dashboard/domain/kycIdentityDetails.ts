export type KycIdentityDetails = {
  country: string | null;
  dateOfBirth: string | null;
  docNumber: string | null;
  docType: string | null;
  fullName: string | null;
};

export function maskDocumentNumber(value: string | null): string {
  const characters = Array.from(value?.trim() ?? "");
  if (!characters.length) return "Unavailable";
  if (characters.length <= 8) return "*".repeat(characters.length);

  return `${characters.slice(0, 4).join("")}${"*".repeat(
    characters.length - 8,
  )}${characters.slice(-4).join("")}`;
}

export function formatIdentityDate(value: string | null): string {
  if (!value) return "Unavailable";

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString().slice(0, 10)
    : "Unavailable";
}
