# WebP 转 PNG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 L-Design 图片工具增加显式 PNG 输出模式，使 WebP、JPG、JPEG 和 PNG 均可生成真实的 60×60、低于 10KB 的 PNG 文件。

**Architecture:** React 界面增加 `forcePng` 状态，并把它作为图片处理选项传入现有 Canvas 管线。处理模块在强制 PNG 时收窄编码候选且使用专用超限错误；透明度判断继续决定是否填充白底，从而保留透明 WebP 的 alpha。

**Tech Stack:** React 19、Vite 6、浏览器 Canvas/ImageBitmap/Blob API、Vitest、OpenAI Sites。

## Global Constraints

- 输入支持单张 PNG、JPG、JPEG 和 WebP 图片。
- “转换为 PNG”开启后，输出 MIME 必须为 `image/png`，下载文件名必须以 `.png` 结尾。
- 输出尺寸固定为 60×60 像素，文件大小严格小于 10,240 字节。
- WebP 的透明区域必须保留；去背景仍只对 PNG 输入开放。
- 强制 PNG 失败时不得回退到 WebP 或 JPG。
- 所有图片处理必须在浏览器本地完成，不增加上传请求或外部 API。
- 复用当前页面结构和视觉；新增选中状态使用 `#FFDB00`。
- 保持 `.openai/hosting.json`、`worker/index.js`、`scripts/prepare-sites-build.mjs` 和 `tests/sites-worker.test.mjs` 完整可用。
- 不提交已有的 QA 截图文件或其他无关改动。

---

## File Structure

- Modify `src/lib/imageProcessor.js`: 接收 `forcePng`，选择强制 PNG 编码候选，保留透明输出并提供专用超限错误。
- Modify `src/lib/imageProcessor.test.js`: 测试强制 PNG 候选、透明画布策略、WebP 校验、文件名和 UI 状态辅助函数。
- Modify `src/Prototype.jsx`: 增加 PNG 输出开关、状态传递、重置、错误映射和 `.png` 下载文件名。
- Modify `src/prototype.css`: 为新增格式控制复用现有控制面板语言，并保持桌面/移动端布局。
- Verify only `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, `tests/sites-worker.test.mjs`: 不修改，仅验证 Sites 输出契约。

---

### Task 1: 强制 PNG 编码规则与透明度策略

**Files:**
- Modify: `src/lib/imageProcessor.js`
- Modify: `src/lib/imageProcessor.test.js`

**Interfaces:**
- Produces: `selectEncodingCandidates(hasTransparency: boolean, options?: { forcePng?: boolean }): Array<{ type: string, qualities: Array<number | undefined> }>`
- Produces: `shouldFillOutputBackground(hasTransparency: boolean): boolean`
- Extends: `processImage(file: File, options: { removeBackground?: boolean, tolerance?: number, forcePng?: boolean }): Promise<ProcessedImage>`
- `ProcessedImage`: `{ blob: Blob, url: string, width: 60, height: 60, type: string, bytes: number, backgroundConfidence: number | null }`

- [ ] **Step 1: Write failing tests for WebP input, forced candidates and alpha handling**

Add imports and assertions in `src/lib/imageProcessor.test.js`:

```js
import {
  selectEncodingCandidates,
  shouldFillOutputBackground,
  validateImageFile,
} from "./imageProcessor.js";

it("accepts WebP as a PNG conversion source", () => {
  expect(validateImageFile({ type: "image/webp" })).toEqual({ ok: true });
});

it("uses only PNG when PNG output is forced", () => {
  expect(selectEncodingCandidates(false, { forcePng: true })).toEqual([
    { type: "image/png", qualities: [undefined] },
  ]);
  expect(selectEncodingCandidates(true, { forcePng: true })).toEqual([
    { type: "image/png", qualities: [undefined] },
  ]);
});

it("keeps a transparent WebP target canvas transparent", () => {
  expect(shouldFillOutputBackground(true)).toBe(false);
  expect(shouldFillOutputBackground(false)).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: FAIL because `shouldFillOutputBackground` is missing and `selectEncodingCandidates` does not accept `forcePng`.

- [ ] **Step 3: Implement the minimal encoding policy**

Update `src/lib/imageProcessor.js`:

```js
export function selectEncodingCandidates(hasTransparency, { forcePng = false } = {}) {
  if (forcePng) return [{ type: "image/png", qualities: [undefined] }];

  const candidates = [
    { type: "image/png", qualities: [undefined] },
    { type: "image/webp", qualities: WEBP_QUALITIES },
  ];
  if (!hasTransparency) candidates.push({ type: "image/jpeg", qualities: JPEG_QUALITIES });
  return candidates;
}

export function shouldFillOutputBackground(hasTransparency) {
  return !hasTransparency;
}
```

Destructure `forcePng = false` inside `processImage`. Replace the white-fill condition with `shouldFillOutputBackground(sourceHasTransparency)`, and call `selectEncodingCandidates(outputHasTransparency, { forcePng })`.

When no candidate is below the limit, throw exactly:

```js
throw new Error(
  forcePng
    ? "无法将这张图片以 PNG 格式压缩到 10KB 以下。"
    : "无法将这张图片压缩到 10KB 以下。",
);
```

- [ ] **Step 4: Run the focused tests and verify pass**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: PASS, including unchanged automatic PNG/WebP/JPEG candidate tests.

- [ ] **Step 5: Commit the processing rule**

```bash
git add src/lib/imageProcessor.js src/lib/imageProcessor.test.js
git commit -m "feat: add forced png encoding"
```

---

### Task 2: PNG 转换控制与下载体验

**Files:**
- Modify: `src/Prototype.jsx`
- Modify: `src/lib/imageProcessor.test.js`
- Modify: `src/prototype.css`

**Interfaces:**
- Consumes: `processImage(file, { removeBackground, tolerance, forcePng })`
- Produces: `outputFilename(file: FileLike, type: string): string`
- Produces: UI state `forcePng: boolean`, default `false`

- [ ] **Step 1: Write failing tests for the PNG download contract**

Export `outputFilename` from `src/Prototype.jsx`, then add these tests before implementing the UI:

```js
import { outputFilename } from "../Prototype.jsx";

it("downloads a converted WebP with a PNG extension", () => {
  expect(outputFilename({ name: "产品 主图.webp" }, "image/png"))
    .toBe("产品-主图-60x60.png");
});

it("keeps automatic WebP output labeled as WebP", () => {
  expect(outputFilename({ name: "asset.jpg" }, "image/webp"))
    .toBe("asset-60x60.webp");
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/lib/imageProcessor.test.js`

Expected: FAIL because `outputFilename` is not exported.

- [ ] **Step 3: Add `forcePng` state and connect the processing flow**

In `src/Prototype.jsx`:

```jsx
const [forcePng, setForcePng] = useState(false);
```

- Pass `{ removeBackground, tolerance, forcePng }` to `processImage`.
- Add `forcePng` to the processing effect dependency list.
- Reset it to `false` in both `acceptFile` and `reset`.
- Export `outputFilename` without changing its sanitization behavior.
- Add `"无法将这张图片以 PNG 格式压缩到 10KB 以下。"` to the known error messages.

- [ ] **Step 4: Render the PNG output switch**

Add a format-control block above the existing PNG-only background controls:

```jsx
<div className="format-control">
  <div>
    <h2>输出格式</h2>
    <p>开启后将图片转换为 PNG</p>
  </div>
  <label className="switch-row">
    <span>转换为 PNG</span>
    <input
      checked={forcePng}
      onChange={(event) => setForcePng(event.target.checked)}
      type="checkbox"
    />
    <span className="switch" aria-hidden="true"><span /></span>
  </label>
</div>
```

Keep the current background-removal block visible only for PNG input. Add focused CSS for `.format-control` and the separator between format and background controls; reuse `.switch-row` and `.switch` instead of creating a second visual component. At the existing mobile breakpoint, stack copy and control without horizontal overflow and keep the switch hit target at least 44px.

- [ ] **Step 5: Run unit tests and the production build**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS and Vite build exits 0.

- [ ] **Step 6: Commit the UI behavior**

```bash
git add src/Prototype.jsx src/prototype.css src/lib/imageProcessor.test.js
git commit -m "feat: let uploads convert to png"
```

---

### Task 3: Browser QA、Sites 验证与公开更新

**Files:**
- Verify: `.openai/hosting.json`
- Verify: `worker/index.js`
- Verify: `scripts/prepare-sites-build.mjs`
- Verify: `tests/sites-worker.test.mjs`
- Generated: `dist/client/index.html`
- Generated: `dist/server/index.js`
- Generated: `dist/.openai/hosting.json`

**Interfaces:**
- Consumes: completed Tasks 1–2
- Produces: verified public deployment at the existing Sites URL

- [ ] **Step 1: Start the local server and open it in the in-app browser**

Run: `npm run dev -- --host 0.0.0.0`

Open the exact Vite URL printed by the command. Reuse one browser tab for all local checks.

- [ ] **Step 2: Perform the WebP conversion browser acceptance test**

Use a non-sensitive WebP fixture. Upload it, enable “转换为 PNG”, and verify from the visible result UI:

- status becomes “已完成”;
- output dimension is `60 × 60 px`;
- output format is `PNG`;
- output size is below `10 KB`;
- download filename ends in `-60x60.png` and the file opens.

Repeat with a transparent WebP fixture and confirm the checkerboard remains visible through transparent areas rather than showing a forced white square.

- [ ] **Step 3: Run fresh release verification**

Run in order:

```bash
npm test
npm run build
npm run test:sites
test -f dist/client/index.html
test -f dist/server/index.js
test -f dist/.openai/hosting.json
git status --short
```

Expected: every command exits 0. `git status --short` may list the pre-existing untracked QA screenshots, but no unrelated file may be staged or committed.

- [ ] **Step 4: Publish through Sites**

Invoke the `sites:sites-hosting` skill, reuse Sites project `appgprj_6a8e43b0ca8c81919c9f60c096d79922`, package the verified build, save a new version, deploy it with public access, and poll until the deployment reports `succeeded`.

- [ ] **Step 5: Verify and open the public deployment**

Navigate the existing browser tab to `https://l-design-image-60x60.taamulsirisup.chatgpt.site/`. Verify the “转换为 PNG” control is visible and mark the tab as a deliverable so it remains open for the user.

- [ ] **Step 6: Report completion**

Report the unchanged public URL, the WebP-to-PNG behavior, the 60×60 and 10KB guarantees, the test/build/Sites verification results, and any cases where a lossless PNG cannot satisfy the size limit.
