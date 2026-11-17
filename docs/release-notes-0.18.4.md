# Eventual RSVP – Core 0.18.4 — npm install fix

- **The npm package no longer pins Block Kit.** `@vermeulen.solutions/eventual` now declares `@emdash-cms/blocks` as an optional peer dependency (`>=1.2.0 <2.0.0`) instead of requiring exactly 1.4.0. Eventual only uses its types, so a site gets the Block Kit its EmDash version brings. Sites on EmDash 1.5 with `@emdash-cms/cloudflare` 1.5.0 needed an npm or pnpm override to install 0.18.3; they can remove it.
- **Nothing else changes**: no runtime, permission or schema changes, and no new MCP tools. Registry installs behave exactly as 0.18.3. EmDash `>=1.2.0 <2.0.0` (tested on 1.2.0, 1.4.0 and 1.5.0).
