export const NICKNAME_MAX_CODE_POINTS = 254;

export type NicknameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "blank" | "too_long" | "unchanged" };

export function validateNickname(
  draft: string,
  currentNickname: string | null,
): NicknameValidation {
  const value = draft.trim();

  if ([...value].length === 0) {
    return { ok: false, reason: "blank" };
  }

  if ([...value].length > NICKNAME_MAX_CODE_POINTS) {
    return { ok: false, reason: "too_long" };
  }

  if (value === (currentNickname ?? "")) {
    return { ok: false, reason: "unchanged" };
  }

  return { ok: true, value };
}
