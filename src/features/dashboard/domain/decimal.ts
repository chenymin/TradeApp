type DecimalParts = {
  coefficient: bigint;
  scale: number;
};

export function normalizeUnsignedDecimal(value: unknown): string {
  const normalized = normalizeDecimal(value);
  return normalized.startsWith("-") ? "0" : normalized;
}

export function normalizeDecimal(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "0";
  }

  const parsed = parseDecimal(String(value));
  return parsed ? formatDecimal(parsed) : "0";
}

export function addDecimals(left: string, right: string): string {
  const [a, b] = align(parseOrZero(left), parseOrZero(right));
  return formatDecimal({ coefficient: a.coefficient + b.coefficient, scale: a.scale });
}

export function subtractDecimals(left: string, right: string): string {
  const [a, b] = align(parseOrZero(left), parseOrZero(right));
  return formatDecimal({ coefficient: a.coefficient - b.coefficient, scale: a.scale });
}

export function multiplyDecimals(left: string, right: string): string {
  const a = parseOrZero(left);
  const b = parseOrZero(right);
  return formatDecimal({
    coefficient: a.coefficient * b.coefficient,
    scale: a.scale + b.scale,
  });
}

export function divideDecimals(
  numerator: string,
  denominator: string,
  precision = 18,
): string {
  const a = parseOrZero(numerator);
  const b = parseOrZero(denominator);

  if (b.coefficient === 0n) {
    return "0";
  }

  const coefficient = (
    a.coefficient * powerOfTen(b.scale + precision)
  ) / (
    b.coefficient * powerOfTen(a.scale)
  );
  return formatDecimal({ coefficient, scale: precision });
}

export function percentDecimal(numerator: string, denominator: string): string {
  return divideDecimals(multiplyDecimals(numerator, "100"), denominator);
}

export function isPositiveDecimal(value: string): boolean {
  return parseOrZero(value).coefficient > 0n;
}

function parseDecimal(value: string): DecimalParts | null {
  const match = value.trim().match(/^([+-]?)(\d+)(?:\.(\d+))?$/);

  if (!match) {
    return null;
  }

  const fraction = match[3] ?? "";
  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
  const sign = match[1] === "-" ? -1n : 1n;
  return {
    coefficient: BigInt(digits) * sign,
    scale: fraction.length,
  };
}

function parseOrZero(value: string): DecimalParts {
  return parseDecimal(value) ?? { coefficient: 0n, scale: 0 };
}

function align(left: DecimalParts, right: DecimalParts): [DecimalParts, DecimalParts] {
  const scale = Math.max(left.scale, right.scale);
  return [
    {
      coefficient: left.coefficient * powerOfTen(scale - left.scale),
      scale,
    },
    {
      coefficient: right.coefficient * powerOfTen(scale - right.scale),
      scale,
    },
  ];
}

function formatDecimal({ coefficient, scale }: DecimalParts): string {
  if (coefficient === 0n) {
    return "0";
  }

  const sign = coefficient < 0n ? "-" : "";
  const digits = (coefficient < 0n ? -coefficient : coefficient)
    .toString()
    .padStart(scale + 1, "0");

  if (scale === 0) {
    return `${sign}${digits}`;
  }

  const integer = digits.slice(0, -scale) || "0";
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return fraction ? `${sign}${integer}.${fraction}` : `${sign}${integer}`;
}

function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}
