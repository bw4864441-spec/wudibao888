import { describe, expect, it } from "vitest";
import {
  estimateCornerBackground,
  getContainRect,
  removeConnectedBackground,
  selectEncodingCandidates,
  validateImageFile,
} from "./imageProcessor.js";
import { formatBytes, isPngFile, shouldWarnLowConfidence } from "../Prototype.jsx";

describe("validateImageFile", () => {
  it("accepts supported raster images", () => {
    expect(validateImageFile({ type: "image/png" })).toEqual({ ok: true });
    expect(validateImageFile({ type: "image/jpeg" })).toEqual({ ok: true });
    expect(validateImageFile({ type: "image/webp" })).toEqual({ ok: true });
  });

  it("rejects unsupported files before decoding", () => {
    expect(validateImageFile({ type: "image/svg+xml" })).toEqual({
      ok: false,
      message: "仅支持 PNG、JPG、JPEG 或 WebP 图片。",
    });
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

describe("image tool display helpers", () => {
  it("shows background removal only for PNG input", () => {
    expect(isPngFile({ type: "image/png" })).toBe(true);
    expect(isPngFile({ type: "image/jpeg" })).toBe(false);
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
