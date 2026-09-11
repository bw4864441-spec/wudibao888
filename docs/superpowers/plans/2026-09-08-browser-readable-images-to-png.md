# Browser-Readable Images to PNG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload common browser-decodable raster formats and produce a real 60×60 PNG under 10KB, while retaining the existing optional automatic-compression mode and PNG-only background removal.

**Architecture:** Replace the MIME whitelist with guarded raster validation, then add an exported `decodeImageSource()` boundary that first tries `createImageBitmap` and falls back to `HTMLImageElement`. Keep the existing Canvas resize, transparency, background-removal, and encoding pipeline; the UI broadens its picker copy and enables PNG conversion by default for every newly accepted upload.

**Tech Stack:** React 19, Vite 6, browser Canvas/File/Object URL APIs, Vitest 4, OpenAI Sites static hosting and Worker handoff.

## Global Constraints

- Output is exactly 60×60 pixels and strictly smaller than 10KB (`10240` bytes).
- Supported input scope is PNG, JPG/JPEG, WebP, GIF, BMP, AVIF, and ICO when the current browser can decode them.
- SVG, HEIC/HEIF, TIFF, and camera RAW are excluded.
- Animated inputs produce one static PNG frame.
- Preserve input alpha; do not fill transparent output with white.
- Background removal remains available only when the original input MIME is `image/png`.
- Browser decode failures use exactly: `当前浏览器无法读取此图片格式，请换用 PNG、JPG、WebP、GIF、BMP 或 AVIF。`
- Preserve `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs`.
- Re-publish the existing Sites project; do not create a new public address.

---

## File Structure

- Modify `src/lib/imageProcessor.js`: raster-file validation, dual-path browser decoder, decoder cleanup, and integration with the existing Canvas pipeline.
- Modify `src/lib/imageProcessor.test.js`: validation, decoder strategy, cleanup, PNG-output selection, filename, and PNG-only background-removal regression tests.
- Modify `src/Prototype.jsx`: expanded file-picker acceptance and copy, readable input format labels, exact decoder error display, and PNG-by-default upload state.
- No CSS, dependency, Worker, or hosting-manifest changes are required.

### Task 1: Accept Common Raster Files and Add a Testable Browser Decoder

**Files:**
- Modify: `src/lib/imageProcessor.js:1-11,126-195`
- Test: `src/lib/imageProcessor.test.js:1-27`

**Interfaces:**
- Produces: `validateImageFile(file: { type?: string, name?: string } | null): { ok: true } | { ok: false, message: string }`
- Produces: `decodeImageSource(file: Blob, adapters?: DecodeAdapters): Promise<{ source: CanvasImageSource, width: number, height: number, cleanup: () => void }>`
- `DecodeAdapters` contains optional `createBitmap`, `createObjectURL`, `revokeObjectURL`, and `ImageCtor` functions/classes for deterministic unit tests.
- Consumes: native `createImageBitmap`, `URL.createObjectURL`, `URL.revokeObjectURL`, and `Image` when adapters are omitted.

- [ ] **Step 1: Write failing validation and decoder tests**

Add `decodeImageSource` to the test import, expand the validation cases, and add these decoder tests:

```js
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

describe("validateImageFile", () => {
  it.each([
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "image/bmp", "image/avif", "image/x-icon",
  ])("accepts %s raster input", (type) => {
    expect(validateImageFile({ type, name: "asset.bin" })).toEqual({ ok: true });
  });

  it.each(["sample.gif", "sample.bmp", "sample.avif", "sample.ico"])(
    "accepts %s when the operating system omits MIME",
    (name) => expect(validateImageFile({ type: "", name })).toEqual({ ok: true }),
  );

  it("rejects SVG and non-image files before decoding", () => {
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
      ImageCtor: vi.fn(() => image),
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
      ImageCtor: vi.fn(() => image),
    })).rejects.toThrow(
      "当前浏览器无法读取此图片格式，请换用 PNG、JPG、WebP、GIF、BMP 或 AVIF。",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:broken");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: FAIL because `decodeImageSource` is not exported, GIF/BMP/AVIF/ICO are rejected, and the validation message does not match.

- [ ] **Step 3: Implement validation and the dual-path decoder**

Replace the fixed whitelist at the top of `imageProcessor.js` and add the decoder before `processImage`:

```js
const KNOWN_RASTER_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "ico",
]);
const KNOWN_RASTER_MIME_TYPES = new Set([
  "image/png", "image/jpeg", "image/pjpeg", "image/webp", "image/gif",
  "image/bmp", "image/x-ms-bmp", "image/avif", "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const UNSUPPORTED_MESSAGE = "仅支持浏览器可读取的常见位图格式。";
export const BROWSER_DECODE_MESSAGE =
  "当前浏览器无法读取此图片格式，请换用 PNG、JPG、WebP、GIF、BMP 或 AVIF。";

function fileExtension(name = "") {
  return name.toLowerCase().match(/\.([^.]+)$/)?.[1] || "";
}

export function validateImageFile(file) {
  if (!file) return { ok: false, message: UNSUPPORTED_MESSAGE };
  const hasKnownMime = KNOWN_RASTER_MIME_TYPES.has(file.type);
  const hasKnownExtension = KNOWN_RASTER_EXTENSIONS.has(fileExtension(file.name));
  return hasKnownMime || (!file.type && hasKnownExtension)
    ? { ok: true }
    : { ok: false, message: UNSUPPORTED_MESSAGE };
}

function waitForImageLoad(image) {
  if (typeof image.decode === "function") return image.decode();
  return new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error(BROWSER_DECODE_MESSAGE));
  });
}

export async function decodeImageSource(file, adapters = {}) {
  const createBitmap = adapters.createBitmap ?? globalThis.createImageBitmap;
  if (typeof createBitmap === "function") {
    try {
      const bitmap = await createBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Continue to the browser image-element decoder.
    }
  }

  const createObjectURL = adapters.createObjectURL ?? URL.createObjectURL.bind(URL);
  const revokeObjectURL = adapters.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
  const ImageCtor = adapters.ImageCtor ?? globalThis.Image;
  let objectUrl;
  try {
    if (typeof ImageCtor !== "function") throw new Error(BROWSER_DECODE_MESSAGE);
    objectUrl = createObjectURL(file);
    const image = new ImageCtor();
    image.src = objectUrl;
    await waitForImageLoad(image);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error(BROWSER_DECODE_MESSAGE);
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => revokeObjectURL(objectUrl),
    };
  } catch {
    if (objectUrl) revokeObjectURL(objectUrl);
    throw new Error(BROWSER_DECODE_MESSAGE);
  }
}
```

- [ ] **Step 4: Integrate the decoder into `processImage`**

Replace the local `bitmap` lifecycle with the unified decoded source. Apply these exact substitutions inside `processImage`:

```js
// Declaration
let decoded;

// Decode and draw
decoded = await decodeImageSource(file);
sourceCanvas = createCanvas(decoded.width, decoded.height);
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
sourceContext.drawImage(decoded.source, 0, 0);

// Read pixels
let sourcePixels = sourceContext.getImageData(0, 0, decoded.width, decoded.height);

// Estimate PNG background
const background = estimateCornerBackground(
  sourcePixels.data,
  decoded.width,
  decoded.height,
);

// Finally block
decoded?.cleanup();
```

The catch block must pass through `BROWSER_DECODE_MESSAGE` and existing named processing errors unchanged. The fallback itself owns decode-error normalization, so unknown Canvas/encoding errors may retain the existing damaged-image fallback behavior in the UI.

- [ ] **Step 5: Run the focused test and confirm GREEN**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: all `imageProcessor.test.js` tests PASS, including preferred decode, fallback decode, and cleanup.

- [ ] **Step 6: Commit the decoder boundary**

```bash
git add src/lib/imageProcessor.js src/lib/imageProcessor.test.js
git commit -m "feat: decode common browser image formats"
```

### Task 2: Make PNG Conversion the Default Upload Experience

**Files:**
- Modify: `src/Prototype.jsx:18-38,69,98-123,197-226`
- Test: `src/lib/imageProcessor.test.js:112-144`

**Interfaces:**
- Consumes: `validateImageFile()` and `processImage()` from Task 1.
- Produces: `formatInputType(file: { type?: string, name?: string }): string` for metadata display.
- Preserves: `isPngFile()`, `outputFilename()`, `formatBytes()`, and `shouldWarnLowConfidence()`.

- [ ] **Step 1: Write failing UI-helper regression tests**

Export `formatInputType` from `Prototype.jsx`, import it in the test, and add:

```js
it("labels newly accepted image formats and falls back to the extension", () => {
  expect(formatInputType({ type: "image/gif", name: "motion.gif" })).toBe("GIF");
  expect(formatInputType({ type: "image/avif", name: "photo.avif" })).toBe("AVIF");
  expect(formatInputType({ type: "image/x-icon", name: "favicon.ico" })).toBe("ICO");
  expect(formatInputType({ type: "", name: "legacy.bmp" })).toBe("BMP");
});

it("keeps background removal limited to original PNG MIME input", () => {
  expect(isPngFile({ type: "image/png", name: "asset.png" })).toBe(true);
  expect(isPngFile({ type: "image/gif", name: "asset.gif" })).toBe(false);
  expect(isPngFile({ type: "", name: "asset.png" })).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: FAIL because `formatInputType` is not exported.

- [ ] **Step 3: Implement stable input format labels**

Replace the private `formatType` helper with:

```js
export function formatInputType(file) {
  const subtype = file?.type?.split("/")[1]?.toLowerCase();
  if (subtype === "jpeg") return "JPG";
  if (subtype === "x-icon" || subtype === "vnd.microsoft.icon") return "ICO";
  if (subtype) return subtype.toUpperCase();
  return file?.name?.match(/\.([^.]+)$/)?.[1]?.toUpperCase() || "—";
}

function formatType(type) {
  return formatInputType({ type });
}
```

Use `formatInputType(file)` for the original-file metadata; continue using `formatType(result.type)` for generated output.

- [ ] **Step 4: Broaden the picker and default PNG conversion on each upload**

Apply these exact UI changes:

```jsx
<input
  accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.ico"
  className="file-input"
  onChange={onInputChange}
  ref={inputRef}
  type="file"
/>
```

Change the hint to:

```jsx
<small>PNG / JPG / WebP / GIF / BMP / AVIF / ICO · 单张图片</small>
```

In `acceptFile`, replace `setForcePng(false)` with `setForcePng(true)`. Keep `reset()` setting it to `false`, because no conversion mode is selected before a file exists.

Add `BROWSER_DECODE_MESSAGE` to the imports and to `knownMessages` so the exact compatibility error reaches the user:

```js
const knownMessages = [
  BROWSER_DECODE_MESSAGE,
  "无法将这张图片压缩到 10KB 以下。",
  "无法将这张图片以 PNG 格式压缩到 10KB 以下。",
  "浏览器无法生成图片。",
];
```

- [ ] **Step 5: Run tests and the production build**

Run: `npm test`

Expected: all Vitest suites PASS.

Run: `npm run build`

Expected: Vite build succeeds and leaves `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

- [ ] **Step 6: Commit the upload experience**

```bash
git add src/Prototype.jsx src/lib/imageProcessor.test.js
git commit -m "feat: convert common image uploads to png"
```

### Task 3: Browser QA and Public Sites Update

**Files:**
- Verify only: `dist/client/index.html`
- Verify only: `dist/server/index.js`
- Verify only: `dist/.openai/hosting.json`
- Verify only: `tests/sites-worker.test.mjs`

**Interfaces:**
- Consumes: the completed UI and decoder pipeline from Tasks 1 and 2.
- Produces: an updated release of the existing public Sites project at `https://l-design-image-60x60.taamulsirisup.chatgpt.site/`.

- [ ] **Step 1: Run the complete automated verification suite**

Run: `npm test && npm run build && npm run test:sites`

Expected: all Vitest suites pass; build succeeds; Sites Worker tests pass.

- [ ] **Step 2: Verify required Sites artifacts**

Run:

```bash
test -f dist/client/index.html
test -f dist/server/index.js
test -f dist/.openai/hosting.json
```

Expected: all three commands exit with status `0`.

- [ ] **Step 3: Run the local server and verify the interface in the browser**

Run: `npm run dev -- --host 127.0.0.1`

Open `http://localhost:5173/` in the available browser. Verify the picker hint lists PNG/JPG/WebP/GIF/BMP/AVIF/ICO, upload at least one browser-supported non-PNG sample, and confirm:

- the PNG switch starts enabled;
- the output metadata says PNG;
- the output is 60×60 and below 10KB;
- the downloaded filename ends in `.png`;
- GIF produces a static frame;
- background removal is disabled for non-PNG inputs;
- an invalid or browser-undecodable file produces the specified Chinese error.

- [ ] **Step 4: Use the Sites hosting workflow to update the existing project**

Load and follow the `sites:sites-building` skill, then the `sites:sites-hosting` skill. Publish the verified `dist` output to existing project ID `appgprj_6a8e43b0ca8c81919c9f60c096d79922`; do not create another project or URL.

- [ ] **Step 5: Verify the public release**

Open `https://l-design-image-60x60.taamulsirisup.chatgpt.site/` and repeat a non-PNG upload smoke test. Confirm the response is the new release, PNG is the default output, and the downloaded file opens as a valid PNG.

- [ ] **Step 6: Check final repository state**

Run: `git status --short && git log -3 --oneline`

Expected: only the pre-existing untracked QA screenshots remain; the implementation and plan files are committed.
