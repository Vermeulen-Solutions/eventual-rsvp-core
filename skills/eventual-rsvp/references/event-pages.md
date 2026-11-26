# Event pages: EventBrowser and EventDetail (Core 0.19+)

Two page bodies render inside the site's own layout. A loader fetches Core's feed and returns everything the page needs, including the HTTP status and the translated texts.

```ts
import EventBrowser from "@vermeulen.solutions/eventual/astro/EventBrowser.astro";
import EventDetail from "@vermeulen.solutions/eventual/astro/EventDetail.astro";
import { loadEventBrowser, loadEventDetail, eventContentId, occurrenceStart } from "@vermeulen.solutions/eventual/astro/events";
```

Pages using them need `export const prerender = false` and should set `Astro.response.status = data.status` (502 when the feed cannot be reached, 404 for an unknown event). Use `data.pageTitle` and `data.description` for the head.

## Loader options (both loaders)

| Option | Default | Meaning |
| --- | --- | --- |
| `pluginId` | `eventual` | Installed plugin ID (`r_…` for a Registry install). |
| `origin` | the page's origin | EmDash site serving the feed, when the pages run on another host. |
| `locale` | `en` | Page texts (21 languages), date formats, first day of the week, and the content language asked from the feed. Arabic and Hebrew render right to left. |
| `contentLocale`, `strict` | language of `locale`, `false` | Feed content language; `strict: true` leaves out untranslated events instead of showing them with a language prefix. |
| `timeZone` | `UTC` | Zone for "this month" and "today". Events keep their own zones. |
| `basePath` | `/events` | Address of the events page; detail links are `<basePath>/<slug>`. Must match the page folder. |
| `linkTo` | `detail` | `cms` links to the entry's own public page when it has one. |
| `views`, `defaultView` | all seven, `list` | Offered views, in order: `list`, `timeline`, `cards`, `schedule`, `dates`, `month`, `locations`. |
| `view`, `month`, `category` | from the query string | Fix a value instead of reading `?view=`, `?month=YYYY-MM`, `?category=`. |

`loadEventDetail(Astro.url, Astro.params.id, options)` accepts an event slug or ID; pass it the same options as the events page (`basePath` sets its back link and `locale` its texts; `timeZone` matters little there, as event times use the event's own zone). It searches from today through one year by default; `?from=YYYY-MM-DD&through=YYYY-MM-DD` narrows it and picks the right date of a recurring event.

Pure variants for tests or the SSR dispatcher: `buildEventBrowserData(events, url, options)` and `buildEventDetailData(events, id, url, options)` (pass `null` as `events` for a failed feed).

## Languages

`locale` takes any BCP 47 tag (`fr-CH`, `pt-BR`, `de-AT`). Dates and the first day of the week follow the full tag; texts use the closest of 21 shipped languages (English, French, German, Dutch, Spanish, Italian, Portuguese and Brazilian Portuguese, Polish, Czech, Swedish, Danish, Norwegian, Finnish, Japanese, Chinese, Korean, Turkish, Ukrainian, Arabic, Hebrew), else English. `data.lang` and `data.dir` give the language and direction actually used: put them on `<html>`. Registrations' and Tickets' components take the same tags in their `locale` prop.

## Component props

- `EventBrowser`: `data` (required), `headingLevel` (1, or 2 inside another page), `title`, `intro` (`false` for none), `id`, `showFilter`, `showViewSwitch`, `scheme`, `class`.
- `EventDetail`: `data` (required), `headingLevel`, `backHref` (`false` for none), `showSubscribe`, `jsonLd` (Event structured data, default on), `scheme`, `class`. Its default slot renders after the description: put `RsvpForm` or `TicketCheckout` there.

```astro
<EventDetail data={data}>
  {data.event && <RsvpForm eventId={eventContentId(data.event)} occurrenceStart={occurrenceStart(data.event)} apiEndpoint={`${rsvpBase}/rsvp`} />}
</EventDetail>
```

## Theming

Styles live in the `eventual` cascade layer under `.eventual-browser` / `.eventual-detail`; every class starts with `eventual-`. Unlayered site CSS always wins; with Tailwind 4 declare `@layer theme, base, eventual, components, utilities;`. Neutral colours follow the text colour, so the pages suit any background; the components have no font of their own.

Put the theme in the site's global stylesheet (imported by the layout), on `:root`. If the layout can't be changed, import the stylesheet in each event page's frontmatter instead. If you can't tell how the site switches dark mode (see below), ask.

```css
:root {
  --eventual-primary: light-dark(#9d174d, #f9a8d4);     /* accent: selected view, buttons, date tiles, icons */
  --eventual-on-primary: light-dark(#ffffff, #500724);  /* text on the accent */
  --eventual-radius: 1.5rem;                            /* cards */
  --eventual-control-radius: 1rem;                      /* buttons, fields */
}
.eventual-card { box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.08); }  /* own rules win */
```

Defaults: accent `light-dark(#075985, #7dd3fc)` with `light-dark(#ffffff, #082f49)` on it; focus ring = the accent. For a brand colour, give the dark value a light tint of the brand (4.5:1 against the dark page) and a dark text colour on it, as above. Other properties: `--eventual-text-muted`, `--eventual-border`, `--eventual-surface`, `--eventual-cancelled`, `--eventual-changed`, `--eventual-error`, `--eventual-focus`, `--eventual-gap`.

**Dark mode follows the CSS `color-scheme` property**, not the operating system directly. Match how the site does dark mode:

- System setting: `:root { color-scheme: light dark; }` plus the site's own dark colours in `@media (prefers-color-scheme: dark)`.
- A class or attribute toggle: `[data-theme="dark"] { color-scheme: dark; }` (and `light` for the light theme). Don't add `light dark` on `:root` then, or a light page can get dark accents on a dark-mode computer.
- Light-only site: set nothing.
- One dark section on a light page: pass `scheme="dark"` to the component.

Wrapper classes for scoping: `.eventual-browser`, `.eventual-detail` (Core), `.eventual-rsvp-widget`, `.eventual-manage` (Registrations, which reads the same `--eventual-*` properties), `.eventual-tickets-widget` (Tickets, which reads `--et-*`: `--et-primary`, `--et-on-primary`, `--et-bg`, `--et-field-bg`, `--et-border`, `--et-text`, `--et-muted`, …).

## Other helpers

- `EventList.astro` (`@vermeulen.solutions/eventual/astro/EventList.astro`): a simple list for a sidebar or home page (`events`, `basePath`, `heading`, `locale`, `emptyMessage`, `showCalendarLinks`).
- `fetchPublicFeed(origin, from, through, category, { pluginId, locale, strict, publicUrls })` from `@vermeulen.solutions/eventual/astro`: the raw feed. Each event has `calendarLinks` (Google, Outlook, Office 365, `.ics`) built for the installed plugin.
- `eventToJsonLd` and `serializeJsonLd` for structured data (always use the serializer; it escapes for `<script>`).
- Calendar subscription for visitors: `webcal://<host>/_emdash/api/plugins/<pluginId>/calendar` (`EventBrowser` shows this link).
