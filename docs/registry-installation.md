# Eventual RSVP – Core 0.19.3

Requires EmDash **>=1.2.0 <2.0.0**; tested on 1.2.0, 1.4.0, 1.5.0 and 1.6.0. **1.4.0 or newer is recommended** for nested forms and Cloudflare plugin mutations, and required for the optional cache integration.

In **Plugins → Registry**, find **Eventual RSVP – Core** by **vermeulen.solutions**, review permissions and install or update. Core calls only `cdn.jsdelivr.net`, for the admin's language packs. Agent tools stay off until you expand the plugin under **Plugins** and switch on **Agent access**.

Open **Event settings**, select compatible event, venue and organizer collections, then **Save settings**. Installation does not create schemas or migrate content. Site builders: [collection setup](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/collection-setup.md).

Save an announcement, open **Dates, venue & repeat**, save changed sections, reload, then publish in EmDash. [Editor guide](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/user-guide.md).

Keep **Show old events saved inside the plugin** off unless you serve events saved before 0.13. Upgrades from 0.12.x or earlier need a backup and [native migration](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/upgrade-0.13.0.md).

Your site builder connects visitor pages, optionally with the npm helpers `@vermeulen.solutions/eventual` at the same version. Feed addresses contain an `r_…` plugin ID: copy them from **Subscribe** on the Eventual RSVP page. **Caching stays opt-in**: read the [integration guide and host limitations](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/public-feed-caching.md) first.

**Uninstalling** keeps your events, venues and organizers: they are ordinary content in your collections. Event pages and calendar feeds that read them through Core stop showing events, so remove those first. **Also delete plugin storage data** removes only Core's settings.
