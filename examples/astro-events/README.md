# Astro event pages example

A small Astro site that shows Eventual's events with the components from the npm package: `EventBrowser` (list, timeline, cards, schedule, date strip, month and locations views) on `/events`, and `EventDetail` (details, calendar actions, structured data) on `/events/<slug>`. Each page is about ten lines. Navigation, filters and menus are plain HTML, without client JavaScript.

The components bring their own light and dark styles. This example only lays out the page and changes the accent colour to green in [`src/styles/global.css`](src/styles/global.css), to show how a site themes them.

## Run it

Use Node 24+ and a reachable EmDash site with published Eventual events. The example depends on the parent package (`file:../..`).

```sh
# From the repository root:
npm ci
cd examples/astro-events
npm ci
cp .env.example .env
npm run dev
```

In PowerShell, use `Copy-Item .env.example .env`. Edit the environment values:

```env
EVENTUAL_API_ORIGIN=http://127.0.0.1:4322
EVENTUAL_LOCALE=fr
EVENTUAL_DISPLAY_TIMEZONE=Europe/Paris
# Only for a Registry install:
EVENTUAL_PLUGIN_ID=r_xxxxxxxxxxxxxxxx
```

Open the URL Astro prints; its default port is 4321 and `/` redirects to `/events`.

## What the pages do

- **Plugin ID:** requests and calendar links use **eventual** unless `EVENTUAL_PLUGIN_ID` is set. A Registry install has a generated ID that starts with `r_`; copy it from the **Subscribe** links on the Eventual RSVP admin page. See the [developer guide](../../docs/developer-guide.md#installation-and-plugin-id).
- **Language:** `EVENTUAL_LOCALE` picks the page texts (21 languages), date formats, the first day of the week and the event content language. Arabic and Hebrew pages are right to left.
- **Status codes:** the loaders give the HTTP status: 502 when the feed cannot be reached (the page says so instead of showing old data) and 404 for an unknown event.
- **Registrations and tickets:** put `RsvpForm` or `TicketCheckout` inside `EventDetail`; the [developer guide](../../docs/developer-guide.md#event-pages) shows how.

A remote API origin must be reachable by the Astro server; subscription links must also be reachable by visitors' calendar apps.

## Checks

```sh
npm run check
npm run test:page
```

`test:page` builds the site and checks a built event page against a fake feed: JSON-LD escaping, hybrid locations, image URLs, the meeting link and French texts.
