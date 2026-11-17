## 0.18.4

Packaging fix for sites that install the helpers from npm: Block Kit is an optional peer dependency instead of an exact 1.4.0 pin. No runtime, permission or schema changes. EmDash **>=1.2.0 <2.0.0**. [Release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/release-notes-0.18.4.md).

## 0.18.3

Tested on **EmDash 1.5.0**. Sites that install Eventual from source no longer fail to build on a newer, untested EmDash: they get a warning, and the editor adapters step aside if a newer admin no longer matches. No runtime, permission or schema changes. EmDash **>=1.2.0 <2.0.0**. [Release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/release-notes-0.18.3.md).

## 0.18.2

New registry screenshots, and the **Setup guide** link on the Event settings page points to the renamed repository (`eventual-rsvp-core`). No runtime, permission or schema changes. EmDash **>=1.2.0 <2.0.0**. [Release notes](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/docs/release-notes-0.18.2.md).

## Earlier releases

- **0.18.1:** the optional Astro, schema and transfer helpers on npm (`@vermeulen.solutions/eventual`).
- **0.18.0:** new name, Eventual RSVP – Core; the admin in 21 languages; new `network:request` permission to `cdn.jsdelivr.net` for language packs.
- **0.17.0:** German, Dutch and Spanish admin dictionaries, 1-click calendar links and single-event queries.
- **0.16.0:** parallelized public feed resolution, cache headers for public media, and direct `imageMedia` metadata for responsive Astro `<Image>`.

[Full changelog](https://github.com/Vermeulen-Solutions/eventual-rsvp-core/blob/main/CHANGELOG.md).
