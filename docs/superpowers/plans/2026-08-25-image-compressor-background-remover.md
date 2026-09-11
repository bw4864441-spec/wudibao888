# L-Design 60×60 图片压缩与去背景工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建并公开发布一个浏览器本地运行的单页图片工具，将单张图片生成成 60×60 像素、小于 10KB，并为 PNG 提供纯色背景移除。

**Architecture:** React 负责单页交互和可访问状态，独立的 `src/lib/imageProcessor.js` 负责可测试的像素算法与浏览器 Canvas 编码。文件只在浏览器内解码和处理；无上传请求、服务端存储或外部 API。

**Tech Stack:** React 19、Vite 6、浏览器 Canvas/ImageBitmap/Blob API、Vitest、OpenAI Sites Worker 构建。

## Global Constraints

- 输出尺寸固定为 60×60 像素。
- 下载文件必须小于 10,240 字节，否则禁止下载并显示原因。
- 接受 PNG、JPG、JPEG 和 WebP；只有 PNG 显示去背景控制。
- 去背景面向纯色或近纯色背景，不实现 AI 语义抠图。
- 图片保持比例，以 `contain` 方式居中，不拉伸、不裁切主体。
- 所有处理在浏览器本地完成，不上传、不存储图片。
- 品牌图片 `public/assets/brand/lbank-design-logo.png` 仅用于圆形品牌标记，名称单独显示为 `L-Design`。
- 主操作和选中状态使用 `#FFDB00`。
- 保持 `.openai/hosting.json`、`worker/index.js`、`scripts/prepare-sites-build.mjs` 和 `tests/sites-worker.test.mjs` 完整可用。
- 不修改或提交当前工作树中与本功能无关的 `src/data/icons.js` 和 `src/data/icons.test.js` 更改。

---

## File Structure

- Create `src/lib/imageProcessor.js`: 文件校验、背景颜色采样、边缘连通抠图、60×60 缩放、Blob 编码和体积限制。
- Create `src/lib/imageProcessor.test.js`: 覆盖纯函数的格式校验、背景估算、连通区域和编码候选策略。
- Replace `src/Prototype.jsx`: 单页工具结构、文件生命周期、处理状态、预览和下载。
- Replace `src/prototype.css`: 工具专属响应式视觉、棋盘格预览、拖拽和可访问状态。
- Modify `index.html`: 网站标题、描述和分享元信息。
- Preserve `src/App.jsx`, `src/main.jsx`, `src/styles.css` and Sites handoff files unless验证发现兼容性问题。

---

### Task 1: 可测试的图片规则与背景像素算法

**Files:**
- Create: `src/lib/imageProcessor.js`
- Create: `src/lib/imageProcessor.test.js`

**Interfaces:**
- Produces: `SUPPORTED_TYPES: Set<string>`
- Produces: `validateImageFile(file: { type: string }): { ok: true } | { ok: false, message: string }`
- Produces: `estimateCornerBackground(data: Uint8ClampedArray, width: number, height: number): { r: number, g: number, b: number, confidence: number }`
- Produces: `removeConnectedBackground(imageData: ImageDataLike, background: RGB, tolerance: number): ImageDataLike`
- Produces: `getContainRect(sourceWidth: number, sourceHeight: number, targetSize?: number): { x: number, y: number, width: number, height: number }`

- [ ] **Step 1: Write failing tests for validation, contain sizing, corner sampling and connected clearing**

```js
import { describe, expect, it } from "vitest";
import {
  estimateCornerBackground,
  getContainRect,
  removeConnectedBackground,
  validateImageFile,
} from "./imageProcessor.js";

describe("validateImageFile", () => {
  it("accepts PNG, JPEG and WebP and rejects other files", () => {
    expect(validateImageFile({ type: "image/png" }).ok).toBe(true);
    expect(validateImageFile({ type: "image/jpeg" }).ok).toBe(true);
    expect(validateImageFile({ type: "image/webp" }).ok).toBe(true);
    expect(validateImageFile({ type: "image/svg+xml" })).toEqual({
      ok: false,
      message: "仅支持 PNG、JPG、JPEG 或 WebP 图片。",
    });
  });
});

describe("getContainRect", () => {
  it("centers a landscape image in a 60 square without stretching", () => {
    expect(getContainRect(120, 60)).toEqual({ x: 0, y: 15, width: 60, height: 30 });
  });
});

describe("background removal", () => {
  it("estimates a uniform corner color with high confidence", () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    expect(estimateCornerBackground(pixels, 4, 4)).toMatchObject({ r: 255, g: 255, b: 255 });
    expect(estimateCornerBackground(pixels, 4, 4).confidence).toBeGreaterThan(0.9);
  });

  it("clears edge-connected background but preserves an enclosed matching pixel", () => {
    const rgba = new Uint8ClampedArray([
      255,255,255,255, 255,255,255,255, 255,255,255,255,
      255,255,255,255,   0,  0,  0,255, 255,255,255,255,
      255,255,255,255, 255,255,255,255, 255,255,255,255,
    ]);
    const result = removeConnectedBackground({ data: rgba, width: 3, height: 3 }, { r: 255, g: 255, b: 255 }, 12);
    expect(result.data[3]).toBe(0);
    expect(result.data[19]).toBe(255);
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: FAIL because `src/lib/imageProcessor.js` does not exist or exports are missing.

- [ ] **Step 3: Implement validation, contain geometry, corner sampling and edge flood-fill**

Implementation requirements:

```js
export const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function getContainRect(sourceWidth, sourceHeight, targetSize = 60) {
  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  return { x: Math.round((targetSize - width) / 2), y: Math.round((targetSize - height) / 2), width, height };
}
```

Use four corner sample blocks sized `max(1, min(8, floor(min(width,height)/6)))`; compute their median RGB and a confidence based on the share of samples within distance 24 of the median. `removeConnectedBackground` must use a queue starting at all edge pixels, 4-way adjacency and a visited byte array. Pixels under `tolerance` become alpha 0; pixels from `tolerance` to `tolerance + 18` receive a proportional alpha for feathering. Do not clear non-connected interior pixels.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: PASS with all Task 1 assertions successful.

- [ ] **Step 5: Commit Task 1 only**

```bash
git add src/lib/imageProcessor.js src/lib/imageProcessor.test.js
git commit -m "feat: add local image processing rules"
```

---

### Task 2: Canvas 缩放与小于 10KB 编码管线

**Files:**
- Modify: `src/lib/imageProcessor.js`
- Modify: `src/lib/imageProcessor.test.js`

**Interfaces:**
- Consumes: `getContainRect`, `removeConnectedBackground`, `estimateCornerBackground`
- Produces: `selectEncodingCandidates(hasTransparency: boolean): Array<{ type: string, qualities: number[] }>`
- Produces: `processImage(file: File, options: { removeBackground: boolean, tolerance: number }): Promise<{ blob: Blob, url: string, width: 60, height: 60, type: string, bytes: number, backgroundConfidence: number | null }>`
- Produces: `revokeProcessedImage(result): void`

- [ ] **Step 1: Add failing candidate-order tests**

```js
import { selectEncodingCandidates } from "./imageProcessor.js";

it("prefers transparency-safe encodings when alpha is present", () => {
  expect(selectEncodingCandidates(true).map((item) => item.type)).toEqual(["image/png", "image/webp"]);
});

it("may use JPEG for opaque images", () => {
  expect(selectEncodingCandidates(false).map((item) => item.type)).toEqual(["image/png", "image/webp", "image/jpeg"]);
});
```

- [ ] **Step 2: Run focused tests and verify the new assertions fail**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: FAIL because `selectEncodingCandidates` is not exported.

- [ ] **Step 3: Implement browser processing and byte-checked encoding**

Implementation requirements:

- Decode with `createImageBitmap(file)` and always call `bitmap.close()` in `finally`.
- Draw to a source canvas, optionally remove PNG background, then draw to a transparent 60×60 target canvas using `imageSmoothingEnabled = true` and `imageSmoothingQuality = "high"`.
- For source dimensions above 240 pixels, shrink through an intermediate canvas no larger than 240×240 before the final 60×60 draw.
- Implement a Promise wrapper around `canvas.toBlob` and reject if it returns `null`.
- Candidate qualities: WebP `[0.92, 0.82, 0.72, 0.6, 0.48, 0.36]`; JPEG `[0.9, 0.8, 0.7, 0.58, 0.46, 0.34]`; PNG uses one lossless attempt.
- Accept the first Blob with `blob.size < 10240`; otherwise throw `new Error("无法将这张图片压缩到 10KB 以下。")`.
- Return a `URL.createObjectURL(blob)` and expose `revokeProcessedImage` to release it.

- [ ] **Step 4: Run all unit tests**

Run: `npm test`

Expected: PASS, including existing catalog/icon tests and the new processing tests.

- [ ] **Step 5: Commit Task 2 only**

```bash
git add src/lib/imageProcessor.js src/lib/imageProcessor.test.js
git commit -m "feat: encode 60px images under 10kb"
```

---

### Task 3: React 上传、预览、控制与下载体验

**Files:**
- Replace: `src/Prototype.jsx`

**Interfaces:**
- Consumes: `validateImageFile`, `processImage`, `revokeProcessedImage`
- Produces: accessible single-page UI with states `idle | processing | ready | error`

- [ ] **Step 1: Add a minimal UI state test seam**

Export these pure helpers from `src/Prototype.jsx` and test them in `src/lib/imageProcessor.test.js`:

```js
export function isPngFile(file) {
  return file?.type === "image/png";
}

export function formatBytes(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
```

Assertions:

```js
expect(isPngFile({ type: "image/png" })).toBe(true);
expect(isPngFile({ type: "image/jpeg" })).toBe(false);
expect(formatBytes(9216)).toBe("9.0 KB");
```

- [ ] **Step 2: Run focused test and verify helper exports fail**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: FAIL because the new helpers are not exported from `Prototype.jsx`.

- [ ] **Step 3: Replace the icon catalog with the complete image tool UI**

The component must include:

- Header brand mark with logo image inside a circular black element and separate `L-Design` text.
- Hero copy: `60 × 60，刚刚好。` and `把图片拖进来，自动生成小于 10KB 的标准图片。`.
- Keyboard-operable dropzone with hidden file input, click, Enter/Space, `dragenter`, `dragover`, `dragleave` and `drop` handling.
- Accepted format hint and local-processing privacy note.
- Original and result cards using object URLs; result uses a checkerboard background.
- PNG-only background switch and range input with values 8–80, default 28.
- Result metadata for `60 × 60 px`, MIME-derived format and actual bytes.
- Warning when `backgroundConfidence < 0.72` and background removal is enabled.
- Download button enabled only in `ready` state and using a sanitized original basename plus `-60x60` extension.
- Re-select button and error recovery.
- Effect cleanup that revokes both source and result object URLs without revoking the current URL prematurely.
- An `aria-live="polite"` status region and visible focus styles.

When file, background toggle or tolerance changes, use a request sequence number so stale async results cannot replace the latest result. Debounce tolerance reprocessing by 120ms.

- [ ] **Step 4: Run all unit tests**

Run: `npm test`

Expected: PASS with helper assertions and processing tests.

- [ ] **Step 5: Commit Task 3 only**

```bash
git add src/Prototype.jsx src/lib/imageProcessor.test.js
git commit -m "feat: build image compressor interface"
```

---

### Task 4: L-Design 视觉、响应式和页面元信息

**Files:**
- Replace: `src/prototype.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: semantic class names from `Prototype.jsx`
- Produces: desktop two-column workspace, stacked mobile layout, brand-compliant metadata

- [ ] **Step 1: Apply the visual system**

CSS requirements:

- Use `#0A0A0A`, white and neutral grays as surfaces; define `--accent: #FFDB00`.
- Build a 12-column desktop composition with a compact brand header, editorial headline and bordered workspace.
- Use one-pixel dividers, restrained 10–16px radii and no generic gradient backgrounds.
- The dropzone must visibly change on drag-over, hover and keyboard focus.
- Preview cards must keep stable aspect ratios and use a CSS checkerboard only for transparent output.
- Primary download button is `#FFDB00` with dark text; disabled state remains legible.
- Range input thumb and switch selected state use the accent.
- At `max-width: 760px`, stack preview cards and controls, keep 44px touch targets and prevent horizontal overflow.
- Honor `prefers-reduced-motion` by disabling nonessential transitions.

- [ ] **Step 2: Update document metadata**

Set:

```html
<title>L-Design 图片压缩工具｜60×60 小于 10KB</title>
<meta name="description" content="免费将图片生成成 60×60 像素并压缩到 10KB 以下，PNG 还可本地去除纯色背景。图片不上传。" />
<meta property="og:title" content="L-Design 图片压缩工具" />
<meta property="og:description" content="60×60、小于 10KB，PNG 可去除纯色背景。全部在浏览器本地完成。" />
```

- [ ] **Step 3: Start the development server and verify the route responds**

Run: `npm run dev -- --host 0.0.0.0`

Then request the exact Local URL printed by Vite with a lightweight HTTP request. Expected: HTTP success and no blocking compile error.

- [ ] **Step 4: Open the first meaningful preview in the in-app browser**

Open the exact Local URL once, reuse the same tab, and check only for blocking rendering problems unless explicit browser QA is requested.

- [ ] **Step 5: Commit Task 4 only**

```bash
git add src/prototype.css index.html
git commit -m "style: finish responsive image tool"
```

---

### Task 5: Build、Sites 验证与公开发布

**Files:**
- Verify: `.openai/hosting.json`
- Verify: `worker/index.js`
- Verify: `scripts/prepare-sites-build.mjs`
- Verify: `tests/sites-worker.test.mjs`
- Generated: `dist/client/index.html`
- Generated: `dist/server/index.js`
- Generated: `dist/.openai/hosting.json`

**Interfaces:**
- Consumes: completed source from Tasks 1–4
- Produces: validated Sites archive and public deployment URL

- [ ] **Step 1: Run fresh full verification**

Run in order:

```bash
npm test
npm run build
npm run test:sites
```

Expected: every command exits 0; build leaves `dist/client/index.html`, `dist/server/index.js` and `dist/.openai/hosting.json`.

- [ ] **Step 2: Verify the output contract and dirty-tree scope**

Run:

```bash
test -f dist/client/index.html
test -f dist/server/index.js
test -f dist/.openai/hosting.json
git status --short
```

Expected: all `test -f` checks exit 0. Confirm the unrelated pre-existing `src/data/icons.js` and `src/data/icons.test.js` changes remain untouched and excluded from feature commits.

- [ ] **Step 3: Publish the validated source through Sites**

Follow `sites-hosting`: reuse or create the Site project, commit the exact validated feature source, package the build with the Sites helper, save one version, request the required public-access approval, deploy, and poll until deployment reports `succeeded`.

- [ ] **Step 4: Open the deployed URL in the existing preview tab**

Reuse the local preview tab and navigate it to the exact deployed URL.

- [ ] **Step 5: Report the public URL and supported workflow**

State only the public URL and the user-visible capabilities: drag/drop, 60×60 generation, under-10KB status, PNG background removal and local privacy.

