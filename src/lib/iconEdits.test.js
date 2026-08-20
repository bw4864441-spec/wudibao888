import { describe, expect, it } from "vitest";
import { applyIconEdits } from "./iconEdits.js";

const catalog = [
  { id: "apple", name: "Apple", src: "/apple.png" },
  { id: "robot", name: "Robot", src: "/robot.png" },
];

describe("applyIconEdits", () => {
  it("removes deleted icons", () => {
    expect(applyIconEdits(catalog, ["apple"], {}).map((icon) => icon.id)).toEqual(["robot"]);
  });

  it("replaces an icon source without changing its metadata", () => {
    expect(applyIconEdits(catalog, [], { robot: "blob:replacement" })).toEqual([
      catalog[0],
      { ...catalog[1], src: "blob:replacement", replaced: true },
    ]);
  });
});
