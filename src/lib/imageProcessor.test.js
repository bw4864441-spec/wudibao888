import { describe, expect, it, vi } from "vitest";
import {
  decodeImageSource,
  estimateCornerBackground,
  getContainRect,
  removeConnectedBackground,
  selectEncodingCandidates,
  shouldFillOutputBackground,
  validateImageFile,
} from "./imageProcessor.js";
import {
  formatBytes,
  formatInputType,
  isPngFile,
  outputFilename,
  shouldWarnLowConfidence,
} from "../Prototype.jsx";

describe("validateImageFile", () => {
  it.each([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/avif",
    "image/x-icon",
  ])("accepts %s raster input", (type) => {
    expect(validateImageFile({ type, name: "asset.bin" })).toEqual({ ok: true });
  });

  it.each(["sample.gif", "sample.bmp", "sample.avif", "sample.ico"])(
    "accepts %s when the operating system omits MIME",
    (name) => expect(validateImageFile({ type: "", name })).toEqual({ ok: true }),
  );

  it("rejects SVG and excluded image formats before decoding", () => {
    const rejected = { ok: false, message: "仅支持浏览器可读取的常见位图格式。" };
    expect(validateImageFile({ type: "image/svg+xml", name: "asset.svg" })).toEqual(rejected);
    expect(validateImageFile({ type: "image/heic", name: "asset.heic" })).toEqual(rejected);
    expect(validateImageFile({ type: "image/tiff", name: "asset.tiff" })).toEqual(rejected);
    expect(validateImageFile({ type: "text/plain", name: "asset.txt" })).toEqual(rejected);
  });
});

describe("decodeImageSource", () => {
  it("prefers createImageBitmap and closes the bitmap during cleanup", async () => {
    const close = vi.fn();
    const bitmap = { width: 320, height: 180, close };
    const decoded = await decodeImageSource({}, {
      createBitmap: vi.fn().mockResolvedValue(bitmap),
    });

    expect(decoded).toMatchObject({ source: bitmap, width: 320, height: 180 });
    decoded.cleanup();
    expect(close).toHaveBeenCalledOnce();
  });

  it("falls back to an HTML image and revokes its object URL", async () => {
    const revokeObjectURL = vi.fn();
    const image = { naturalWidth: 48, naturalHeight: 32, decode: vi.fn().mockResolvedValue() };
    const decoded = await decodeImageSource({}, {
      createBitmap: vi.fn().mockRejectedValue(new Error("unsupported")),
      createObjectURL: vi.fn(() => "blob:fallback"),
      revokeObjectURL,
      ImageCtor: vi.fn(function ImageCtor() { return image; }),
    });

    expect(image.src).toBe("blob:fallback");
    expect(decoded).toMatchObject({ source: image, width: 48, height: 32 });
    decoded.cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fallback");
  });

  it("returns the agreed message and cleans up when both decoders fail", async () => {
    const revokeObjectURL = vi.fn();
    const image = { decode: vi.fn().mockRejectedValue(new Error("bad image")) };

    await expect(decodeImageSource({}, {
      createBitmap: vi.fn().mockRejectedValue(new Error("unsupported")),
      createObjectURL: vi.fn(() => "blob:broken"),
      revokeObjectURL,
      ImageCtor: vi.fn(function ImageCtor() { return image; }),
    })).rejects.toThrow(
      "当前浏览器无法读取此图片格式，请换用 PNG、JPG、WebP、GIF、BMP 或 AVIF。",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:broken");
  });
});

describe("getContainRect", () => {
  it("centers a landscape image without stretching", () => {
    expect(getContainRect(120, 60)).toEqual({ x: 0, y: 15, width: 60, height: 30 });
  });

  it("centers a portrait image without stretching", () => {
    expect(getContainRect(60, 120)).toEqual({ x: 15, y: 0, width: 30, height: 60 });
  });
});

describe("estimateCornerBackground", () => {
  it("reports a uniform white border with high confidence", () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const result = estimateCornerBackground(pixels, 4, 4);

    expect(result).toMatchObject({ r: 255, g: 255, b: 255 });
    expect(result.confidence).toBeGreaterThan(0.9);
  });
});

describe("removeConnectedBackground", () => {
  it("clears edge-connected background while preserving the subject", () => {
    const rgba = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255,   0,   0,   0, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);

    const result = removeConnectedBackground(
      { data: rgba, width: 3, height: 3 },
      { r: 255, g: 255, b: 255 },
      12,
    );

    expect(result.data[3]).toBe(0);
    expect(result.data[19]).toBe(255);
  });

  it("does not clear a matching color enclosed by the subject", () => {
    const B = [0, 0, 0, 255];
    const W = [255, 255, 255, 255];
    const rgba = new Uint8ClampedArray([
      ...B, ...B, ...B, ...B, ...B,
      ...B, ...B, ...B, ...B, ...B,
      ...B, ...B, ...W, ...B, ...B,
      ...B, ...B, ...B, ...B, ...B,
      ...B, ...B, ...B, ...B, ...B,
    ]);

    const result = removeConnectedBackground(
      { data: rgba, width: 5, height: 5 },
      { r: 255, g: 255, b: 255 },
      12,
    );

    expect(result.data[(2 * 5 + 2) * 4 + 3]).toBe(255);
  });
});

describe("selectEncodingCandidates", () => {
  it("uses only PNG when PNG output is forced", () => {
    expect(selectEncodingCandidates(false, { forcePng: true })).toEqual([
      { type: "image/png", qualities: [undefined] },
    ]);
    expect(selectEncodingCandidates(true, { forcePng: true })).toEqual([
      { type: "image/png", qualities: [undefined] },
    ]);
  });

  it("preserves alpha by excluding JPEG when transparency is present", () => {
    expect(selectEncodingCandidates(true).map((candidate) => candidate.type)).toEqual([
      "image/png",
      "image/webp",
    ]);
  });

  it("adds JPEG as a final fallback for opaque output", () => {
    expect(selectEncodingCandidates(false).map((candidate) => candidate.type)).toEqual([
      "image/png",
      "image/webp",
      "image/jpeg",
    ]);
  });
});

describe("shouldFillOutputBackground", () => {
  it("keeps a transparent WebP target canvas transparent", () => {
    expect(shouldFillOutputBackground(true)).toBe(false);
    expect(shouldFillOutputBackground(false)).toBe(true);
  });
});

describe("image tool display helpers", () => {
  it("labels newly accepted image formats and falls back to the extension", () => {
    expect(formatInputType({ type: "image/gif", name: "motion.gif" })).toBe("GIF");
    expect(formatInputType({ type: "image/avif", name: "photo.avif" })).toBe("AVIF");
    expect(formatInputType({ type: "image/x-icon", name: "favicon.ico" })).toBe("ICO");
    expect(formatInputType({ type: "", name: "legacy.bmp" })).toBe("BMP");
  });

  it("downloads a converted WebP with a PNG extension", () => {
    expect(outputFilename({ name: "产品 主图.webp" }, "image/png"))
      .toBe("产品-主图-60x60.png");
  });

  it("keeps automatic WebP output labeled as WebP", () => {
    expect(outputFilename({ name: "asset.jpg" }, "image/webp"))
      .toBe("asset-60x60.webp");
  });

  it("shows background removal only for PNG input", () => {
    expect(isPngFile({ type: "image/png", name: "asset.png" })).toBe(true);
    expect(isPngFile({ type: "image/gif", name: "asset.gif" })).toBe(false);
    expect(isPngFile({ type: "", name: "asset.png" })).toBe(false);
  });

  it("formats result bytes for the size summary", () => {
    expect(formatBytes(986)).toBe("986 B");
    expect(formatBytes(9216)).toBe("9.0 KB");
  });

  it("does not read confidence while a new result is processing", () => {
    expect(shouldWarnLowConfidence(true, null)).toBe(false);
    expect(shouldWarnLowConfidence(true, { backgroundConfidence: 0.5 })).toBe(true);
    expect(shouldWarnLowConfidence(false, { backgroundConfidence: 0.5 })).toBe(false);
  });
});
