---
name: eventual-rsvp
description: Add events, registrations and tickets to an EmDash (Astro) site with the Eventual RSVP plugins — Core (events, venues, recurrence, feeds, ready-made event pages), Registrations (free RSVP) and Tickets (paid tickets). Use when installing or configuring these plugins, building event pages, wiring an RSVP or ticket form, finding a plugin ID, or styling the event pages.
---

# Eventual RSVP for EmDash

Eventual RSVP is three EmDash plugins. **Core** (`@vermeulen.solutions/eventual`, free, MIT) keeps events, venues and organizers in the site's own EmDash collections, handles recurring dates, serves JSON and iCalendar feeds, and ships two ready-made Astro page bodies. **Registrations** (`@vermeulen.solutions/eventual-attendance`, free, MIT) adds RSVP with places, a waiting list, approval and reminders. **Tickets** (`@vermeulen.solutions/eventual-tickets`, commercial licence) adds paid and free tickets, Stripe or invoice payment, QR tickets and door check-in. Registrations and Tickets need Core.

## Gotchas

These silently break sites. Check them before writing code.

1. **The npm package `eventual` is unrelated.** Never run `npm install eventual`. The packages are scoped: `@vermeulen.solutions/eventual`, `-attendance`, `-tickets`. A Registry install still needs these npm packages for the Astro components.
2. **One install route per plugin.** Install each plugin either from the EmDash Registry (Admin → Plugins → Registry) or from npm in `astro.config.mjs`, never both: EmDash would treat them as two plugins with separate settings and data.
3. **The plugin ID depends on the install route.** Every address and component prop must use it.

   | | Core | Registrations | Tickets |
   | --- | --- | --- | --- |
   | Registry install (same on every site) | `r_hxn32uyal53iahxf` | `r_lywzrupdtpjvkohn` | `r_qd5hk435vo2yqk2n` |
   | npm, in `astro.config.mjs` | `eventual` | `eventual-attendance` | `eventual-tickets` |

   Ask the user which route they used if it is not clear, and keep the IDs in one module (see [setup](references/setup.md#plugin-ids)). If the site's own admin shows a different ID than this table, the admin wins: use its value and tell the user.
4. **Core does not create collections.** Events, venues and organizers are EmDash collections made from Core's blueprint (`npx -p @vermeulen.solutions/eventual eventual-schema`), then chosen under **Event settings**. Without them the feeds answer that events are not connected.
5. **Event pages are server-rendered.** Every page using Core's loaders needs `export const prerender = false` (the month, view and category come from the address).
6. **Don't rebuild what Core ships.** Use `EventBrowser` and `EventDetail` with `loadEventBrowser` / `loadEventDetail` instead of fetching the feed and writing views by hand. Use each feed event's `calendarLinks` for "Add to calendar"; don't build Google/Outlook/ICS links yourself.
7. **Forms go inside `EventDetail`.** `RsvpForm` and `TicketCheckout` take the event's content ID and occurrence start: use `eventContentId(event)` and `occurrenceStart(event)`, not `event.id` (recurring dates have IDs like `<id>#<date>`).
8. **Theming is CSS properties.** Set `--eventual-*` (Core, Registrations) or `--et-*` (Tickets). The components' CSS sits in the `eventual` cascade layer, so site CSS wins without `!important`. Colours follow `color-scheme`, not the OS: see [theming](references/event-pages.md#theming).
9. **Moving a site from npm to the Registry loses plugin data** stored under the old ID (settings, registrations, orders, licence, calendar subscriber addresses). Read [setup](references/setup.md#moving-to-the-registry) before suggesting it.

## Typical tasks

| Task | Read |
| --- | --- |
| Install, collections, plugin IDs, moving to the Registry | [references/setup.md](references/setup.md) |
| Events page and event page, options, languages, theming | [references/event-pages.md](references/event-pages.md) |
| RSVP form, manage page, ticket checkout, order and door pages | [references/registrations-and-tickets.md](references/registrations-and-tickets.md) |

## Minimal working pages

`src/lib/eventual.ts` (one place for IDs and site settings; values here are for a Registry install):

```ts
export const CORE_ID = "r_hxn32uyal53iahxf";          // npm install: "eventual"
// With Registrations or Tickets, add RSVP_ID / TICKETS_ID and their paths: references/setup.md#plugin-ids
export const LOCALE = "en-GB";                          // any BCP 47 tag, e.g. "fr-CH"
export const TIME_ZONE = "Europe/London";
export const EVENTS_PATH = "/events";                   // must match the page folder
export const eventOptions = { pluginId: CORE_ID, locale: LOCALE, timeZone: TIME_ZONE, basePath: EVENTS_PATH };
```

`src/pages/events/index.astro`:

```astro
---
import EventBrowser from "@vermeulen.solutions/eventual/astro/EventBrowser.astro";
import { loadEventBrowser } from "@vermeulen.solutions/eventual/astro/events";
import Layout from "../../layouts/Layout.astro";
import { eventOptions } from "../../lib/eventual";

export const prerender = false;
const data = await loadEventBrowser(Astro.url, eventOptions);
Astro.response.status = data.status;
---
<Layout title={data.pageTitle} lang={data.lang}><EventBrowser data={data} /></Layout>
```

`src/pages/events/[id].astro`:

```astro
---
import EventDetail from "@vermeulen.solutions/eventual/astro/EventDetail.astro";
import { loadEventDetail } from "@vermeulen.solutions/eventual/astro/events";
import Layout from "../../layouts/Layout.astro";
import { eventOptions } from "../../lib/eventual";

export const prerender = false;
const data = await loadEventDetail(Astro.url, Astro.params.id, eventOptions);
Astro.response.status = data.status;
---
<Layout title={data.pageTitle} lang={data.lang}><EventDetail data={data} /></Layout>
```

Adapt the `Layout` props to the site's layout; `data.pageTitle`, `data.description` and `data.lang` are always set (also on 404 and 502). `data.lang` is the language the texts are in (`fr` for `fr-CH`), and `data.dir` is `rtl` for Arabic and Hebrew: pass it too if the site may use those. Per-page options extend the shared ones: `loadEventBrowser(Astro.url, { ...eventOptions, views: ["list", "month"] })`. Keep `Astro.response.status = data.status`: 502 when the feed cannot be reached, 404 for an unknown event.

## Where facts come from

- Docs as Markdown: https://eventual.rsvp/llms.txt (every package's docs and changelog).
- Core developer guide: https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/developer-guide.md
- In an installed project, the types are the final word: `node_modules/@vermeulen.solutions/eventual/astro/events/index.ts` (loader options and data), and each component's `interface Props`.
