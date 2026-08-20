# L-Design-icon Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive, interactive 3D icon browsing and download prototype based on the approved screenshot.

**Architecture:** A React/Vite client reads a typed local catalog, derives filtered results through pure helpers, and renders either a deterministic scatter canvas or grid. Preview and download actions remain browser-local.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS, local PNG assets.

## Global Constraints

- Use independent `L-Design-icon` branding and original copy.
- Do not hotlink target-site assets.
- Keep the primary experience full-viewport and immediately usable.
- Support desktop and mobile layouts.

---

### Task 1: Catalog Logic

**Files:**
- Create: `src/data/icons.ts`
- Create: `src/lib/catalog.ts`
- Test: `src/lib/catalog.test.ts`

**Interfaces:**
- Produces: `filterIcons(icons, category, query)` and `scatterStyle(index, total)`.

- [ ] Write failing tests for category filtering, text search, and deterministic positioning.
- [ ] Run the focused tests and confirm they fail because helpers are missing.
- [ ] Implement the typed catalog helpers.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Interactive Workspace

**Files:**
- Create: `src/Prototype.tsx`
- Create: `src/prototype.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: catalog data and helpers from Task 1.
- Produces: category/search controls, scatter/grid view, preview dialog, language toggle, and download actions.

- [ ] Implement the full desktop workspace using local assets.
- [ ] Add mobile layout and interaction states.
- [ ] Verify keyboard and pointer interactions.

### Task 3: Verification

**Files:**
- Create: `design-qa.md`

**Interfaces:**
- Consumes: the running prototype and supplied reference screenshot.
- Produces: a passed QA report or a clearly stated visual-verification blocker.

- [ ] Run unit tests and production build.
- [ ] Capture desktop and mobile views.
- [ ] Compare visual hierarchy and fix P0-P2 differences.
- [ ] Keep the local preview running for handoff.
