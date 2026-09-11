# L-DESIGN AI HUB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a members-only L-DESIGN AI HUB with the selected AI Core visual direction, self-service member authentication, durable D1 metadata, R2 uploads, immediate publishing, and a reverse-chronological resource feed.

**Architecture:** Preserve the existing React/Vite client and Cloudflare-compatible Worker. The Worker owns authentication, authorization, D1 queries, R2 access, and JSON APIs; the client owns responsive product UI and uses a development-only adapter for local browser preview. Production data and files are always server-authoritative.

**Tech Stack:** React 19, Vite 6, Cloudflare Worker ESM, D1, R2, Vitest, Node test runner, Phosphor Icons, native CSS.

## Global Constraints

- Use `public/assets/brand/lbank-design-logo.png` only inside the circular brand mark and pair it with the separate name `L-DESIGN AI HUB`.
- Use `#FFDB00` as the only accent for primary actions, focus rings, and selected states.
- Treat `/Users/mac/.codex/generated_images/01a031a8-35ff-7183-a792-d56249dea271/exec-77e91baf-eb12-4f06-8021-91d89f59968d.png` as the visual source of truth.
- Keep anonymous visitors out of HTML routes, JSON APIs, and downloads in production.
- External members may self-register and publish immediately; moderation is post-publication.
- Persist structured state in D1 and uploaded bytes in R2; never use browser storage as authoritative product storage.
- Use the LBank business scenarios All, Buy Crypto, Spot, Futures, Earn, Copy Trading, Campaigns, and Security, with Chinese labels 全部、买币、现货、合约、理财、跟单、活动、安全.
- Preserve the existing React/Vite project, Sites packaging path, and Worker static fallback.
- Do not modify unrelated existing changes in `src/data/icons.js` or `src/data/icons.test.js`.
- Use no invented product metrics, AI-purple, neon glow, glassmorphism, custom SVG icons, or decorative status dots.
- Visible UI copy must contain no em dash or en dash characters.
- Respect `prefers-reduced-motion`; the mobile layout below 768px is a strict single column.
- Final verification commands are `npm run test`, `npm run build`, and `npm run test:sites`.

## File Map

### Platform And Data

- Modify `.openai/hosting.json`: declare logical D1 `DB` and R2 `UPLOADS` bindings.
- Create `db/schema.sql`: D1 tables and indexes.
- Create `worker/auth.js`: authenticated identity parsing and role checks.
- Create `worker/http.js`: JSON responses, errors, route matching, safe body parsing.
- Create `worker/resource-store.js`: all D1 resource, profile, bookmark, report, and audit queries.
- Create `worker/upload-store.js`: upload validation and all R2 reads/writes.
- Create `worker/api.js`: authenticated API route orchestration.
- Modify `worker/index.js`: API routing, protected app routing, and existing asset fallback.
- Create `tests/helpers/worker-env.mjs`: deterministic D1, R2, and ASSETS fakes.
- Create `tests/auth-worker.test.mjs`, `tests/resources-worker.test.mjs`, and `tests/uploads-worker.test.mjs`.
- Modify `tests/sites-worker.test.mjs`: protected HTML behavior plus preserved packaging assertions.

### Client Domain And API

- Create `src/domain/resources.js`: resource constants, normalization, filtering, and date grouping.
- Create `src/domain/resources.test.js`: catalog behavior tests.
- Create `src/api/client.js`: production fetch client and typed error normalization.
- Create `src/api/devAdapter.js`: development-only authenticated sample data and write simulation.
- Create `src/api/client.test.js`: URL and error behavior tests.
- Create `src/lib/router.js` and `src/lib/router.test.js`: small History API router without adding a dependency.

### Product UI

- Create `src/AIHubApp.jsx`: route switch, session bootstrap, and shared app state.
- Create `src/components/SiteHeader.jsx`, `HeroStage.jsx`, `ResourceFeed.jsx`, `ResourceRow.jsx`, `FilterBar.jsx`, `FileDropzone.jsx`, `FeedbackState.jsx`, and `AccountMenu.jsx`.
- Create `src/pages/SignInPage.jsx`, `DiscoverPage.jsx`, `ResourceDetailPage.jsx`, `PublishPage.jsx`, `ProfilePage.jsx`, and `AdminPage.jsx`.
- Create `src/data/devResources.js`: realistic development-only content anchored to 2026-08-24.
- Create `src/ai-hub.css`: tokens, layout, states, responsive rules, and reduced motion.
- Modify `src/App.jsx`: render `AIHubApp` instead of the legacy icon prototype.
- Modify `src/styles.css`: import the AI Hub stylesheet and set global foundations.
- Create `public/assets/ai-hub/ai-core-monolith.webp`: original generated central hero asset.
- Create `public/assets/ai-hub/resource-campaign.webp`, `resource-market-motion.webp`, and `resource-copy-skill.webp`: grounded resource covers.

---

### Task 1: Resource Domain And Client Routing

**Files:**
- Create: `src/domain/resources.js`
- Create: `src/domain/resources.test.js`
- Create: `src/lib/router.js`
- Create: `src/lib/router.test.js`

**Interfaces:**
- Produces: `RESOURCE_TYPES`, `BUSINESS_SCENARIOS`, `normalizeResource(raw)`, `filterResources(resources, filters)`, `groupResourcesByDate(resources, now)`, `matchRoute(pathname)`, and `buildResourceQuery(filters)`.
- Consumes: no new application interfaces.

- [ ] **Step 1: Write failing date, filter, and routing tests**

```js
import { describe, expect, it } from "vitest";
import { filterResources, groupResourcesByDate } from "./resources.js";

const resources = [
  { id: "campaign-kit", type: "skill", title: "Campaign Visual Prompt Kit", summary: "活动视觉提示词", authorName: "林嘉", scenario: "Campaigns", tags: ["Prompt"], publishedAt: "2026-08-24T08:30:00+08:00" },
  { id: "market-motion", type: "vibe", title: "行情卡片动效实验", summary: "WebGL 动效", authorName: "Milo Chen", scenario: "Spot", tags: ["Motion"], publishedAt: "2026-08-23T16:00:00+08:00" },
];

it("combines query, type, and scenario filters", () => {
  expect(filterResources(resources, { query: "林嘉", type: "skill", scenario: "Campaigns" }).map((item) => item.id)).toEqual(["campaign-kit"]);
});

it("groups newest resources under stable local date labels", () => {
  expect(groupResourcesByDate(resources, new Date("2026-08-24T12:00:00+08:00")).map((group) => group.label)).toEqual(["今天 8月24日", "昨天 8月23日"]);
});
```

Add router tests that map `/`, `/resources/:id`, `/publish`, `/profile/:id`, `/admin`, and unknown paths to explicit route objects.

- [ ] **Step 2: Run the tests and verify the new modules are missing**

Run: `npm test -- src/domain/resources.test.js src/lib/router.test.js`

Expected: FAIL because `resources.js` and `router.js` do not exist.

- [ ] **Step 3: Implement the resource helpers and router**

```js
export const RESOURCE_TYPES = ["all", "skill", "vibe"];
export const BUSINESS_SCENARIOS = ["All", "BuyCrypto", "Spot", "Futures", "Earn", "CopyTrading", "Campaigns", "Security"];

export function filterResources(resources, { query = "", type = "all", scenario = "All" }) {
  const needle = query.trim().toLocaleLowerCase();
  return resources.filter((resource) => {
    const searchable = [resource.title, resource.summary, resource.authorName, resource.scenario, ...(resource.tags ?? [])].join(" ").toLocaleLowerCase();
    return (type === "all" || resource.type === type)
      && (scenario === "All" || resource.scenario === scenario)
      && (!needle || searchable.includes(needle));
  });
}
```

Implement date grouping with `Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" })`, stable descending sort, URL query encoding, and `popstate` subscription.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/domain/resources.test.js src/lib/router.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the domain layer**

```bash
git add src/domain/resources.js src/domain/resources.test.js src/lib/router.js src/lib/router.test.js
git commit -m "feat: add AI Hub resource domain"
```

### Task 2: D1 Schema And Authenticated Worker Boundary

**Files:**
- Modify: `.openai/hosting.json`
- Create: `db/schema.sql`
- Create: `worker/auth.js`
- Create: `worker/http.js`
- Create: `tests/helpers/worker-env.mjs`
- Create: `tests/auth-worker.test.mjs`
- Modify: `worker/index.js`
- Modify: `tests/sites-worker.test.mjs`

**Interfaces:**
- Produces: `getIdentity(request)`, `requireUser(request, env)`, `requireAdmin(request, env)`, `json(data, init)`, `problem(code, message, status, details)`, and logical bindings `env.DB`, `env.UPLOADS`.
- Consumes: the existing `env.ASSETS.fetch(request)` fallback.

- [ ] **Step 1: Write failing authentication and protected-route tests**

```js
test("rejects anonymous API reads", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/me"), createWorkerEnv());
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: { code: "AUTH_REQUIRED", message: "请先登录" } });
});

test("loads a member from forwarded identity headers", async () => {
  const request = new Request("https://example.test/api/me", { headers: { "oai-authenticated-user-email": "lin@example.com" } });
  const response = await worker.fetch(request, createWorkerEnv({ user: { id: "user-lin", email: "lin@example.com", status: "active", role: "member" } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, "user-lin");
});
```

Add tests for suspended members, non-admin access, `/signin-with-chatgpt` redirect behavior for protected HTML, and the unchanged static asset fallback.

- [ ] **Step 2: Run Worker auth tests and verify failure**

Run: `node --test tests/auth-worker.test.mjs tests/sites-worker.test.mjs`

Expected: FAIL because authenticated routing and helper modules do not exist.

- [ ] **Step 3: Add logical storage bindings and schema**

Set `.openai/hosting.json` to:

```json
{
  "d1": "DB",
  "r2": "UPLOADS"
}
```

Create tables for `users`, `resources`, `resource_versions`, `resource_files`, `tags`, `resource_tags`, `bookmarks`, `downloads`, `reports`, and `audit_log`. Use text UUID primary keys, ISO timestamps, foreign keys, explicit `CHECK` constraints for roles and statuses, and indexes on `resources(status, published_at)`, `resources(type, scenario)`, `resources(owner_id)`, `resource_tags(tag_id)`, and `reports(status, created_at)`.

- [ ] **Step 4: Implement identity and HTTP helpers**

```js
export function getIdentity(request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return null;
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  return { email, name: encodedName && encoding === "percent-encoded-utf-8" ? decodeURIComponent(encodedName) : email.split("@")[0] };
}
```

`requireUser` must create the first member row when needed, reject `status = 'suspended'`, and never accept a role from client input. `requireAdmin` checks the stored D1 role.

- [ ] **Step 5: Route protected HTML and APIs before static assets**

Update `worker/index.js` so `/api/*` calls `handleApi`, authenticated HTML requests continue to assets, and anonymous HTML requests redirect to `/signin-with-chatgpt?return_to=<same-origin-relative-path>`.

- [ ] **Step 6: Run auth and packaging tests**

Run: `node --test tests/auth-worker.test.mjs tests/sites-worker.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit the platform boundary**

```bash
git add .openai/hosting.json db/schema.sql worker/auth.js worker/http.js worker/index.js tests/helpers/worker-env.mjs tests/auth-worker.test.mjs tests/sites-worker.test.mjs
git commit -m "feat: protect AI Hub with member auth"
```

### Task 3: Resource Read APIs And Search

**Files:**
- Create: `worker/resource-store.js`
- Create: `worker/api.js`
- Create: `tests/resources-worker.test.mjs`
- Modify: `worker/index.js`

**Interfaces:**
- Produces: `listResources(env, filters)`, `getResource(env, id)`, `getProfile(env, id)`, and `handleApi(request, env)` routes for `GET /api/me`, `GET /api/resources`, `GET /api/resources/:id`, and `GET /api/profiles/:id`.
- Consumes: `requireUser`, `json`, and `problem` from Task 2.

- [ ] **Step 1: Write failing resource API tests**

```js
test("returns published resources newest first with filters", async () => {
  const env = createWorkerEnv({ resources: seedResources });
  const request = signedRequest("https://example.test/api/resources?type=skill&scenario=Campaigns&q=prompt");
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).items.map((item) => item.id), ["campaign-kit"]);
});

test("does not reveal hidden resources to members", async () => {
  const response = await worker.fetch(signedRequest("https://example.test/api/resources/hidden-one"), createWorkerEnv({ resources: seedResources }));
  assert.equal(response.status, 404);
});
```

Add cases for tags, author search, profile ownership fields, missing resources, and pagination cursor stability.

- [ ] **Step 2: Run resource Worker tests and verify failure**

Run: `node --test tests/resources-worker.test.mjs`

Expected: FAIL because resource routes are not implemented.

- [ ] **Step 3: Implement prepared D1 queries**

Build query fragments only from allowlisted filter names; bind all user values. Return a normalized resource object with `id`, `type`, `title`, `summary`, `scenario`, `tags`, `author`, `coverUrl`, `publishedAt`, `updatedAt`, `version`, `files`, `saved`, and `canEdit`.

- [ ] **Step 4: Implement authenticated read routes**

```js
if (request.method === "GET" && pathname === "/api/resources") {
  const user = await requireUser(request, env);
  return json(await listResources(env, parseResourceFilters(url.searchParams), user));
}
```

Use opaque `(published_at,id)` cursors and return at most 24 resources per request.

- [ ] **Step 5: Run resource and auth tests**

Run: `node --test tests/auth-worker.test.mjs tests/resources-worker.test.mjs tests/sites-worker.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit read APIs**

```bash
git add worker/resource-store.js worker/api.js worker/index.js tests/resources-worker.test.mjs
git commit -m "feat: add searchable resource APIs"
```

### Task 4: Upload, Publish, Download, Bookmark, And Moderation APIs

**Files:**
- Create: `worker/upload-store.js`
- Create: `tests/uploads-worker.test.mjs`
- Modify: `worker/resource-store.js`
- Modify: `worker/api.js`

**Interfaces:**
- Produces: `validateUpload(file, purpose)`, `putTemporaryUpload(env, user, file)`, `publishResource(env, user, input)`, `streamDownload(env, user, fileId)`, plus bookmark, report, profile update, author update/unpublish, and admin moderation routes.
- Consumes: Task 2 authorization helpers and Task 3 resource normalization.

- [ ] **Step 1: Write failing upload and authorization tests**

```js
test("rejects an executable disguised as a Skill package", async () => {
  const body = new FormData();
  body.append("purpose", "skill-package");
  body.append("file", new File(["MZ"], "skill.exe", { type: "application/octet-stream" }));
  const response = await worker.fetch(signedRequest("https://example.test/api/uploads", { method: "POST", body }), createWorkerEnv());
  assert.equal(response.status, 415);
  assert.equal((await response.json()).error.code, "UNSUPPORTED_FILE");
});

test("prevents a member from unpublishing another author's resource", async () => {
  const response = await worker.fetch(signedRequest("https://example.test/api/resources/other-resource", { method: "DELETE" }), createWorkerEnv());
  assert.equal(response.status, 403);
});
```

Add tests for valid ZIP/image/video upload, declared and actual size, missing temporary object, atomic resource records, authenticated download, bookmarks, reports, suspended members, and admin hide/restore.

- [ ] **Step 2: Run upload tests and verify failure**

Run: `node --test tests/uploads-worker.test.mjs`

Expected: FAIL because write routes do not exist.

- [ ] **Step 3: Implement server-side upload allowlists**

Allow covers `image/png`, `image/jpeg`, and `image/webp` up to 8 MB; Skill packages `application/zip` up to 64 MB; demos `video/mp4` and `video/webm` up to 120 MB. Normalize filenames, generate UUID object keys, compute SHA-256 checksums, and write temporary objects beneath `tmp/<user-id>/<uuid>`.

- [ ] **Step 4: Implement publication without exposing partial resources**

Validate required fields by type and confirm every temporary object belongs to the member. Stream each temporary object into its durable `resources/<resource-id>/<version-id>/<file-id>` key first. After every durable object exists, create the resource, version, file, and audit rows with one `env.DB.batch([...])`, then remove the temporary keys. If an R2 write fails, delete any durable objects created by that attempt, keep the draft and temporary objects, and return `UPLOAD_FINALIZE_FAILED`. If the D1 batch fails, delete the durable objects and keep the draft so no partial resource is visible.

- [ ] **Step 5: Implement authenticated download and member actions**

Add routes:

```text
POST   /api/uploads
POST   /api/resources
PATCH  /api/resources/:id
DELETE /api/resources/:id
GET    /api/files/:id/download
PUT    /api/resources/:id/bookmark
DELETE /api/resources/:id/bookmark
POST   /api/resources/:id/reports
PATCH  /api/me
POST   /api/admin/resources/:id/hide
POST   /api/admin/resources/:id/restore
POST   /api/admin/users/:id/suspend
```

- [ ] **Step 6: Run all Worker tests**

Run: `node --test tests/auth-worker.test.mjs tests/resources-worker.test.mjs tests/uploads-worker.test.mjs tests/sites-worker.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit write APIs**

```bash
git add worker/upload-store.js worker/resource-store.js worker/api.js tests/uploads-worker.test.mjs
git commit -m "feat: add durable AI Hub publishing"
```

### Task 5: API Client And Development Adapter

**Files:**
- Create: `src/api/client.js`
- Create: `src/api/client.test.js`
- Create: `src/api/devAdapter.js`
- Create: `src/data/devResources.js`

**Interfaces:**
- Produces: `api.me()`, `api.listResources(filters)`, `api.getResource(id)`, `api.upload(file, purpose)`, `api.publish(input)`, `api.updateResource(id, input)`, `api.unpublish(id)`, `api.bookmark(id, saved)`, `api.report(id, input)`, `api.updateProfile(input)`, and matching development behavior.
- Consumes: Task 1 `buildResourceQuery` and Task 2/3/4 API shapes.

- [ ] **Step 1: Write failing client tests**

```js
it("encodes resource filters without empty parameters", async () => {
  const calls = [];
  const api = createApiClient(async (url) => { calls.push(url); return new Response(JSON.stringify({ items: [] })); });
  await api.listResources({ type: "skill", scenario: "Campaigns", query: "视觉 prompt" });
  expect(calls[0]).toBe("/api/resources?type=skill&scenario=Campaigns&q=%E8%A7%86%E8%A7%89+prompt");
});

it("normalizes server problems", async () => {
  const api = createApiClient(async () => new Response(JSON.stringify({ error: { code: "FILE_TOO_LARGE", message: "文件过大" } }), { status: 413 }));
  await expect(api.me()).rejects.toMatchObject({ code: "FILE_TOO_LARGE", message: "文件过大", status: 413 });
});
```

- [ ] **Step 2: Run client tests and verify failure**

Run: `npm test -- src/api/client.test.js`

Expected: FAIL because the API client is missing.

- [ ] **Step 3: Implement fetch and development adapters**

The production adapter uses `credentials: "same-origin"`, JSON for metadata, and `FormData` for files. The development adapter is selected only under `import.meta.env.DEV`, exposes one active member, stores data in module memory for the current preview session, and uses the same response shapes as production.

- [ ] **Step 4: Seed realistic development resources**

Create entries for Campaign Visual Prompt Kit, 行情卡片动效实验, LBank 文案校对 Skill, AI 运营日报工作流, and L-DESIGN 组件库 using 2026-08-24 timestamps, real author names, valid business scenarios, and cover paths created in Task 6.

- [ ] **Step 5: Run domain and API client tests**

Run: `npm test -- src/domain/resources.test.js src/api/client.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the client data boundary**

```bash
git add src/api/client.js src/api/client.test.js src/api/devAdapter.js src/data/devResources.js
git commit -m "feat: add AI Hub client data adapter"
```

### Task 6: Generate Visual Assets And Build The Selected Hero

**Files:**
- Create: `public/assets/ai-hub/ai-core-monolith.webp`
- Create: `public/assets/ai-hub/resource-campaign.webp`
- Create: `public/assets/ai-hub/resource-market-motion.webp`
- Create: `public/assets/ai-hub/resource-copy-skill.webp`
- Create: `src/components/SiteHeader.jsx`
- Create: `src/components/HeroStage.jsx`
- Create: `src/components/AccountMenu.jsx`
- Create: `src/pages/SignInPage.jsx`
- Create: `src/ai-hub.css`
- Create: `src/AIHubApp.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `AIHubApp`, `SiteHeader`, `HeroStage`, `AccountMenu`, and `SignInPage`.
- Consumes: Task 5 `api.me()` and the selected visual reference.

- [ ] **Step 1: Generate and inspect the AI Core asset**

Use ImageGen with the selected mock attached and this exact art direction: “Isolate the central premium modular black AI Core monolith as a full-height product object on a transparent background. Interlocking matte and glossy black rectangular modules, one narrow #FFDB00 illuminated vertical seam, centered front three-quarter view, no text, no logo, no UI, no floor, no robot or humanoid features, clean alpha edges, 1200x1600.” Inspect the returned asset before placing it.

- [ ] **Step 2: Generate and inspect three resource covers**

Generate distinct 16:10 covers matching the black/yellow L-DESIGN system: campaign prompt kit packaging, a market-card motion study, and a copy-review Skill package. Each asset has no UI chrome, no watermark, and no unreadable decorative text.

- [ ] **Step 3: Implement the session shell and sign-in state**

`AIHubApp` loads `api.me()`, renders a layout-shaped skeleton, redirects authentication errors to `/signin-with-chatgpt?return_to=/`, and renders `SignInPage` only for local development preview. All other routes stay behind the resolved active member.

- [ ] **Step 4: Implement the selected desktop hero**

Build a 1440x1024 first viewport with layered text, centered real AI Core image, left actions, two real featured resource previews, and the beginning of the date feed. Use `<img>` for the generated object and covers; do not recreate the object with CSS shapes.

- [ ] **Step 5: Implement responsive and reduced-motion hero behavior**

Use CSS transforms and opacity only. Under 768px use one column in the order: value statement, AI Core, actions, featured resources, date feed. Under reduced motion, remove entry and depth animations while preserving layout.

- [ ] **Step 6: Run client tests and build**

Run: `npm run test && npm run build`

Expected: PASS and `dist/client/index.html` exists.

- [ ] **Step 7: Commit the visual foundation**

```bash
git add public/assets/ai-hub src/components/SiteHeader.jsx src/components/HeroStage.jsx src/components/AccountMenu.jsx src/pages/SignInPage.jsx src/ai-hub.css src/AIHubApp.jsx src/App.jsx src/styles.css
git commit -m "feat: build selected AI Hub hero"
```

### Task 7: Discover Feed And Resource Detail

**Files:**
- Create: `src/components/FilterBar.jsx`
- Create: `src/components/ResourceFeed.jsx`
- Create: `src/components/ResourceRow.jsx`
- Create: `src/components/FeedbackState.jsx`
- Create: `src/pages/DiscoverPage.jsx`
- Create: `src/pages/ResourceDetailPage.jsx`
- Modify: `src/AIHubApp.jsx`
- Modify: `src/ai-hub.css`

**Interfaces:**
- Produces: searchable/filterable discover route and `/resources/:id` detail route.
- Consumes: Tasks 1 and 5 resource/query interfaces.

- [ ] **Step 1: Add reducer tests for feed state**

Add pure tests beside `src/domain/resources.test.js` for loading, success, empty, error, filter reset, and bookmark updates. Expected state shapes are `{ status, items, groups, filters, error }`.

- [ ] **Step 2: Run focused tests and verify the reducer is missing**

Run: `npm test -- src/domain/resources.test.js`

Expected: FAIL for missing `createFeedState` and `reduceFeedState` exports.

- [ ] **Step 3: Implement the discover flow**

Connect URL-backed query, type, scenario, and newest-first sorting to `api.listResources`. Debounce search by 200ms, cancel stale requests with `AbortController`, preserve filters across retry, and group results with Task 1 helpers.

- [ ] **Step 4: Implement resource rows and feedback states**

Rows show cover, title, short summary, type, author, time, download, and save. Loading skeletons match final row geometry. Empty results offer “清除筛选”; errors offer “重新加载” without discarding the query.

- [ ] **Step 5: Implement resource detail**

Render metadata, safe instructions, versions, authenticated files, download, bookmark, report, author link, and owner edit controls. Escape plain text and render only sanitized allowed Markdown tokens.

- [ ] **Step 6: Run tests and build**

Run: `npm run test && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit discovery and detail**

```bash
git add src/domain/resources.js src/domain/resources.test.js src/components/FilterBar.jsx src/components/ResourceFeed.jsx src/components/ResourceRow.jsx src/components/FeedbackState.jsx src/pages/DiscoverPage.jsx src/pages/ResourceDetailPage.jsx src/AIHubApp.jsx src/ai-hub.css
git commit -m "feat: add AI Hub discovery experience"
```

### Task 8: Publish, Profile, And Administration UI

**Files:**
- Create: `src/components/FileDropzone.jsx`
- Create: `src/pages/PublishPage.jsx`
- Create: `src/pages/ProfilePage.jsx`
- Create: `src/pages/AdminPage.jsx`
- Create: `src/domain/publish.js`
- Create: `src/domain/publish.test.js`
- Modify: `src/AIHubApp.jsx`
- Modify: `src/ai-hub.css`

**Interfaces:**
- Produces: `validatePublishDraft(draft)`, type-specific publish forms, owner profile management, and admin moderation.
- Consumes: Task 4 API contracts and Task 5 client methods.

- [ ] **Step 1: Write failing publish validation tests**

```js
it("requires a package or repository for a Skill", () => {
  expect(validatePublishDraft({ type: "skill", title: "文案校对", summary: "统一品牌语气", scenario: "Security", tags: ["copy"], coverUploadId: "cover-1", instructions: "解压后安装", files: [] })).toMatchObject({ valid: false, fields: { files: "请上传 Skill 包或填写仓库地址" } });
});

it("accepts a Vibe work with a Figma artifact", () => {
  expect(validatePublishDraft({ type: "vibe", title: "行情动效", summary: "可复用的行情卡片", scenario: "Spot", tags: ["motion"], coverUploadId: "cover-1", artifacts: [{ kind: "figma", url: "https://figma.com/file/example" }] }).valid).toBe(true);
});
```

- [ ] **Step 2: Run publish tests and verify failure**

Run: `npm test -- src/domain/publish.test.js`

Expected: FAIL because the validator is missing.

- [ ] **Step 3: Implement draft validation and upload state**

Return exact per-field Chinese messages. File states are `queued`, `uploading`, `complete`, and `error`; retry reuses form metadata and replaces only the failed upload entry.

- [ ] **Step 4: Implement the publish page**

Use four visible sections: resource type, essential details, files and links, preview. Labels sit above fields; errors sit below. Disable publish until validation passes and all uploads are complete. On success navigate to `/resources/<id>`.

- [ ] **Step 5: Implement profile and owner actions**

Show member details, published resources, saved resources, history, and drafts. Allow profile edit, metadata edit, new version, and unpublish only when `canEdit` is true.

- [ ] **Step 6: Implement admin moderation**

Render only for `user.role === "admin"`; also rely on server 403 responses. Provide report review, hide/restore, and suspend actions with confirmation and inline outcome.

- [ ] **Step 7: Run tests and build**

Run: `npm run test && npm run build`

Expected: PASS.

- [ ] **Step 8: Commit member workflows**

```bash
git add src/components/FileDropzone.jsx src/pages/PublishPage.jsx src/pages/ProfilePage.jsx src/pages/AdminPage.jsx src/domain/publish.js src/domain/publish.test.js src/AIHubApp.jsx src/ai-hub.css
git commit -m "feat: add AI Hub publishing workflows"
```

### Task 9: Accessibility, Visual QA, And Final Verification

**Files:**
- Modify: `src/AIHubApp.jsx`
- Modify: `src/ai-hub.css`
- Modify: UI files identified by the comparison
- Modify: `design-qa.md`
- Modify: `tests/sites-worker.test.mjs` only if packaging coverage needs an exact new assertion

**Interfaces:**
- Produces: verified local prototype and documented visual comparison.
- Consumes: all previous tasks.

- [ ] **Step 1: Run the full automated suite**

Run: `npm run test && npm run build && npm run test:sites`

Expected: all commands exit 0 and the three required distribution files exist.

- [ ] **Step 2: Start the local preview and open it in the in-app browser**

Run `npm run dev`, retain the session, use the exact Local URL printed by Vite, and open it once in the in-app browser.

- [ ] **Step 3: Capture the coded 1440x1024 hero**

Capture the signed-in development state at 1440x1024. Compare it together with both the selected AI Core mock and the user-supplied layered-type reference, not as isolated screenshots.

- [ ] **Step 4: Fix visible mismatches**

Correct typography scale, central object size and crop, text/object layer order, navigation height, lower-left actions, featured resource placement, first date-feed edge, spacing, radii, and yellow usage. Repeat the same comparison once after fixes.

- [ ] **Step 5: Verify complete interaction cycles**

Exercise navigation, search, type filter, all eight business scenarios, resource detail, bookmark, download, publish validation, successful development upload, retry after a failed upload, profile edit, author unpublish, report, admin hide/restore, sign-out link, keyboard traversal, and Escape behavior for overlays.

- [ ] **Step 6: Verify responsive and accessibility behavior**

Inspect desktop, tablet, and mobile widths; light text contrast on black; dark text on yellow buttons; visible focus; one-line desktop nav; no wrapped primary CTA; reduced motion; loading, empty, error, and success states.

- [ ] **Step 7: Record the final QA evidence**

Update `design-qa.md` with viewport, reference paths, tested routes, visible differences found, fixes applied, and the final command results. Do not claim hosted identity or cloud persistence was exercised unless the site has actually been deployed with D1 and R2.

- [ ] **Step 8: Run final verification after all fixes**

Run: `npm run test && npm run build && npm run test:sites`

Expected: all commands exit 0; `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json` exist.

- [ ] **Step 9: Commit the verified product**

```bash
git add src public/assets/ai-hub worker db .openai/hosting.json tests design-qa.md
git commit -m "feat: complete L-DESIGN AI Hub"
```
