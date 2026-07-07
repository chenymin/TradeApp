import { useAuthActionsContext } from "../../../app/providers/AuthProvider";

export function useAuthActions() {
  return useAuthActionsContext();
}
