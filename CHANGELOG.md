# Changelog

All notable changes to Eventual RSVP – Core (formerly Eventual) are documented here.

## 0.18.5 - 2026-11-24

- **Registry installs: links now use the installed plugin ID.** A plugin installed from the EmDash Registry is addressed by a generated ID that starts with `r_`, not by `eventual`. Two links still used `eventual` and answered "Plugin route not found" on those sites: the **Subscribe** links on the Eventual RSVP admin page (calendar subscription and JSON feed), and the per-event `.ics` link in the public feed's `calendarLinks`. Both now use the installed ID. Config-managed installs keep `eventual`. ([#7](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/issues/7))
- **The per-event `.ics` link downloads one event.** The `calendar` route ignored `eventId`, so the link in `calendarLinks.ics` returned the whole year's calendar. It now returns that event only: every upcoming date of a repeating event, or one date when given an occurrence ID (`<id>#<date>`). The entry is chosen by its ID, so the link from a translated page gives that translation. An unknown, unpublished or past event answers 404. The subscription without `eventId` is unchanged.
- **Helpers:** `buildCalendarLinks(event, siteUrl, pluginId)` takes the plugin ID as an optional third argument (default `eventual`).
- **Astro showcase:** new optional `EVENTUAL_PLUGIN_ID` setting for the feed requests and the subscription link.
- **Documentation** ([#8](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/issues/8)): the developer guide is now `docs/developer-guide.md` (the old address points to it). It opens with one section on versions and where to get them, warns against the unrelated npm package `eventual`, explains why a site should have one backend only, and says where to turn on agent tools. The setup guide has the agent-tools steps too. The guide no longer says `fetchPublicFeed` cannot address a Registry install; it has accepted `pluginId` since 0.15.0.
- No permission or schema changes, and no new MCP tools.

## 0.18.4 - 2026-11-17

- **npm package: Block Kit is now an optional peer dependency** (`@emdash-cms/blocks >=1.2.0 <2.0.0`) instead of an exact 1.4.0 dependency. Eventual only uses its types, so sites use the Block Kit their EmDash installs. With the exact pin, an EmDash 1.5 site that also uses `@emdash-cms/cloudflare` 1.5.0 could not install the package without an npm or pnpm override.
- No runtime, permission or schema changes; the registry plugin is unchanged apart from its version.

## 0.18.3 - 2026-11-17

- **EmDash 1.5 support:** tested on EmDash 1.5.0. The source installer's admin adapter now recognises the 1.5 content-editor panel, which dropped an unused `reserveHeaderEnd` prop.
- **Newer EmDash versions are no longer refused.** `emdashWithEventual()` used to stop the build on any EmDash, admin or Blocks version outside the tested list. It now refuses only versions older than the oldest tested release (1.2.0) and prints a warning for newer untested ones. The same applies to Astro, Vite and React newer than the tested range.
- **Editor adapters step aside instead of failing the build.** If a newer admin or Blocks build no longer matches, Eventual prints a warning and uses EmDash's own editor for that part (for example untranslated panel labels) instead of stopping the site build.
- **Test suite:** the runtime integration suites no longer expire once their November 2026 fixture dates are in the past.
- No permission or schema changes, and no new MCP tools.

## 0.18.2 - 2026-11-14

- **Registry page:** new screenshots (the event editor, the public calendar, an event page and Event settings), and a description tab with links to the website, documentation and support.
- The **Setup guide** link on the Event settings page points to the repository's new name, `eventual-rsvp-core` (the old address redirects).
- No runtime, permission or schema changes.

## 0.18.1 - 2026-11-14

- **On npm as `@vermeulen.solutions/eventual`.** The optional Astro, schema and transfer helpers can now be installed with `npm install @vermeulen.solutions/eventual` instead of a downloaded source archive. Imports change from `eventual/…` to `@vermeulen.solutions/eventual/…` (for example `@vermeulen.solutions/eventual/astro`); the plugin ID stays `eventual`, so Registry installations, routes, data and settings are unchanged.
- Language packs come from `@vermeulen.solutions/eventual-locales` 0.1.10; Core's own dictionaries are unchanged.
- No runtime, permission or schema changes.

## 0.18.0 - 2026-11-14

- **New name: Eventual RSVP – Core** (formerly Eventual). The plugin ID stays `eventual`, so sites update in place; admin texts point to the **Event settings** page.
- **Fixed: busy months no longer break the public calendar.** The events feed and the calendar subscription looked up each event's web address separately, so about eight events in one range exceeded the sandbox's 10 calls and the page showed "Events are temporarily unavailable". Core now asks EmDash for one address per language and builds the rest from the collection's URL pattern with the same language prefix and trailing slash. URL patterns with date placeholders are looked up one by one while calls remain; events beyond that are listed without a link instead of failing the whole feed. To make room under the registry's 128 KB file limit, a few duplicated helpers were merged (the backend is now 130,636 bytes).
- The admin speaks 21 languages: English, French, German, Dutch, Spanish, Italian, Portuguese (Portugal and Brazil), Polish, Czech, Swedish, Danish, Norwegian Bokmål, Finnish, Japanese, Simplified Chinese, Korean, Turkish, Ukrainian, Arabic and Hebrew, with right-to-left layout for Arabic and Hebrew. English is built in; the other languages are language packs from the `@vermeulen.solutions/eventual-locales` npm package, downloaded on first use and kept in plugin storage. The French, German, Dutch and Spanish dictionaries moved out of the bundle into those packs.
- **New permission:** `network:request` to `cdn.jsdelivr.net` (the public npm CDN), only for the language packs. Each pack is checked against a hash built into the release; without network, a request stays in English and tries again a few minutes later. Administrators approve the plugin again when updating.
- Table buttons and status badges in admin pages (events list, dates panel) are translated; titles and other data cells are left as they are.
- Registry contacts are `support@eventual.rsvp` and `security@eventual.rsvp`.
- See [release notes](docs/release-notes-0.18.0.md).

## 0.17.0 - 2026-11-07

- Add complete native UI localization dictionaries for German (`de`), Dutch (`nl`), and Spanish (`es`) alongside French (`fr`) with normalized language-code fallback (`resolveLanguage`).
- Add universal 1-click "Add to Calendar" links (`buildCalendarLinks`) for Google Calendar, Outlook Web, Office 365, and direct Apple/desktop iCal (`.ics`) downloads, exposed on all `PublicEvent` payloads and the `<EventList showCalendarLinks={true} />` Astro component.
- Add single-event hydration query support (`eventId` parameter on `publicEvents`) handling both parent IDs and specific occurrence IDs.
- Full backwards compatibility: zero new permissions, schemas or MCP tools. EmDash `>=1.2.0 <2.0.0` compatible.
- See [release notes](docs/release-notes-0.17.0.md).

## 0.16.0 - 2026-11-02

- Parallelize public feed hydration and storage resolution: `getPublicUrl` calls across events, collection binding lookups, and venue/asset resolution branches run concurrently via `Promise.all`, substantially reducing Worker Loader RPC round-trips.
- Add `Cache-Control: public, max-age=3600, must-revalidate` header to `publicEventImage` route responses so browsers and edge caches can cache and revalidate plugin-streamed event images.
- Add optional `imageMedia?: { src: string; width?: number; height?: number; alt?: string }` metadata to `PublicEvent`, extracting direct media file paths (`/_emdash/api/media/file/<storageKey>`) and native dimensions from `featured_image` data. Astro and other modern frontends can pass images directly to image optimization services (`/_image`) and reuse decoded bitmap memory across route transitions.
- Full backwards compatibility: `imageUrl` remains unchanged and continues to resolve to `publicEventImage?eventId=...` as before. No schema changes, no new capabilities or MCP tools required.
- See [release notes](docs/release-notes-0.16.0.md).

## 0.15.0 - 2026-11-01

- Add optional typed cache dependency/expiry evidence to native public feeds, including empty lists and custom collection names, without extra dependency RPCs.
- Add Astro parsing for direct public runtime dispatch, explicit host TTL/split-feed merging, timezone label/midnight boundaries, and a Registry `pluginId` option for HTTP consumers.
- Caching remains host opt-in. Remaining lifetime is capped at 15 seconds, with no stale serving; cache integration requires EmDash >=1.4.0 <2.0.0. Existing >=1.2.0 rendering compatibility, identities, schemas, locale/recurrence behavior and permissions are preserved.
- Document native/plugin invalidation differences, source freshness and authentication bypass limits, upstream requirements, and a BBHC adoption checklist. Verify real production-built parent HTML, privacy, time changes and failed purges on disposable hosts.
- See [release notes](docs/release-notes-0.15.0.md) and the [integration guide](docs/public-feed-caching.md). Hosted Cloudflare acceptance remains a host-site responsibility.

## 0.14.1 - 2026-10-30

- Compatibility release with no runtime API, capability, schema, route or MCP-tool changes.
- Tested against EmDash **1.2.0 and 1.4.0**. **1.4.0 is recommended**: it fixes nested Block Kit forms and Cloudflare plugin mutations. 1.2/1.3 remain supported with those host limitations.
- The source `eventual/install` editor transform now handles both the 1.2/1.3 `<form>` renderer and the 1.4 `div[role="group"]` renderer, and its version gate accepts 1.2.0 and 1.4.0.
- The local test site now runs the native-collection gate on EmDash 1.4.0 in development and production. See [release notes](docs/release-notes-0.14.1.md).

## 0.14.0 - 2026-10-14 (breaking)

- **Public reads no longer fall back to private plugin storage by default.** When no event content type is configured or the selected one is missing, `publicEvents`, the calendar feed and the calendar-state reconciliation now fail with an actionable error instead of silently serving old plugin records — the failure mode that labelled French events `[EN]` and hid the events from editors. Administrators turn on **Show old events saved inside the plugin** in Eventual RSVP settings, or set `legacyReads` through MCP `updateSettings`, to keep serving that data.
- The settings page shows the switch with a plain-language explanation, and the "Connect Eventual RSVP to content types" panel says whether public feeds fail or show the old events.
- Migration, legacy write tools and native reads are unchanged. See [release notes](docs/release-notes-0.14.0.md).
- Acceptance restored French recurrence weekday labels, refreshed the settings screenshot, and verified the live switch on EmDash 1.2.0. [Publication record](audit/releases/0.14.0/README.md).

## 0.13.4 - 2026-10-11

- Replace the 0.11-era public event detail screenshot in the registry gallery. Its derived 2000 px lossless `feed_thumbnail` measured 1,196,250 bytes, above EmDash's 1 MiB artifact proxy cap, so releases 0.11.0–0.13.3 show a failing image in the admin gallery. The current `images/registry-0.13.4/public-event-detail-fr-desktop.png` capture derives to roughly 483 KB.
- Add `npm run registry:media`, enforced in CI and `npm run release:prepare`, with a `--published <version>` check of the real CDN bytes. No runtime, capability, schema or route changes. See [release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/9bd38934de72c562639093e38a56fe6b3e3e2818/docs/release-notes-0.13.4.md).

## 0.13.3 - 2026-10-09

- Add `publicUrls=false` to the public JSON feed and optional Astro helper to skip canonical URL RPCs when the consumer supplies event links. The default remains `true`; locale selection, recurrence, relationships and media are preserved.
- Throw sandbox budget failures from the JSON route so EmDash returns a failed, uncacheable request instead of wrapping a raw error response in successful JSON.
- Add focused RPC-count, input-validation and EmDash runtime response-contract regressions. Large-source pagination remains deferred. See [release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/9bd38934de72c562639093e38a56fe6b3e3e2818/docs/release-notes-0.13.3.md).

## 0.13.2 - 2026-10-08

- Request-scoped settings/schema/directory/URL memoization and sandbox RPC accounting for public reads, native MCP reads, panels, policies and imports.
- Atomic aggregate calendar reconciliation replaces per-group reads/writes, preserving existing identities and cancellation history.
- Authoritative, deduplicated canonical URLs; direct native image retrieval with indexed legacy aliases.
- Batch legacy import/reference reads and cancellation writes; resumable pending import rows and fail-closed scheduled-draft dependency checks.
- Public requests fail explicitly before an eleventh call. Large native sources and the legacy migration/mutation job redesign remain limited; Cloudflare CPU headroom is not certified by local tests. See [release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/9bd38934de72c562639093e38a56fe6b3e3e2818/docs/release-notes-0.13.2.md).

## 0.13.1 - 2026-10-08

- Route public featured event image requests to the plugin's public image streamer endpoint (`/_emdash/api/plugins/eventual/publicEventImage?eventId=<eventId>`) instead of private CMS media asset URLs (`/_emdash/api/media/asset/`), preventing 401 Unauthorized errors on unauthenticated Astro frontends.
- Hydrate `event.imageUrl` from `featuredMediaId` / `imageMediaId` in `hydrateNativeAssets`, `formatPublicEvent`, and `eventRecordToPublicEvent`.

## 0.13.0 - 2026-10-07 (breaking)

- Requires EmDash >=1.2.0 <2.0.0. Native content types own events, venues, organizers, rich text, translations, drafts, revisions and publication.
- Self-contained sandbox schedule/recurrence/occurrence controls; no mandatory Eventual RSVP frontend/host package.
- Configurable collections, validated directory references, dependency guards, native MCP inspection/export and safe duplication.
- Clean default schemas: 19 event fields, comma-separated categories in core, no duplicate category control or default prototype metadata.
- Optional schema exporter/MCP setup prompt and explicit opt-in non-destructive migration compatibility.
- Multilingual JSON/ICS, stable UIDs, cancellation notices, rich description blocks and optional localized Astro/JSON-LD helpers.
- Breaking upgrades require backup, host/schema review, collection selection and explicit legacy migration. Existing schemas are not automatically stripped or converted. Preserve migrated calendar identity. See [upgrade guide](docs/upgrade-0.13.0.md) and [release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/9bd38934de72c562639093e38a56fe6b3e3e2818/docs/release-notes-0.13.0.md).
- Existing styling is preserved. Internal fields remain visible in stock core; no hidden Advanced renderer or complete concurrent-write transaction is claimed.

## 0.12.1 - unreleased proposal, superseded by 0.13.0

The earlier two-package recovery proposal was not released. Its installation and hidden-field claims are superseded by 0.13.0. Do not install its draft host artifacts on EmDash 1.2.

## 0.12.0

Initial native-collection modernization. Upgrade through the breaking 0.13.0 runbook; a plugin update alone does not provision schemas or migrate data.

## 0.11.1

- Allow EmDash Editors to manage Eventual RSVP events, venues, organizers, and settings through the Editor-level `content:edit_any` permission. MCP management tools and plugin installation remain restricted to administrators.

## 0.11.0

- Physical, virtual, and hybrid attendance with validated HTTP(S) meeting links.
- Draft, published, cancelled, postponed, and rescheduled event lifecycle states.
- Saved organizers directory and structured addresses (`addressParts`) for saved venues.
- Bounded schedule history and safer draft duplication.
- iCalendar lifecycle states (`STATUS:CONFIRMED`, `STATUS:TENTATIVE`, `STATUS:CANCELLED`) and virtual meeting URLs.
- Headless Schema.org `Event` JSON-LD generator with safe embedding and matching Astro detail pages.
- Strict MCP inputs without bundling Zod code into sandbox bundle; automated bundle size budgets.
- Paginated event, venue, and organizer exports; bounded, previewable, insert-only imports with retry protection.
- Host-side CSV and limited ICS conversion utilities in `eventual/transfer`.
- Comprehensive timezone coverage testing under UTC and America/New_York.

## 0.10.0

- Event list publication status and upcoming/past start date filters that persist during pagination.
- Stale event and venue editing detection to prevent concurrent overwrite collisions.
- Site integration guidance in Eventual RSVP Settings (public JSON feed and iCalendar paths, link to Astro example).

## 0.9.2

- Prominent save guidance banner near the top of the event editor to help users navigate long forms.
- Accurate form submit guidance for standard EmDash sandbox layouts.

## 0.9.1

- Correct registry installation guidance and event editor admin hints to match current EmDash plugin manager navigation (**Admin → Plugins → Eventual RSVP → Agent access**).

## 0.9.0

- EmDash 1.0.1 and Block Kit modernization.
- Paged Block Kit tables for event and venue lists.
- Clickable event titles, row actions (Edit, Duplicate, Delete), and confirmed bulk deletion (up to 25 events per page).
- Event forms retain submitted values after validation errors, with timezone search and schedule previews.
- Configurable admin time display (24-hour default or 12-hour AM/PM) for admin event list and dashboard widget.
- Public JSON, calendar, and MCP scans fail explicitly when matching records exceed 10,000 rather than silently truncating.
- Shared `eventual/astro` client export and unstyled `EventList.astro` component.

## 0.8.0

- Expanded Astro event browser example with seven responsive layouts (list, timeline, cards, schedule, dates, month, locations).
- Single multiline description field with lightweight Markdown formatting support (`**bold**`, `_italic_`, `## Heading`, bullet lists, links) preserving raw HTML safety.
- Improved event form layout, featured image placement near title, and save button discoverability.

## 0.7.5

- Streamlined description editor directly in the main event form replacing separate multi-section management.
- Markdown syntax guide beside form; preservation of imported HTML descriptions.

## 0.7.0

- **Manage occurrence dates** view for recurring events: paginated 90-day window to cancel, move, or restore individual dates.
- Added `eventual__listOccurrences` MCP tool (16 tools total) for agent inspection of recurrence exceptions.
- Recurrence interval support (1 to 52) for daily, weekly, and monthly series with wall-clock preservation across DST.
- Multi-weekday selection for weekly recurring events.
- Preservation of explicit day-of-month recurrence rules (e.g., 31st with February last-day fallback).

## 0.6.0

- 15 schema-backed MCP tools under `eventual__` namespace for events, publication, occurrence exceptions, venues, and timezones.
- Added `upcoming-events` dashboard widget for EmDash.
- Recurrence schedule validation rejecting changes that would orphan saved occurrence exceptions.
- Venue deletion protection rejecting venues assigned to events.
- Verification against EmDash 128 KiB backend and 256 KiB total package size limits.

## 0.5.0

- Initial MIT-licensed release of sandboxed Eventual RSVP plugin for EmDash CMS.
- Event and venue storage in plugin-owned SQLite KV database.
- Public JSON feed (`/_emdash/api/plugins/eventual/publicEvents`) and iCalendar subscription (`/_emdash/api/plugins/eventual/calendar`).
- Media library cover image integration (up to 8 MiB).
- Initial Astro event browser example with month calendar and single-event `.ics` export.
