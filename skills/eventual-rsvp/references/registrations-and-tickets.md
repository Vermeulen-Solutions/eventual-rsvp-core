# Registrations and Tickets on the site

Both add-ons need Core and its event collection with the shared capacity fields (see [setup](setup.md#collections)), plus their npm packages for the components (also on a Registry install). Their forms read the event by its content ID and the date's start: on Core's event page use `eventContentId(data.event)` and `occurrenceStart(data.event)`. Paths are built from each add-on's plugin ID ([setup](setup.md#plugin-ids)).

## Registrations (`@vermeulen.solutions/eventual-attendance`)

### Event page with the form

The form shows on events whose **Registrations** panel is turned on. Ask the form route first so other events get no form:

```astro
---
// src/pages/events/[id].astro
import EventDetail from "@vermeulen.solutions/eventual/astro/EventDetail.astro";
import RsvpForm from "@vermeulen.solutions/eventual-attendance/astro/RsvpForm.astro";
import { eventContentId, loadEventDetail, occurrenceStart } from "@vermeulen.solutions/eventual/astro/events";
import Layout from "../../layouts/Layout.astro";
import { eventOptions, LOCALE, rsvpBase } from "../../lib/eventual";

export const prerender = false;
const data = await loadEventDetail(Astro.url, Astro.params.id, eventOptions);
Astro.response.status = data.status;

const eventId = data.event ? eventContentId(data.event) : "";
const start = data.event ? occurrenceStart(data.event) : "";
let rsvpOpen = false;
if (eventId) {
  try {
    const url = new URL(`${rsvpBase}/rsvp/form?eventId=${encodeURIComponent(eventId)}&occurrence=${encodeURIComponent(start)}`, Astro.url);
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = res.ok ? await res.json() : null;
    rsvpOpen = Boolean(body?.success && body.data?.ok && body.data.open);
  } catch {
    rsvpOpen = false;
  }
}
---
<Layout title={data.pageTitle} lang={data.lang}>
  <EventDetail data={data}>
    {rsvpOpen && <RsvpForm eventId={eventId} occurrenceStart={start} apiEndpoint={`${rsvpBase}/rsvp`} locale={LOCALE} />}
  </EventDetail>
</Layout>
```

The route `GET <rsvpBase>/rsvp/form?eventId=…[&occurrence=…][&collection=…]` answers `{ success, data }`. `data.ok` is false when the event is unknown or sells tickets instead (`error`: `EVENT_NOT_FOUND`, `EVENT_TICKETED`). `data.open` says whether registrations are on for the event. A full event stays `open`: the form itself shows "full" or the waiting list (`data.full`, `data.seatsLeft`, `data.allowWaitlist`). The check is one extra request per event page; the form makes the same request in the browser. When the pages run on the EmDash site itself, you can skip the HTTP round trip with EmDash's dispatcher: `const result = await Astro.locals.emdash.handlePublicPluginApiRoute(RSVP_ID, "GET", "/rsvp/form", new Request(url));` then read `result.success` and `result.data` the same way.

`RsvpForm` props: `eventId`, `occurrenceStart`, `apiEndpoint` (default `/_emdash/api/plugins/eventual-attendance/rsvp`, the npm-install path: always pass `<rsvpBase>/rsvp` on a Registry install), `formEndpoint` (default `${apiEndpoint}/form`), `collection` (events outside the default collection), `locale` (any BCP 47 tag; emails for the booking use its language), `allowWaitlist`, `maxQuantity`, `title`, `nameLabel`, `emailLabel`. It needs client JavaScript and fires a bubbling `eventual:availability` event with `{ full, seatsLeft, allowWaitlist }`.

### Manage page (required)

Cancellation and waiting-list emails link here. Default path `/rsvp/manage`; it can be changed under **Site setup** on the Registrations settings page (keep page and setting the same). Ask the user if the site's language suggests another path.

```astro
---
// src/pages/rsvp/manage.astro
import RsvpManage from "@vermeulen.solutions/eventual-attendance/astro/RsvpManage.astro";
import Layout from "../../layouts/Layout.astro";
import { LOCALE, rsvpBase } from "../../lib/eventual";
---
<Layout title="…" lang={LOCALE.split("-")[0]}><RsvpManage apiBase={rsvpBase} locale={LOCALE} /></Layout>
```

`RsvpManage` props: `apiBase`, `locale`, `class`. It renders its own heading and works on a static page (the token is in the link's `#fragment`). Nothing changes until the visitor presses a button, so email link scanners cannot cancel bookings.

Spam protection (optional): Cloudflare Turnstile keys on the settings page. A site with a Content Security Policy must then allow `https://challenges.cloudflare.com` in `script-src` and `frame-src`.

## Tickets (`@vermeulen.solutions/eventual-tickets`)

Commercial licence (yearly per site; `localhost`, `*.workers.dev` and `*.pages.dev` need none). Free tickets and pay-by-invoice work without Stripe. Card payments need `EMDASH_ENCRYPTION_KEY` (`npx emdash secrets generate`) and the Stripe secret key and webhook signing secret pasted on the **Tickets** admin page, which also shows the webhook address.

| Page | Component (`@vermeulen.solutions/eventual-tickets/astro/…`) | Props |
| --- | --- | --- |
| Event page, inside `EventDetail` | `TicketCheckout.astro` | `eventId`, `occurrenceStart`, `apiBase`, `title`, `locale`, `class` |
| `/tickets/checkout` (return from Stripe; path set on the Tickets page) | `TicketCheckoutReturn.astro` | `apiBase`, `backHref` (default `/`), `locale`, `class` |
| `/tickets/order` (linked from ticket emails) | `TicketOrder.astro` | `apiBase`, `checkinPath` (default `/tickets/check`), `locale`, `class` |
| `/tickets/check` (door staff, signed in to EmDash) | `TicketCheckin.astro` | `apiBase`, `eventId`, `occurrenceStart`, `locale`, `class` |

`apiBase` is `/_emdash/api/plugins/<ticketsId>`. To show the checkout only for events on sale, ask `GET <apiBase>/availability?eventId=<contentId>&occurrence=<occurrenceStart>` the same way as above and render when `body.data.ok` is true. An event uses either Registrations or Tickets, not both.

When invoice payment is chosen, the checkout button reads "Reserve my places" instead of "Continue to payment".

Theme Tickets with `--et-*` properties (`--et-primary`, `--et-on-primary`, `--et-bg`, `--et-field-bg`, `--et-border`, `--et-text`, `--et-muted`, …), not `--eventual-*`.
