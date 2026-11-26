# Setup: install, collections, plugin IDs

Requires EmDash `>=1.2.0 <2.0.0` (1.4.0 or newer recommended) and Node 24+ for the command-line tools.

## Install (choose one route per plugin)

**From the EmDash Registry** (most sites): Admin → Plugins → Registry, search "Eventual RSVP" (publisher vermeulen.solutions), review the permissions, install. The owner does this in the running admin; nothing goes in `astro.config.mjs`. The site still needs the npm package for the Astro components and helpers:

```sh
npm install @vermeulen.solutions/eventual
# with Registrations / Tickets:
npm install @vermeulen.solutions/eventual-attendance @vermeulen.solutions/eventual-tickets
```

**From npm in the config** (the plugin runs in the site's own sandbox):

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import eventual from "@vermeulen.solutions/eventual";
import eventualAttendance from "@vermeulen.solutions/eventual-attendance";
import eventualTickets from "@vermeulen.solutions/eventual-tickets";

export default defineConfig({
  integrations: [
    emdash({
      // …the site's existing EmDash options…
      sandboxed: [eventual, eventualAttendance, eventualTickets],
      sandboxRunner: "@emdash-cms/cloudflare/sandbox", // on Node: "@emdash-cms/sandbox-workerd/sandbox"
    }),
  ],
});
```

Never both routes for the same plugin.

## Collections

Core reads events, venues and organizers from EmDash collections the site owns. It cannot create them (read-only schema permission). Export the blueprint, apply it, then select the collections in **Event settings**. The collections can be created before or after the plugin is installed.

```sh
npx -p @vermeulen.solutions/eventual eventual-schema --locale en --timezone Europe/London --output eventual-schema.json
# Only with Registrations or Tickets: add the shared capacity fields, then seed that file instead.
npx -p @vermeulen.solutions/eventual-capacity eventual-capacity-fields --merge eventual-schema.json --output eventual-schema-with-capacity.json
# Local SQLite site (use the site's real database path):
npx emdash seed eventual-schema.json --validate
npx emdash seed eventual-schema.json --database ./data.db --no-content --on-conflict error
```

Exporter options (`--help` lists them from Core 0.19.4): `--locale` (the site's default content language; default `fr`, so always pass it), `--timezone` (the time zone new events start in; otherwise the computer's), `--output` (required; it refuses to overwrite a file), `--event-collection activities`, `--venue-collection`, `--organizer-collection`, `--reuse-venues`, `--reuse-organizers`. The event collection's URL pattern is `/events/{slug}`, which matches an `src/pages/events/[id].astro` page (the loader accepts slugs). If the site's starter template ships its own seed, let EmDash apply that first, then seed Eventual's blueprint. For a populated or remote (D1) site, apply reviewed additive changes through the site's schema workflow instead of reseeding.

### Event settings

Admin → **Eventual RSVP** → **Event settings** (`/_emdash/admin/plugins/<coreId>/settings`). Choose **Event collection** (for example "Events (events)"), **Venue collection** and **Organizer collection**, then press **Save settings**: choices shown before saving are not stored. Leave **Show old events saved inside the plugin** off; it only serves events that versions before 0.13 stored inside the plugin, even if a "not connected" message suggests otherwise. There is no time-zone setting here: each event has its own time zone, defaulting to the blueprint's `--timezone`.

Leave **Show old events saved inside the plugin** off unless migrating data from before Core 0.14.

## Plugin IDs

| Install route | Core | Registrations | Tickets |
| --- | --- | --- | --- |
| EmDash Registry | `r_hxn32uyal53iahxf` | `r_lywzrupdtpjvkohn` | `r_qd5hk435vo2yqk2n` |
| npm, in `astro.config.mjs` | `eventual` | `eventual-attendance` | `eventual-tickets` |

EmDash derives a Registry ID from the publisher and the plugin's name, so these are the same on every site and never change. If the site's admin shows another ID, the admin is right: use its value and tell the user. If unsure which route a site uses, the admin shows the ID: Core's **Eventual RSVP** page address (`/_emdash/admin/plugins/<id>/events`) and its **Subscribe** links; Registrations' settings page under **Site setup**; the **Tickets** admin page.

Where the IDs go:

| Plugin | Use |
| --- | --- |
| Core | `pluginId` option of `loadEventBrowser`, `loadEventDetail`, `fetchPublicFeed`; routes `/_emdash/api/plugins/<id>/publicEvents`, `/calendar`, `/publicEventImage` |
| Registrations | `RsvpForm apiEndpoint="/_emdash/api/plugins/<id>/rsvp"`, `RsvpManage apiBase="/_emdash/api/plugins/<id>"` |
| Tickets | `apiBase="/_emdash/api/plugins/<id>"` on every Tickets component |

Keep the IDs in one module and build the paths from them:

```ts
// src/lib/eventual.ts
export const CORE_ID = "r_hxn32uyal53iahxf";
export const RSVP_ID = "r_lywzrupdtpjvkohn";
export const TICKETS_ID = "r_qd5hk435vo2yqk2n";
export const rsvpBase = `/_emdash/api/plugins/${RSVP_ID}`;
export const ticketsBase = `/_emdash/api/plugins/${TICKETS_ID}`;
```

Constants are enough: the IDs only change if the site switches install route. If the user wants them configurable, use Astro's `astro:env` (`envField` in `astro.config.mjs`, read from `astro:env/server`), not `import.meta.env`, whose private values are usually fixed when the site is built; and fall back with `||`, since an empty variable is `""`.

## Agent tools

Core has MCP tools for managing events (`<pluginId>__<tool>`). They are off after install: Admin → **Plugins**, expand the plugin, switch on **Agent access**. `updateSettings` requires `defaultTimezone` in every call.

## Moving to the Registry

A Registry install has a new ID and starts empty; data stored under the old ID stays in the database but the new install cannot read it. Events, venues and organizers (EmDash content) are not affected. What stays behind:

- **Core:** settings (select the collections again); the calendar subscription address changes (update links, tell subscribers, or redirect the old address); update counters restart; events stored inside the plugin from before 0.13 (migrate them first).
- **Registrations:** registrations, places taken, reminders, settings and the signing key for manage links. Move when no event has open registrations or upcoming bookings.
- **Tickets:** orders, tickets sold and check-ins (buyers' QR codes stop working and their places free up, so events can be oversold), ticket types and prices, settings including Stripe keys, and the licence key (paste the licence code again). The Stripe webhook address contains the plugin ID: point Stripe at the new address the **Tickets** page shows. Move when nothing is on sale.

Point the user to the docs before they move: https://eventual.rsvp/docs/

## Uninstalling

EmDash removes a plugin's code and keeps its stored data and settings unless the owner ticks **Also delete plugin storage data** in the uninstall dialog. The plugins have no uninstall step of their own. Before uninstalling, remove the pages and components that call the plugin, and tell the owner:

- **Core:** events, venues and organizers stay as ordinary content in the site's collections. Event pages built with Core's components and calendar subscriptions stop showing events. The box deletes only Core's settings (and events that versions before 0.13 kept inside the plugin).
- **Registrations:** registrations, waiting lists, answers and settings stay without the box, so a reinstall resumes. Forms, links in emails already sent and reminders stop working. If it will not be reinstalled, tick the box: the data is personal data. Capacity fields on events stay.
- **Tickets:** click **Deactivate** under **Licence** first (or later at licences.eventual.rsvp/manage). Orders, ticket types and settings, Stripe keys included, stay without the box. Checkout, order and QR pages stop working; uninstall after the last ticketed event. Delete the Stripe webhook endpoint that points to the site. Uninstalling does not cancel the yearly licence subscription.
