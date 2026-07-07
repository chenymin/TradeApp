import { useAuthStateContext } from "../../../app/providers/AuthProvider";

export function useAuthState() {
  return useAuthStateContext();
}
