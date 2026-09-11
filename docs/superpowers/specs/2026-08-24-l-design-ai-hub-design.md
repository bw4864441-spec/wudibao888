# L-DESIGN AI HUB Design

## Goal

Transform the existing L-Design prototype into a members-only AI resource community where LBank internal teams and external creators can register, publish reusable Skills and Vibe Coding work, and discover resources in reverse chronological order.

The first release must use real identity, server-enforced access control, and cloud persistence. Browser storage is allowed only for temporary interface preferences and incomplete local form state; it is not authoritative product storage.

## Product Principles

- Registered members can browse, search, download, save, and publish resources.
- External members do not need an invitation or an LBank email address.
- Every product route and data endpoint requires an authenticated member.
- Publication is immediate after a valid upload; moderation happens after publication through reports, hiding, and account suspension.
- The primary browsing order is newest first, grouped into Today, Yesterday, and Earlier This Week.
- Keep the first release focused on sharing and reuse. Comments, ratings, payments, real-time collaborative editing, and organization billing are out of scope.

## Selected Visual Direction

The selected generated concept is the first AI Core Monolith direction created on 2026-08-24. Its source image is `/Users/mac/.codex/generated_images/01a031a8-35ff-7183-a792-d56249dea271/exec-77e91baf-eb12-4f06-8021-91d89f59968d.png`. It is the source of truth for the home-page composition, hierarchy, density, typography scale, color treatment, and visual rhythm.

### Hero

- Use a near-black immersive first viewport with a single-line navigation no taller than 72px.
- Render oversized layered typography reading “让灵感成为共同资产”. Pale-gray foreground letters and deep-charcoal background letters create depth.
- Place a premium black modular AI Core at the center. Its interlocking blocks represent reusable team capabilities; a single `#FFDB00` illuminated seam is the focal point.
- The AI Core overlaps the large typography to create foreground and background layers.
- Place one short value statement and two actions at lower left: “浏览资源” and “发布作品”.
- Place two real featured resources at lower right. Do not use invented platform metrics.
- Begin the chronological resource stream at the bottom edge with “今天 8月24日”.
- Use subtle depth drift, fade, and tactile hover feedback only when the motion communicates hierarchy or state. Respect `prefers-reduced-motion`.

### Brand And System

- Use `public/assets/brand/lbank-design-logo.png` only inside the circular brand mark.
- Pair the mark with the separate name `L-DESIGN AI HUB`.
- Use `#FFDB00` as the only accent for primary actions, focus rings, and selected states.
- Use near-black and off-white instead of pure black and pure white.
- Use one modern grotesk sans-serif family with readable 14-16px body text.
- Controls use a consistent 10-12px radius; standalone media can use a 14px radius.
- Use the existing Phosphor icon family. Do not draw custom SVG icons.
- Do not introduce AI-purple, neon glows, glassmorphism, decorative status dots, fake metrics, or dense dashboard furniture.

### Responsive Behavior

- Desktop preserves the layered typography, central AI Core, left actions, and right featured resources.
- Tablet reduces the type scale and moves featured resources below the AI Core while preserving the depth relationship.
- Mobile uses a strict single column: brand statement, AI Core, actions, featured resources, then the date stream.
- Navigation collapses into a compact menu while keeping search, publish, and account access reachable.
- The hero uses `min-height: 100dvh`, not a fixed viewport height.

## Information Architecture

### Protected Sign-In Screen

- Anonymous visitors see only the sign-in experience and cannot access resource data or file URLs.
- The first release uses Sign in with ChatGPT so internal and external creators can self-register without an invitation and the application does not store passwords.
- First sign-in creates a member profile. Members can add a display name, avatar, team, and role.

### Discover

- The selected hero is the first screen after sign-in.
- Below the hero, resources are ordered by `published_at DESC` and grouped by local calendar date.
- Type filters are All, Skills, and Vibe Work.
- Business scenario filters are All, Buy Crypto, Spot, Futures, Earn, Copy Trading, Campaigns, and Security; Chinese labels are 全部、买币、现货、合约、理财、跟单、活动、安全.
- Search matches title, summary, author display name, tags, and business scenario.
- Filters and search are reflected in the URL so views can be shared among authenticated members.

### Resource Detail

- Show cover, title, type, author, publish and update dates, summary, usage or installation instructions, tags, business scenario, version, and file list.
- Primary actions are download and save. Secondary actions are author profile and report.
- Skill resources can include a `SKILL.zip`, README, repository URL, and supporting images.
- Vibe Work can include a repository URL, live URL, Figma URL, screenshots, and a short MP4 or WebM demo.

### Publish

- Select Skill or Vibe Work first so the form can show the correct fields.
- Required shared fields are title, summary, business scenario, at least one tag, and a cover image.
- Skill requires a Skill package or repository URL plus usage instructions.
- Vibe Work requires at least one artifact: repository, live URL, Figma URL, screenshot set, or demo video.
- Upload files to temporary object keys, validate the completed set, then create the published resource transactionally.
- A successful publish redirects to the resource detail and places the resource at the top of the relevant date group.
- Authors can save drafts, edit metadata, publish a new version, or unpublish their own resources.

### Profile And Moderation

- A member profile shows published resources, saved resources, download history, and drafts.
- An author can edit, version, or unpublish only resources they own.
- Administrators can review reports, hide or restore resources, suspend accounts, and inspect an audit trail.
- Moderation is not a pre-publication gate.

## Architecture

### Client

- Preserve the existing React and Vite application and keep product UI in `src/`.
- Split the product into route-level surfaces for sign-in, discover, resource detail, publish, profile, and administration.
- Keep authentication and resource state server-authoritative. Client state is limited to form interaction, optimistic feedback, and device-local preferences.

### Server

- Extend the existing Worker with authenticated JSON endpoints and protected file delivery while preserving the static asset fallback.
- Validate the authenticated user on every read and write endpoint. Do not trust client-provided owner or role fields.
- Enforce ownership and administrator checks in shared server helpers.
- Return stable machine-readable error codes with concise user-facing messages.

### D1

D1 stores relational product state. The initial schema contains:

- `users`: identity subject, email, display name, avatar, team, role, status, timestamps.
- `resources`: owner, type, title, summary, instructions, business scenario, status, current version, cover key, published and updated timestamps.
- `resource_versions`: resource, version label, release notes, creation timestamp.
- `resource_files`: version, object key, original filename, media type, size, checksum, purpose.
- `tags` and `resource_tags`.
- `bookmarks`.
- `downloads`: member, resource version, timestamp.
- `reports`: reporter, resource, reason, details, status, moderation result.
- `audit_log`: actor, action, target, timestamp, structured metadata.

Indexes support publication date, type, business scenario, owner, status, tag, and normalized search fields.

### R2

- R2 stores Skill packages, covers, screenshots, demo videos, and attachments.
- Object keys are generated server-side and never use a raw filename as authority.
- File metadata and ownership live in D1.
- Downloads pass through an authenticated endpoint that validates resource visibility before returning the object.
- Replaced or unpublished files are retained until no active version references them; cleanup runs separately from the publishing transaction.

## Data Flow

### Registration And Access

1. An anonymous visitor starts Sign in with ChatGPT.
2. The platform returns an authenticated identity to the Worker.
3. The Worker creates or loads the D1 member record.
4. The application loads protected resource data only after the server confirms the member is active.

### Publishing

1. The member creates a draft and requests upload targets.
2. The server validates file count, filename, media type, and declared size.
3. Files are uploaded to temporary R2 object keys.
4. The client submits metadata and the completed object list.
5. The server verifies object existence, ownership, size, and type.
6. A D1 transaction creates the resource, version, file records, and audit event.
7. R2 objects move to durable resource keys and the new resource appears in the date feed.

### Downloading

1. A signed-in member requests a resource version.
2. The Worker checks member status and resource visibility.
3. The Worker records the download and streams or signs access to the R2 object.

## Validation And Error Handling

- Reject unsupported archives, images, and video formats before upload.
- Enforce configurable size limits on both client and server.
- Sanitize filenames and render user-authored descriptions as safe text or sanitized Markdown.
- Verify checksums after upload so incomplete objects cannot be published.
- Preserve draft metadata and completed uploads when a recoverable publish request fails.
- Show inline field errors for validation problems and a page-level recovery action for connectivity or server errors.
- An unavailable featured resource is removed from the hero and replaced by the next eligible resource without breaking layout.
- Empty search results retain current filters and offer a clear reset action.
- Suspended accounts receive a protected account-status screen and cannot read or write resource data.

## Security And Privacy

- Require authentication for HTML routes, JSON endpoints, and downloadable objects.
- Apply server-side role and ownership checks to every mutation.
- Use prepared D1 statements and parameter binding.
- Rate-limit sign-in-sensitive, upload, publish, download, and report endpoints.
- Use content-type allowlists, extension checks, checksum validation, and filename normalization.
- Do not expose R2 object keys as permanent public URLs.
- Do not store identity tokens, upload credentials, or secrets in browser storage.
- Record moderation and destructive author actions in the audit log.

## Testing And Acceptance

### Automated

- Authentication gates every protected route and API.
- First sign-in creates one member record; repeated sign-ins reuse it.
- Suspended members cannot browse, download, or publish.
- D1 queries return only visible resources ordered by publish date.
- Search and type, business scenario, author, and tag filters compose correctly.
- Upload validation rejects unsupported formats, excessive size, and mismatched object metadata.
- Publishing creates resource, version, file, and audit records atomically.
- Ownership prevents one author from editing or unpublishing another author's resource.
- Administrators can hide and restore resources and resolve reports.
- Downloading checks membership and visibility before R2 access.
- Existing Sites build and Worker fallback tests remain passing.

### Visual And Interaction

- Compare the coded 1440x1024 hero with the selected AI Core concept and the supplied layered-type reference at the same viewport.
- Verify the AI Core depth, typography scale, navigation height, content spacing, radii, and single-accent palette.
- Verify desktop, tablet, and mobile collapse rules.
- Test keyboard order, visible focus, WCAG AA contrast, reduced motion, loading, empty, error, and success states.
- Confirm all primary navigation, filters, search, publish, upload, download, save, report, and account actions work.

### Build Handoff

- Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` compatible with the existing Sites handoff.
- The implementation must pass `npm run test`, `npm run build`, and `npm run test:sites`.
- The final build must contain `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Explicit Non-Goals For Version One

- Public anonymous browsing.
- Invitation-only registration.
- Pre-publication approval.
- Comments, ratings, payments, billing, and organization subscriptions.
- Real-time multi-user editing or presence.
- Automated AI review of uploaded content.
