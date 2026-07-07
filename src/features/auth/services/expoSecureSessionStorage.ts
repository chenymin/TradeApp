import * as SecureStore from "expo-secure-store";

import type { SecureSessionStorage } from "./sessionStorage";

export const expoSecureSessionStorage: SecureSessionStorage = {
  deleteItemAsync: SecureStore.deleteItemAsync,
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: SecureStore.setItemAsync,
};
