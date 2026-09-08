import { describe, expect, it } from "vitest";
import { resolveInitialUploadCategory, suggestUploadCategory } from "./categoryRouting.js";

describe("suggestUploadCategory", () => {
  it("routes security keywords", () => {
    expect(suggestUploadCategory("wallet-lock.png")).toBe("Security");
  });

  it("routes market keywords", () => {
    expect(suggestUploadCategory("spot-trade-chart.png")).toBe("Spot");
  });

  it("falls back to campaigns", () => {
    expect(suggestUploadCategory("abstract-shape.png")).toBe("Campaigns");
  });

  it("keeps a named category outside of All", () => {
    expect(resolveInitialUploadCategory("Earn", "spot-trade.png")).toBe("Earn");
  });

  it("uses the suggestion from All", () => {
    expect(resolveInitialUploadCategory("All", "wallet-lock.png")).toBe("Security");
  });
});
