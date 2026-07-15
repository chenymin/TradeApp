export type CommissionAmountInput = {
  goldenBonusSettled: unknown;
  goldenBonusUsdt: unknown;
  kolBonusSettled: unknown;
  kolBonusUsdt: unknown;
  pendingUsdt: unknown;
  settledUsdt: unknown;
};

export function calculateCommissionAmounts(input: CommissionAmountInput) {
  const standardTotalUsdt = addDecimals(
    normalizeUnsignedDecimal(input.pendingUsdt),
    normalizeUnsignedDecimal(input.settledUsdt),
  );
  const bonusTotalUsdt = [
    input.kolBonusUsdt,
    input.kolBonusSettled,
    input.goldenBonusUsdt,
    input.goldenBonusSettled,
  ].reduce<string>(
    (total, value) => addDecimals(total, normalizeUnsignedDecimal(value)),
    "0",
  );

  return {
    bonusTotalUsdt,
    confirmTotalUsdt: addDecimals(standardTotalUsdt, bonusTotalUsdt),
    standardTotalUsdt,
  };
}
import {
  addDecimals,
  normalizeUnsignedDecimal,
} from "../../../shared/domain/decimal";
