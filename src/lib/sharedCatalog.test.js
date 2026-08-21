import { describe, expect, it } from "vitest";
import { mergeSharedIcons, sharedCatalogUrl } from "./sharedCatalog.js";

describe("shared catalog", () => {
  it("merges shared entries without duplicating an existing icon id", () => {
    expect(mergeSharedIcons([{ id: "apple" }], [{ id: "apple" }, { id: "shared-1" }])).toEqual([
      { id: "apple" },
      { id: "shared-1" },
    ]);
  });

  it("uses the deployed base path for the public catalog", () => {
    expect(sharedCatalogUrl("/wudibao888/")).toBe("/wudibao888/catalog.json");
  });
});
