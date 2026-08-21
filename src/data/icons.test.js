import { describe, expect, it } from "vitest";
import { assetPath, categories, icons } from "./icons.js";

describe("LBank business categories", () => {
  it("builds the Logo URL below the deployed site base path", () => {
    expect(assetPath("/wudibao888/", "brand", "lbank-design-logo", "png")).toBe(
      "/wudibao888/assets/brand/lbank-design-logo.png",
    );
  });

  it("assigns every icon to a supported business category", () => {
    expect(icons).toHaveLength(56);
    expect(icons.every((icon) => categories.includes(icon.category) && icon.category !== "All")).toBe(true);
  });

  it("places the new business icons in their intended categories", () => {
    const categoryById = Object.fromEntries(icons.map((icon) => [icon.id, icon.category]));

    expect(categoryById).toMatchObject({
      "rewards-box": "Campaigns",
      "fiat-exchange": "BuyCrypto",
      "yield-ring": "Earn",
      "growth-arrow": "Earn",
      "business-wallet": "BuyCrypto",
      "secure-vault": "Security",
      "liquidity-blocks": "Earn",
      "happy-token": "Campaigns",
      "eth-deposit": "BuyCrypto",
      "bonus-gift": "Campaigns",
      "market-growth": "Futures",
      "token-send": "BuyCrypto",
      "liquidity-wallet": "BuyCrypto",
    });
  });

  it("keeps every business category populated", () => {
    for (const category of categories.filter((item) => item !== "All")) {
      expect(icons.some((icon) => icon.category === category), category).toBe(true);
    }
  });
});
