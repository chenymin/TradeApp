import * as Linking from "expo-linking";

import { createExternalLinkAdapter } from "./linkingAdapter";

export function createDefaultExternalLinkAdapter() {
  return createExternalLinkAdapter(Linking);
}
