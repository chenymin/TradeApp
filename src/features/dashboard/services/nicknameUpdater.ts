import {
  validateNickname,
  type NicknameValidation,
} from "../domain/nickname";
import type { NicknameRepository } from "./nicknameRepository";

export function createNicknameUpdater({
  refreshProfile,
  repository,
}: {
  refreshProfile: () => Promise<void>;
  repository: NicknameRepository;
}) {
  return async function updateNickname({
    currentNickname,
    draft,
  }: {
    currentNickname: string | null;
    draft: string;
  }): Promise<NicknameValidation> {
    const validation = validateNickname(draft, currentNickname);

    if (!validation.ok) {
      return validation;
    }

    await repository.updateNickname(validation.value);
    await refreshProfile();
    return validation;
  };
}
