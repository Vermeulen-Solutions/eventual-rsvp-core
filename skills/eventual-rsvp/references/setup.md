# Setup: install, collections, plugin IDs

Requires EmDash `>=1.2.0 <2.0.0` (1.4.0 or newer recommended) and Node 24+ for the command-line tools.

## Install (choose one route per plugin)

**From the EmDash Registry** (most sites): Admin → Plugins → Registry, search "Eventual RSVP" (publisher vermeulen.solutions), review the permissions, install. The site still needs the npm package for the Astro components and helpers:

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

Core reads events, venues and organizers from EmDash collections the site owns. It cannot create them (read-only schema permission). Export the blueprint, apply it, then select the collections in **Event settings**:

```sh
npx -p @vermeulen.solutions/eventual eventual-schema --locale en --output eventual-schema.json
# With Registrations or Tickets, add the shared capacity fields:
npx -p @vermeulen.solutions/eventual-capacity eventual-capacity-fields --merge eventual-schema.json --output eventual-schema-with-capacity.json
# New local SQLite site:
npx emdash seed eventual-schema-with-capacity.json --validate
npx emdash seed eventual-schema-with-capacity.json --database ./data.db --no-content --on-conflict error
```

Options: `--timezone Europe/London` (default for new events; otherwise the computer's), `--event-collection activities`, `--reuse-venues`, `--reuse-organizers`. Use a locale the site already has. The exporter refuses to overwrite a file. For a populated or remote (D1) site, apply reviewed additive changes through the site's schema workflow instead of reseeding.

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

- **Core:** settings (select the collections and default time zone again); the calendar subscription address changes (update links, tell subscribers, or redirect the old address); update counters restart; events stored inside the plugin from before 0.13 (migrate them first).
- **Registrations:** registrations, places taken, reminders, settings and the signing key for manage links. Move when no event has open registrations or upcoming bookings.
- **Tickets:** orders, tickets sold and check-ins (buyers' QR codes stop working and their places free up, so events can be oversold), ticket types and prices, settings including Stripe keys, and the licence key (paste the licence code again). The Stripe webhook address contains the plugin ID: point Stripe at the new address the **Tickets** page shows. Move when nothing is on sale.

Point the user to the docs before they move: https://eventual.rsvp/docs/
