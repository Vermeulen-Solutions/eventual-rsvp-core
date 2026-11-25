# Developer guide — Eventual RSVP – Core

EmDash collections own content, rich text, languages, drafts, revisions and publication. Eventual's sandbox supplies schedule validation, recurrence, saved-entry controls and feeds. See [setup](collection-setup.md) and [upgrading](upgrade-0.13.0.md).

The [public feed caching guide](public-feed-caching.md) describes additive
dependency/expiry metadata, direct runtime dispatch and the host's explicit opt-in.

## Versions and where to get them

One version number covers everything. Use the same one in all three places:

| What | Where | Notes |
| --- | --- | --- |
| Backend and editor controls | EmDash admin, **Plugins → Registry**: **Eventual RSVP – Core** by **vermeulen.solutions** | The current version is on the Registry page and in the [changelog](../CHANGELOG.md). |
| Astro, schema and transfer helpers | npm: [`@vermeulen.solutions/eventual`](https://www.npmjs.com/package/@vermeulen.solutions/eventual) | Optional. Not part of the Registry download. |
| Source | Git tag `v<version>` in this repository | For building from a checkout. |

```sh
npm install @vermeulen.solutions/eventual
```

That installs the newest helpers. If the site's Registry backend is older, pin the same version instead, for example `npm install @vermeulen.solutions/eventual@0.18.4`.

**Do not run `npm install eventual`.** The unscoped name `eventual` on npm is an unrelated package by another author. Import the helpers as `@vermeulen.solutions/eventual/astro`, `@vermeulen.solutions/eventual/schema` and so on.

Versions before 0.18.1 were never on npm. Their source archives (`eventual-<version>.tgz`) are attached to the [GitHub releases](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/releases), which stop at 0.16.0. For 0.17.0 and 0.18.0, build from the Git tag.

To build the helpers from a checkout of a tag, run `npm ci`, `npm run build` and `npm pack`.

## Installation and plugin ID

There are two ways to run the backend:

- **Registry install:** installed from the EmDash admin. The host downloads the bundle and runs it in its sandbox. Cloudflare hosts need Worker Loader and PluginBridge: [EmDash sandbox setup](https://docs.emdashcms.com/deployment/plugin-sandbox/).
- **Config-managed install:** the npm package is listed in `astro.config.mjs` under `sandboxed: [eventual]`.

**The plugin ID differs between the two.** A config-managed install has the ID `eventual`. A Registry install has a generated ID that starts with `r_`, such as `r_hxn32uyal53iahxf`. EmDash derives it from the publisher and the plugin's Registry name, so it is the same on every site and does not change on update.

The ID is part of every route URL (`/_emdash/api/plugins/<pluginId>/…`) and of every MCP tool name (`<pluginId>__<toolName>`). To find it:

- Open **Eventual RSVP** in the admin and look at the **Subscribe** links at the bottom of the page (shown once an event collection is connected): they contain the ID. So does the address of the page itself (`/_emdash/admin/plugins/<pluginId>/events`).
- Or read it from the install result or authenticated `GET /_emdash/api/admin/plugins`.

Since 0.18.5 every link Eventual builds itself (the admin's Subscribe links and the per-event `.ics` link in the feed) uses the installed ID. Links your own pages build must use it too: pass `pluginId` to `fetchPublicFeed` (see [Astro integration](#astro-integration)).

**Use one backend per site.** Do not install from the Registry and also list the package under `sandboxed`. EmDash treats the two as different plugins, because their IDs differ:

- Each keeps its own settings and storage. Collections connected in one are not connected in the other.
- Both run their checks when an event is saved, so one save can be handled twice.
- The admin shows two sets of Eventual pages, and the site has two feeds at two addresses.

The source installer (`emdashWithEventual`) stops the build when it finds the backend listed twice in the config; it cannot see a Registry install.

### Moving a site from the config to the Registry

EmDash keeps each plugin's own data under its plugin ID. A Registry install has a new ID, so it starts empty, and what the old install stored stays behind under `eventual`. It is not deleted, but the new install cannot read it. Events, venues and organizers are EmDash content and are not affected.

What stays behind, and what to do:

- **Settings.** Select the collections again under **Event settings** (or with the `updateSettings` tool), and set the default time zone again.
- **Calendar subscribers.** The subscription address contains the plugin ID. Anyone subscribed to `/_emdash/api/plugins/eventual/calendar` gets "not found" once the old install is removed, and their calendar app stops updating without telling them. Update the links on your pages before the move, and tell regular subscribers the new address, or keep the old address working with a redirect on your site.
- **Calendar state.** Update counters (`SEQUENCE`) start again from 0, and cancellations already sent are not sent again. Calendar apps that re-read the subscription are not affected; an event a visitor imported as a single `.ics` file may not update.
- **Old events stored inside the plugin** (from before 0.13): migrate them to a collection first, as in [upgrading](upgrade-0.13.0.md).

Registrations and Tickets keep much more under their own IDs (registrations, orders, signing keys, payment settings). Read their guides before moving them.


Source tooling needs Node 24+. Peer ranges are in [package.json](../package.json); release acceptance uses EmDash/Admin/Block Kit **1.2.0 and 1.4.0**, Astro 7.3.x/7.4.x and React 19. The source `@vermeulen.solutions/eventual/install` lane is tested on 1.2.0, 1.4.0, 1.5.0 and 1.6.0. It refuses only hosts older than 1.2.0; a newer untested host builds with a warning, and an editor adapter that no longer matches the admin build steps aside (with a warning) so EmDash's own editor is used. Registry installs never execute that transform.

| Host | Status | Notes |
| --- | --- | --- |
| 1.2.0 | supported, unit-tested | Panel Enter/validation is scoped to the outer content-editor form; Cloudflare cross-isolate plugin mutations can fail. |
| 1.3.x | supported, untested | Same form/Cloudflare limitations; includes the plugin-storage cursor fix. |
| 1.4.x | supported, full acceptance | Recommended. Fixes nested Block Kit forms and Cloudflare plugin mutations. |
| 1.5.x | supported, host-tested | 1.5.0 passes the native-site and plugin integration suites; the admin adapter recognises its editor panel. |
| 1.6.x | supported, host-tested | 1.6.0 passes the browser acceptance on a fresh site with the sandbox runner 0.9.8; both admin adapters apply to its builds. |
| newer | allowed with a warning | Not yet tested. Check the event editor after upgrading. |

## Public routes

Routes are relative to `/_emdash/api/plugins/<pluginId>/`.

| Route | Inputs and behavior |
| --- | --- |
| `GET publicEvents` | Inclusive `from`/`through` dates (YYYY-MM-DD); default UTC today through 180 days later; maximum 366 inclusive dates. Also `locale`, `strict` (false), `category`, `publicUrls` (true). |
| `GET calendar` | Raw text/calendar; fixed window from UTC today through 365 days later. Supports locale, strict and category. |
| `GET calendar?eventId=…` | The same format for one event: its upcoming dates, or one date with an occurrence ID (`<id>#<date>`, as in the JSON feed). The entry is chosen by its ID, so no `locale` is needed. Same UID as in the subscription. 404 when the event is unknown, unpublished or over. |
| `GET publicEventImage?eventId=…` | Published featured image with MIME/size checks; absent, unpublished or disabled legacy images return 404. |

`strict=true` omits events without the requested translation; false can use another language with a `[FR]`/`[EN]` title prefix. Categories match without case sensitivity. `publicUrls=false` skips native canonical-URL lookups; slug/id remain available for site-owned links.

JSON success:

```json
{"success":true,"data":{"ok":true,"from":"2026-11-01","through":"2026-11-30","events":[]}}
```

The feed has no top-level locale. Event rows carry title, description/plain text, optional descriptionBlocks, start/end, allDay, timezone, location, organizer, externalUrl, imageUrl, categories, venue and directionsUrl. Optional native metadata includes locale, translationGroup, slug and publicUrl. Business status is `status`, not `eventStatus`: see [PublicEvent](../src/public-event.ts). All-day end dates are inclusive here and exclusive in ICS.

Handle both `success:false` host failures and `data.ok:false` plugin failures. EmDash 1.2.0 JSON configuration/RPC failures use HTTP 400, ROUTE_ERROR and private/no-store caching. Preserve errors instead of substituting stale rows or a successful empty feed.

## Astro integration

`fetchPublicFeed(origin, from, through, category, {locale, strict, publicUrls, pluginId})` from `@vermeulen.solutions/eventual/astro` validates responses and throws FeedError. **On a Registry install, pass `pluginId`** (since 0.15.0); without it the helper requests `eventual` and the host answers "Plugin route not found":

```ts
import { fetchPublicFeed } from '@vermeulen.solutions/eventual/astro';

const pluginId = import.meta.env.EVENTUAL_PLUGIN_ID ?? 'eventual';
const feed = await fetchPublicFeed(Astro.url.origin, '2026-11-01', '2026-11-30', '', { pluginId, locale: 'fr' });
```

The [showcase](../examples/astro-events/README.md) reads the same ID from `EVENTUAL_PLUGIN_ID`. To skip the HTTP round trip on the same host, call EmDash's SSR dispatcher with the same ID:

```ts
const url = new URL(`/_emdash/api/plugins/${pluginId}/publicEvents`, Astro.url);
url.searchParams.set('from', '2026-11-01');
url.searchParams.set('through', '2026-11-30');
url.searchParams.set('locale', 'fr');
const runtime = Astro.locals.emdash;
if (!runtime) throw new Error('EmDash is unavailable');
const result = await runtime.handlePublicPluginApiRoute(
  pluginId, 'GET', '/publicEvents', new Request(url),
);
if (!result.success) throw new Error(result.error?.message ?? 'Event feed unavailable');
// Validate result.data.ok and result.data.events before rendering.
```

Each feed event carries `calendarLinks` (Google, Outlook, Office 365 and `.ics`), already built with the installed ID. The `.ics` link downloads that event only (`calendar?eventId=…`); before 0.18.5 it returned the whole calendar. `buildCalendarLinks(event, siteUrl, pluginId)` builds the same links on your side and takes the ID as its third argument.

`@vermeulen.solutions/eventual/astro/EventList.astro` is an optional plain list (title, status, date, venue and, with `showCalendarLinks`, calendar buttons). Since 0.18.7 it has light default styles in the `eventual` cascade layer, so your own CSS always wins: neutral colours follow the surrounding text colour, and the link and status colours follow the page's `color-scheme` (set `color-scheme: dark` where it sits on a dark surface). Adjust them with `--eventual-list-accent`, `--eventual-list-muted`, `--eventual-list-border`, `--eventual-list-radius`, `--eventual-list-cancelled` and `--eventual-list-rescheduled`. JSON-LD helpers are eventToJsonLd and serializeJsonLd; use the safe serializer. For full events pages, use the components below.

## Event pages

Since 0.19.0 the package has two complete page bodies: `EventBrowser` (the events page, with seven views) and `EventDetail` (one event). A loader fetches the feed and returns everything a page needs, including the HTTP status; you render the component inside your own layout. They are site code: nothing here counts towards the plugin's sandbox size.

`src/pages/events.astro`:

```astro
---
import EventBrowser from "@vermeulen.solutions/eventual/astro/EventBrowser.astro";
import { loadEventBrowser } from "@vermeulen.solutions/eventual/astro/events";
import Layout from "../layouts/Layout.astro";

export const prerender = false;
const data = await loadEventBrowser(Astro.url, { pluginId: "eventual", locale: "fr-CH", timeZone: "Europe/Zurich" });
Astro.response.status = data.status;
---
<Layout title={data.pageTitle}><EventBrowser data={data} /></Layout>
```

`src/pages/events/[id].astro`:

```astro
---
import EventDetail from "@vermeulen.solutions/eventual/astro/EventDetail.astro";
import { eventContentId, loadEventDetail, occurrenceStart } from "@vermeulen.solutions/eventual/astro/events";
import RsvpForm from "@vermeulen.solutions/eventual-attendance/astro/RsvpForm.astro";
import Layout from "../../layouts/Layout.astro";

export const prerender = false;
const data = await loadEventDetail(Astro.url, Astro.params.id, { pluginId: "eventual", locale: "fr-CH" });
Astro.response.status = data.status;
---
<Layout title={data.pageTitle}>
  <EventDetail data={data}>
    {data.event && <RsvpForm eventId={eventContentId(data.event)} occurrenceStart={occurrenceStart(data.event)} />}
  </EventDetail>
</Layout>
```

Anything inside `EventDetail` (Registrations' `RsvpForm`, Tickets' `TicketCheckout`) appears after the description. On a static site keep `prerender = false` on both pages, since they read the month and the view from the address.

**Loader options** (both loaders):

| Option | Default | What it does |
|---|---|---|
| `pluginId` | `eventual` | The installed ID; `r_…` for a Registry install ([how to find it](#installation-and-plugin-id)). |
| `origin` | the page's own | The EmDash site that serves the feed, when the pages run elsewhere. |
| `locale` | `en` | Page texts (21 languages), date formats, first day of the week, and the content language asked from the feed. Arabic and Hebrew pages are right to left. |
| `contentLocale`, `strict` | language of `locale`, `false` | The feed's content language, and whether to leave out events not translated into it. |
| `timeZone` | `UTC` | The zone for "this month" and "today". Each event keeps its own zone. |
| `basePath` | `/events` | The events page's address; detail links are `<basePath>/<slug>`. |
| `linkTo` | `detail` | `cms` links to the entry's own public page when it has one. |
| `views`, `defaultView` | all seven, `list` | The views offered, in order: `list`, `timeline`, `cards`, `schedule`, `dates`, `month`, `locations`. |
| `view`, `month`, `category` | from the address | Fix a value instead of reading `?view=`, `?month=` or `?category=`. |

**Component props:** `EventBrowser` takes `headingLevel` (1, or 2 inside another page), `title`, `intro` (`false` for none), `id`, `showFilter`, `showViewSwitch` and `scheme`. `EventDetail` takes `headingLevel`, `backHref` (`false` for none), `showSubscribe`, `jsonLd` (Event structured data, on by default) and `scheme`.

**Look and theming.** The styles are in the `eventual` cascade layer, so any CSS of your own wins. Neutral colours follow the surrounding text colour, so the pages suit any background; the accent and status colours follow the page's `color-scheme` (set `color-scheme: light dark` on your page, or pass `scheme="dark"` where a block sits on a dark surface). Override these properties on the component or any ancestor; Registrations and Tickets read the same names:

| Property | Default |
|---|---|
| `--eventual-primary`, `--eventual-on-primary` | blue (`light-dark(#075985, #7dd3fc)`) and the text on it |
| `--eventual-text-muted`, `--eventual-border`, `--eventual-surface` | the text colour at 72%, 14% and 3% |
| `--eventual-cancelled`, `--eventual-changed`, `--eventual-error` | red, amber, red |
| `--eventual-radius`, `--eventual-control-radius`, `--eventual-focus`, `--eventual-gap` | `0.875rem`, `0.5rem`, the primary colour, `1rem` |

Layouts adapt to the width of the component, not the window (container queries): the month grid becomes a day list below about 700 pixels, and images drop out of narrow rows. All classes start with `eventual-`.

**Accessibility.** Status (cancelled, postponed, rescheduled) shows in every view, each event's content language is marked, the month grid reads full day names and dates, today is marked, and links that open a new tab say so. Checked with axe (WCAG 2.2 AA) in all views in light and dark, and on a 375-pixel screen at 200% text size.

**Lower level.** `buildEventBrowserData(events, url, options)` and `buildEventDetailData(events, id, url, options)` do the same without fetching, for example when you call the SSR dispatcher yourself. `eventPageText(locale)` gives the translated texts. The texts live in the `core-site` namespace of `@vermeulen.solutions/eventual-locales`.

The [example site](../examples/astro-events/README.md) uses both pages with a green accent.

## Settings, tools and transfer

Tools `getSettings` and `updateSettings` use `mcp/settings/get` and `mcp/settings/update`. **updateSettings requires defaultTimezone**, even when only changing legacyReads. Read and retain its value first:

```json
{"defaultTimezone":"Europe/Paris","legacyReads":false}
```

Optional collections contains `{events,venues,organizers}`. Native timezone defaults belong to the schema. Only stored boolean true enables legacy public reads. Native collections stay authoritative; broken explicit bindings always error. Both MCP and admin `save-legacy-reads` invalidate the request memo.

**Agent tools are off after installation.** To turn them on, open **Plugins** in the EmDash admin, expand the details of **Eventual RSVP – Core** and switch on **Agent access**. Tool names start with the installed plugin ID (`<pluginId>__listEvents`). Eventual tools require plugins:manage; native editing uses core content tools and content:edit_any. Read tools: listEvents, getEvent, listOccurrences, listVenues, listOrganizers. Legacy writes are blocked once native collections are active. [Tool schemas](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/src/mcp-schemas.ts) define exact inputs/routes.

exportRecords follows cursors (default 5, maximum 10). Native native-content-v1 exports are inspection records, not full backups or legacy-import input. previewImport/importRecords accept legacy data only: at most 10 rows / 64 KiB, insert absent IDs, and import events as drafts. The [@vermeulen.solutions/eventual/transfer interface](../transfer/index.d.mts) supplies legacy backup/copy/CSV/ICS helpers. CSV needs stable source IDs and explicit-offset timed dates; all-day ends are inclusive. ICS conversion accepts standalone UTC or VALUE=DATE events and rejects unsupported recurrence/timezone constructs. Media, settings, revisions and calendar-state recovery need the host's backup facilities.

## Limits and checks

Each request may make a limited number of calls to EmDash. The two public feeds (`publicEvents`, `calendar`) use up to 30, which EmDash allows on Cloudflare since 1.5 and which Node does not limit; on Cloudflare with EmDash 1.4 or older a very large feed fails with the host's error instead. Everything else stays within 10. Measured on a Node test site with 0.18.7: both feeds served 714 upcoming one-off events, and the calendar's saved state takes about 540 bytes per event against its 1 MiB limit (roughly 1,900 events). A weekly series counts once, however many dates it has. The budget can still constrain dependency checks and migration. Smaller date windows or publicUrls=false help some JSON requests; complete-source scans still cost calls. Native exceptions/occurrence copy are bounded at 500 items; calendar group/state/output bounds also apply and fail explicitly. Background migration jobs and bulk APIs remain pending: [Eventual #5](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/issues/5), [EmDash #4004](https://github.com/emdash-cms/emdash/issues/4004).

Calendar UIDs, monotonic SEQUENCE and 366-day cancellation retention support reconciliation. Preserve migrated calendar_uid values. Publication shares schedule fields across languages; pending drafts stay separate. Stale-form checks are not an atomic write lock. Some settings copy remains English in the French admin; stock development-renderer diagnostics are recorded in acceptance.

Runtime checks: npm run validate, typecheck, build, bundle, budget, and npm test. Tooling/package/editor/media changes have test:tooling, test:package, test:editor and registry:media checks. `node scripts/audit-documentation.mjs` checks local links and Registry section caps. Publishing uses the pinned CLI; immutable releases and current profile/release CIDs need separate approvals. [Release evidence](../audit/releases/0.14.0/README.md).
