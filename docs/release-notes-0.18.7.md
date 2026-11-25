# Eventual RSVP – Core 0.18.7 — review fixes

Fixes for points from an independent review of 0.18.4, each checked on a local EmDash 1.5.0 site.

- **Readable calendar links.** Google, Outlook and Office 365 entries show the event's description as text, not as raw rich-text code.
- **Admin links on staging copies.** Links on the Eventual RSVP page open the admin of the site you are on, not the live site configured as the site address.
- **Larger feeds.** Both public feeds served 714 upcoming one-off events on the test site (0.18.4: about 300 for the calendar, 600 for JSON). The feeds may now make 30 calls per request where EmDash allows it, and the calendar's saved state is about four times smaller. Existing subscriptions keep their update numbers.
- **Clean refusal when deleting a venue or organizer in use,** instead of an error page.
- **Event settings** offers only collections that can work, and says what is missing when there is no event collection yet.
- **One sidebar entry each** for venues and organizers.
- **`EventList`:** event-specific names for the calendar links, link names that match their text, a "Cancelled" or "Rescheduled" label, and light default styles that work on light and dark pages. Your site's CSS always overrides them; see the [developer guide](developer-guide.md#astro-integration).
- **Schema exporter:** `--timezone`, defaulting to the computer's own time zone.
- **Nothing else changes:** no permission or schema changes, and no new MCP tools. EmDash `>=1.2.0 <2.0.0` (tested on 1.2.0, 1.4.0, 1.5.0 and 1.6.0).
