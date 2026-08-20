import { describe, expect, it } from "vitest";
import { filterIcons, scatterStyle } from "./catalog.js";

const icons = [
  { id: "apple", name: "Apple", nameZh: "苹果", category: "Spot" },
  { id: "robot", name: "Robot", nameZh: "机器人", category: "CopyTrading" },
  { id: "key", name: "Key", nameZh: "钥匙", category: "Security" },
];

describe("filterIcons", () => {
  it("returns every icon when category is All and query is empty", () => {
    expect(filterIcons(icons, "All", "")).toEqual(icons);
  });

  it("filters by category", () => {
    expect(filterIcons(icons, "CopyTrading", "").map((icon) => icon.id)).toEqual(["robot"]);
  });

  it("searches English and Chinese names case-insensitively", () => {
    expect(filterIcons(icons, "All", "ROBo").map((icon) => icon.id)).toEqual(["robot"]);
    expect(filterIcons(icons, "All", "苹果").map((icon) => icon.id)).toEqual(["apple"]);
  });
});

describe("scatterStyle", () => {
  it("returns deterministic bounded placement values", () => {
    expect(scatterStyle(4, 30)).toEqual(scatterStyle(4, 30));
    const style = scatterStyle(4, 30);
    expect(style.x).toBeGreaterThanOrEqual(5);
    expect(style.x).toBeLessThanOrEqual(95);
    expect(style.y).toBeGreaterThanOrEqual(8);
    expect(style.y).toBeLessThanOrEqual(92);
    expect(style.size).toBeGreaterThanOrEqual(72);
    expect(style.size).toBeLessThanOrEqual(188);
  });

  it("does not reuse a scatter position for the current 56-icon catalog", () => {
    const positions = Array.from({ length: 56 }, (_, index) => {
      const style = scatterStyle(index, 56);
      return `${style.x}:${style.y}`;
    });

    expect(new Set(positions).size).toBe(56);
  });
});
