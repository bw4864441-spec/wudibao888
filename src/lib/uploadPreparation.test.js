import { describe, expect, it } from "vitest";
import { createUploadId, prepareUploadEntry } from "./uploadPreparation.js";

describe("upload preparation", () => {
  it("derives a category-bound PNG upload entry", async () => {
    const result = await prepareUploadEntry(
      { name: "ETH Deposit.webp", type: "image/webp" },
      "BuyCrypto",
      2,
      async () => ({ content: "png-content", dataUrl: "data:image/png;base64,png-content" }),
    );

    expect(result).toMatchObject({
      id: "eth-deposit-2",
      name: "ETH Deposit",
      nameZh: "ETH Deposit",
      category: "BuyCrypto",
      filename: "eth-deposit-2.png",
      content: "png-content",
    });
  });

  it("rejects unsupported file types", async () => {
    await expect(prepareUploadEntry({ name: "readme.svg", type: "image/svg+xml" }, "Earn", 0)).rejects.toThrow(
      "Unsupported image type",
    );
  });

  it("creates stable filename-derived upload ids", () => {
    expect(createUploadId("Earn & Grow!.png", 1)).toBe("earn-grow-1");
  });
});
