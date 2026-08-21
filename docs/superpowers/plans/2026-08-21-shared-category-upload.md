# Shared Category Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the deployed logo and let authorized administrators batch-upload icons to the selected category so published icons are visible to every visitor.

**Architecture:** Static icons remain bundled in `src/data/icons.js`; a deployable `public/catalog.json` supplies shared icons added by administrators. The React UI merges both sources. The upload modal holds a temporary GitHub token only in memory, prepares images in the browser, and sends one Git Data API commit that adds all image blobs and the updated shared catalog before GitHub Pages publishes it.

**Tech Stack:** React 19, Vite 6, Vitest 4, GitHub REST Git Data API, GitHub Pages.

## Global Constraints

- Use `import.meta.env.BASE_URL` for every public asset path, including the brand logo and shared catalog.
- Accept only PNG, JPEG, and WebP image files and encode them as optimized PNG files with a maximum edge of `720px`.
- Batch uploads are enabled only while a category other than `All` is selected.
- Keep the administrator token in React state only; never persist or log it.
- Commit all uploaded images and the catalog update together through one Git tree commit to `main`.
- The GitHub repository is `bw4864441-spec/wudibao888` and shared image files live in `public/assets/user-icons/`.

---

### Task 1: Fix Base-Path Asset Resolution

**Files:**
- Modify: `src/data/icons.js`
- Modify: `src/data/icons.test.js`
- Modify: `src/Prototype.jsx`
- Test: `src/data/icons.test.js`

**Interfaces:**
- Produces: `assetPath(basePath, folder, file, extension): string`
- Produces: `brandLogoSrc: string` in `Prototype.jsx`, derived from `import.meta.env.BASE_URL`

- [ ] **Step 1: Write the failing test**

```js
it("builds the Logo URL below the deployed site base path", () => {
  expect(assetPath("/wudibao888/", "brand", "lbank-design-logo", "png")).toBe(
    "/wudibao888/assets/brand/lbank-design-logo.png",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/data/icons.test.js`

Expected: FAIL because the brand path is still hard-coded outside the base-path helper.

- [ ] **Step 3: Write minimal implementation**

```js
const brandLogoSrc = assetPath(import.meta.env.BASE_URL, "brand", "lbank-design-logo", "png");

<img alt="" src={brandLogoSrc} />
```

Import `assetPath` in `src/Prototype.jsx` from `src/data/icons.js`; do not add a duplicate path builder.

- [ ] **Step 4: Run test and Pages build**

Run: `npm test -- --run src/data/icons.test.js && GITHUB_ACTIONS=true npm run build`

Expected: PASS, and `dist/client` references `/wudibao888/assets/brand/lbank-design-logo.png`.

- [ ] **Step 5: Commit**

```bash
git add src/data/icons.js src/data/icons.test.js src/Prototype.jsx
git commit -m "fix: resolve logo below deployment base path"
```

### Task 2: Add Shared Catalog and Upload Preparation Domain Code

**Files:**
- Create: `public/catalog.json`
- Create: `src/lib/sharedCatalog.js`
- Create: `src/lib/sharedCatalog.test.js`
- Create: `src/lib/uploadPreparation.js`
- Create: `src/lib/uploadPreparation.test.js`

**Interfaces:**
- Produces: `sharedCatalogUrl(basePath): string`
- Produces: `mergeSharedIcons(builtInIcons, sharedIcons): Icon[]`
- Produces: `createUploadId(filename, index): string`
- Produces: `prepareUploadEntry(file, category, index): Promise<{ id: string, name: string, nameZh: string, category: string, filename: string, src: string, content: string }>`

- [ ] **Step 1: Write failing catalog tests**

```js
it("merges shared entries without duplicating an existing icon id", () => {
  expect(mergeSharedIcons([{ id: "apple" }], [{ id: "apple" }, { id: "shared-1" }]))
    .toEqual([{ id: "apple" }, { id: "shared-1" }]);
});

it("uses the deployed base path for the public catalog", () => {
  expect(sharedCatalogUrl("/wudibao888/")).toBe("/wudibao888/catalog.json");
});
```

- [ ] **Step 2: Run catalog test to verify it fails**

Run: `npm test -- --run src/lib/sharedCatalog.test.js`

Expected: FAIL because `sharedCatalogUrl` and `mergeSharedIcons` do not exist.

- [ ] **Step 3: Implement catalog helpers and seed file**

```js
export function sharedCatalogUrl(basePath) {
  return `${basePath.endsWith("/") ? basePath : `${basePath}/`}catalog.json`;
}

export function mergeSharedIcons(builtInIcons, sharedIcons) {
  const byId = new Map(builtInIcons.map((icon) => [icon.id, icon]));
  sharedIcons.forEach((icon) => byId.set(icon.id, icon));
  return [...byId.values()];
}
```

Create `public/catalog.json` with exactly `{ "icons": [] }`.

- [ ] **Step 4: Write failing upload-preparation tests**

```js
it("derives a category-bound PNG upload entry", async () => {
  const file = new File(["image"], "ETH Deposit.webp", { type: "image/webp" });
  await expect(prepareUploadEntry(file, "BuyCrypto", 2)).resolves.toMatchObject({
    id: "eth-deposit-2",
    name: "ETH Deposit",
    category: "BuyCrypto",
    filename: "eth-deposit-2.png",
  });
});

it("rejects unsupported file types", async () => {
  const file = new File(["text"], "readme.svg", { type: "image/svg+xml" });
  await expect(prepareUploadEntry(file, "Earn", 0)).rejects.toThrow("Unsupported image type");
});
```

- [ ] **Step 5: Implement upload preparation**

Use an `ALLOWED_TYPES` set for PNG, JPEG, and WebP. Normalize names by lowercasing, replacing non-alphanumeric runs with `-`, trimming edge hyphens, and falling back to `icon`. Reuse the existing canvas optimization behavior from `fileToOptimizedDataUrl`, but return both the data URL for preview and the base64 PNG content without its `data:image/png;base64,` prefix.

- [ ] **Step 6: Run new domain tests**

Run: `npm test -- --run src/lib/sharedCatalog.test.js src/lib/uploadPreparation.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/catalog.json src/lib/sharedCatalog.js src/lib/sharedCatalog.test.js src/lib/uploadPreparation.js src/lib/uploadPreparation.test.js
git commit -m "feat: add shared icon catalog and upload preparation"
```

### Task 3: Commit Shared Uploads Through the GitHub Git Data API

**Files:**
- Create: `src/lib/githubCatalogCommit.js`
- Create: `src/lib/githubCatalogCommit.test.js`

**Interfaces:**
- Produces: `createSharedCatalogCommit({ token, catalog, entries, fetchImpl }): Promise<{ commitSha: string }>`
- Consumes: prepared entries from `prepareUploadEntry`

- [ ] **Step 1: Write the failing API-payload test**

```js
it("adds every image and the updated catalog to one replacement tree", async () => {
  const fetchImpl = vi.fn()
    .mockResolvedValueOnce(jsonResponse({ object: { sha: "head" } }))
    .mockResolvedValueOnce(jsonResponse({ tree: { sha: "base-tree" } }))
    .mockResolvedValueOnce(jsonResponse({ sha: "image-blob" }))
    .mockResolvedValueOnce(jsonResponse({ sha: "catalog-blob" }))
    .mockResolvedValueOnce(jsonResponse({ sha: "next-tree" }))
    .mockResolvedValueOnce(jsonResponse({ sha: "next-commit" }))
    .mockResolvedValueOnce(jsonResponse({}));

  await createSharedCatalogCommit({ token: "token", catalog: { icons: [] }, entries: [entry], fetchImpl });

  expect(JSON.parse(fetchImpl.mock.calls[4][1].body).tree).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: "public/assets/user-icons/entry.png", sha: "image-blob" }),
    expect.objectContaining({ path: "public/catalog.json", sha: "catalog-blob" }),
  ]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/githubCatalogCommit.test.js`

Expected: FAIL because `createSharedCatalogCommit` does not exist.

- [ ] **Step 3: Implement the single-commit request sequence**

Use `fetchImpl` for all requests, with:

```js
const repository = "bw4864441-spec/wudibao888";
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
```

Read `GET /repos/${repository}/git/ref/heads/main`, then the head commit. Create one blob for each `entry.content` at `POST /git/blobs`; create a base64 blob for `JSON.stringify(catalog, null, 2) + "\n"`; create a tree at `POST /git/trees`; create a commit at `POST /git/commits`; then update `PATCH /git/refs/heads/main` with `force: false`. Throw an `Error` using the GitHub response message for non-2xx results. Never include `token` in any thrown error.

- [ ] **Step 4: Run API tests**

Run: `npm test -- --run src/lib/githubCatalogCommit.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/githubCatalogCommit.js src/lib/githubCatalogCommit.test.js
git commit -m "feat: commit shared icon uploads atomically"
```

### Task 4: Build the Category Batch-Upload Experience

**Files:**
- Modify: `src/Prototype.jsx`
- Modify: `src/prototype.css`
- Test: `src/lib/sharedCatalog.test.js`
- Test: `src/lib/uploadPreparation.test.js`
- Test: `src/lib/githubCatalogCommit.test.js`

**Interfaces:**
- Consumes: `sharedCatalogUrl`, `mergeSharedIcons`, `prepareUploadEntry`, and `createSharedCatalogCommit`
- Produces: uploaded catalog entries referenced by `public/catalog.json`

- [ ] **Step 1: Write a failing merge behavior test**

```js
it("retains uploaded entries in their selected category", () => {
  const merged = mergeSharedIcons([], [{ id: "yield-1", category: "Earn" }]);
  expect(merged.filter((icon) => icon.category === "Earn").map((icon) => icon.id)).toEqual(["yield-1"]);
});
```

- [ ] **Step 2: Run test to verify it fails if category is not preserved**

Run: `npm test -- --run src/lib/sharedCatalog.test.js`

Expected: PASS only after Task 2 implementation preserves shared icon categories.

- [ ] **Step 3: Implement UI state and catalog loading**

Add state for `sharedIcons`, `uploadOpen`, `uploadEntries`, `uploadToken`, `uploadError`, and `uploadStatus`. On mount, fetch `sharedCatalogUrl(import.meta.env.BASE_URL)`, accept `{ icons: [] }`, and merge its entries through `mergeSharedIcons(icons, sharedIcons)` before `applyIconEdits` and `filterIcons` run.

Add an `UploadSimple` utility button when `category !== "All"`. Its click opens the modal and the modal heading includes `t[category]`.

- [ ] **Step 4: Implement file selection and submission**

```js
const selectedFiles = [...event.target.files];
const entries = await Promise.all(selectedFiles.map((file, index) => prepareUploadEntry(file, category, index)));
setUploadEntries(entries);
```

Render editable names, previews, a password-type token field, cancel, and publish buttons. Publish calls:

```js
await createSharedCatalogCommit({
  token: uploadToken,
  entries: uploadEntries,
  catalog: { icons: [...sharedIcons, ...uploadEntries.map(({ content, ...icon }) => icon)] },
});
```

On success, clear token and entries, close the modal, and show the existing toast with publishing confirmation. On failure, keep the modal open, retain the prepared files, and render the API message.

- [ ] **Step 5: Add focused styling**

Add an icon-only upload button matching the existing utility buttons. Add a responsive modal with a scrollable upload list, fixed action row, thumbnail sizes, filename input, and visible error styling. Do not expose edit or delete controls on icon cards.

- [ ] **Step 6: Run complete verification**

Run: `npm test && GITHUB_ACTIONS=true npm run build && npm run test:sites`

Expected: all tests pass and the GitHub Pages build produces `dist/client/index.html` with `/wudibao888/` public paths.

- [ ] **Step 7: Commit**

```bash
git add src/Prototype.jsx src/prototype.css
git commit -m "feat: add category batch upload modal"
```

### Task 5: Publish and Validate Shared Upload Release

**Files:**
- Modify: `.github/workflows/deploy-pages.yml` only if the existing workflow does not publish `public/catalog.json` and `public/assets/user-icons/`

**Interfaces:**
- Consumes: GitHub Pages workflow and the Git Data API commits created in Task 3

- [ ] **Step 1: Verify the deployment artifact includes shared assets**

Run: `GITHUB_ACTIONS=true npm run build && test -f dist/client/catalog.json`

Expected: PASS; Vite copies the shared catalog from `public/catalog.json`.

- [ ] **Step 2: Push the validated source**

Run: `git push origin main`

Expected: GitHub Actions starts `Deploy GitHub Pages`.

- [ ] **Step 3: Confirm deployment succeeds**

Run: `gh run list --repo bw4864441-spec/wudibao888 --workflow 'Deploy GitHub Pages' --limit 1`

Expected: latest run has `success` conclusion.

- [ ] **Step 4: Verify public base-path resources**

Run: `curl -I https://bw4864441-spec.github.io/wudibao888/assets/brand/lbank-design-logo.png`

Expected: HTTP `200`.

- [ ] **Step 5: Commit any workflow change**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "chore: publish shared icon catalog"
```
