# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

Brand identity: use the supplied image at `public/assets/brand/lbank-design-logo.png` only inside the circular brand mark, pair it with the separate name `L-Design`, and use the `#FFDB00` accent for primary actions and selected states.

Navigation taxonomy: organize icons by LBank business scenarios using All, Buy Crypto, Spot, Futures, Earn, Copy Trading, Campaigns, and Security; Chinese labels are 全部、买币、现货、合约、理财、跟单、活动、安全.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
