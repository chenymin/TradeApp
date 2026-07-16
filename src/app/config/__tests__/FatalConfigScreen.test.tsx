import { describe, expect, it } from "vitest";

import { renderElement, textContent } from "../../../test/renderElement";
import { FatalConfigScreen } from "../FatalConfigScreen";

describe("FatalConfigScreen", () => {
  it("shows missing public config keys without exposing secret guidance", () => {
    const tree = renderElement(
      <FatalConfigScreen
        invalidKeys={[]}
        missingKeys={[
          "EXPO_PUBLIC_PRIVY_APP_ID",
          "EXPO_PUBLIC_SUPABASE_URL",
        ]}
      />,
    );

    expect(textContent(tree)).toContain("Missing public configuration");
    expect(textContent(tree)).toContain("EXPO_PUBLIC_PRIVY_APP_ID");
    expect(textContent(tree)).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(textContent(tree)).not.toContain("service_role");
  });

  it("shows invalid public config keys without exposing rejected values", () => {
    const tree = renderElement(
      <FatalConfigScreen
        invalidKeys={["EXPO_PUBLIC_CHAIN_ID"]}
        missingKeys={[]}
      />,
    );

    expect(textContent(tree)).toContain("Unsupported public configuration");
    expect(textContent(tree)).toContain("EXPO_PUBLIC_CHAIN_ID");
    expect(textContent(tree)).not.toContain("56.0");
  });
});
