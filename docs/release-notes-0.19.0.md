# Eventual RSVP – Core 0.19.0 — event pages in the package

Visitor pages no longer have to be built by your developer. The package now has a complete events page and an event page, ready to put in an Astro site.

- **Events page (`EventBrowser`):** seven views (list, timeline, cards, schedule, date strip, month and locations), month navigation, a category filter and a calendar subscription link. Cancelled, postponed and rescheduled events are marked in every view.
- **Event page (`EventDetail`):** date, time, place with directions, organizer, website, the description, an "Add to calendar" menu (Google, Outlook, Office 365, iCal file), a subscription link and Event structured data for search engines. Registrations' or Tickets' form goes inside it.
- **Two short pages:** a loader fetches the feed and gives the page its texts, data and HTTP status (502 when the feed cannot be reached, 404 for an unknown event). See [Event pages](developer-guide.md#event-pages).
- **21 languages:** English, French, German, Dutch, Spanish, Italian, Portuguese (Portugal and Brazil), Polish, Czech, Swedish, Danish, Norwegian, Finnish, Japanese, Chinese, Korean, Turkish, Ukrainian, Arabic and Hebrew, with right-to-left layout for Arabic and Hebrew. The texts come with `@vermeulen.solutions/eventual-locales` 0.1.12.
- **Light and dark:** a neutral look with a blue accent that follows the page's text colour and colour scheme. Your own CSS always wins, and `--eventual-*` properties (shared with Registrations and Tickets) change the colours, corners and spacing.
- **Accessible and responsive:** no axe (WCAG 2.2 AA) violations in any view in light or dark; nothing runs off a 375-pixel screen at 200% text size. Layouts follow the space the component has, so the month grid becomes a day list in narrow columns.
- **The Astro example site** in `examples/astro-events` now uses these components; its own copies of the code are gone.
- **The plugin itself is unchanged:** same permissions, schema and MCP tools as 0.18.7. The Registry bundle only fetches its admin language packs from locales 0.1.12 (the same texts). EmDash `>=1.2.0 <2.0.0`.
