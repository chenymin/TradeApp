const POINT_LOCALE = "zh-CN";
const TIERS = new Set(["S", "A", "B", "C", "D"]);

export function formatPoints(value: number | null | undefined): string {
  const normalized = normalizePoints(value);
  const isWhole = Math.abs(normalized - Math.trunc(normalized)) < 1e-9;

  return normalized.toLocaleString(POINT_LOCALE, {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  });
}

export function formatIntegerPoints(value: number | null | undefined): string {
  return normalizePoints(value).toLocaleString(POINT_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatTier(value: string | null | undefined): string {
  return value && TIERS.has(value) ? value : "D";
}

function normalizePoints(value: number | null | undefined): number {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}
