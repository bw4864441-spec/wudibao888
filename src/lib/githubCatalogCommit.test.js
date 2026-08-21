import { describe, expect, it, vi } from "vitest";
import { createSharedCatalogCommit } from "./githubCatalogCommit.js";

function jsonResponse(payload, ok = true) {
  return { ok, json: async () => payload };
}

describe("GitHub shared catalog commit", () => {
  it("adds every image and the updated catalog to one replacement tree", async () => {
    const entry = {
      id: "entry",
      filename: "entry.png",
      content: "image-content",
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "head" } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: "base-tree" } }))
      .mockResolvedValueOnce(jsonResponse({ sha: "image-blob" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "catalog-blob" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "next-tree" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "next-commit" }))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(createSharedCatalogCommit({
      token: "token",
      catalog: { icons: [] },
      entries: [entry],
      fetchImpl,
    })).resolves.toEqual({ commitSha: "next-commit" });

    expect(JSON.parse(fetchImpl.mock.calls[4][1].body).tree).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "public/assets/user-icons/entry.png", sha: "image-blob" }),
      expect.objectContaining({ path: "public/catalog.json", sha: "catalog-blob" }),
    ]));
  });
});
