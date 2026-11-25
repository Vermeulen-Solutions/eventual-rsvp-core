## 0.18.6

Tested on **EmDash 1.6.0**, and the developer guide now says what to do before moving a site from the config to the Registry. No runtime, permission or schema changes. [Release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/release-notes-0.18.6.md).

## 0.18.5

Fix for Registry installs: the **Subscribe** links on the Eventual RSVP admin page and the per-event `.ics` link in the feed used the wrong plugin address and answered "Plugin route not found". The per-event `.ics` link now downloads that event instead of the whole calendar. No permission or schema changes. EmDash **>=1.2.0 <2.0.0**. [Release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/release-notes-0.18.5.md).

## 0.18.4

Packaging fix for sites that install the helpers from npm: Block Kit is an optional peer dependency instead of an exact 1.4.0 pin. No runtime, permission or schema changes. EmDash **>=1.2.0 <2.0.0**. [Release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/release-notes-0.18.4.md).

## Earlier releases

- **0.18.3:** tested on EmDash 1.5.0; newer untested EmDash versions warn instead of failing the build.
- **0.18.2:** new registry screenshots; the Setup guide link points to the renamed repository.
- **0.18.1:** the optional Astro, schema and transfer helpers on npm (`@vermeulen.solutions/eventual`).
- **0.18.0:** new name, Eventual RSVP – Core; the admin in 21 languages; new `network:request` permission to `cdn.jsdelivr.net` for language packs.
- **0.17.0:** German, Dutch and Spanish admin dictionaries, 1-click calendar links and single-event queries.
- **0.16.0:** parallelized public feed resolution, cache headers for public media, and direct `imageMedia` metadata for responsive Astro `<Image>`.

[Full changelog](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/CHANGELOG.md).
