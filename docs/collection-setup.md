# Install and connect Eventual RSVP – Core

Eventual RSVP – Core requires EmDash **>=1.2.0 <2.0.0**; it is tested on **1.2.0**, **1.4.0**, **1.5.0** and **1.6.0**, with 1.4.0 or newer recommended for the form and Cloudflare fixes. Editors can use the [event guide](user-guide.md) once an administrator completes this setup.

## In the EmDash admin

1. Open **Plugins** and browse the **Registry**. Find **Eventual RSVP – Core**, published by **vermeulen.solutions**, review its permissions, and install it. Existing installations use the plugin's update action.
2. Open **Event settings**, select the event and venue/organizer collections, and choose **Save settings**. Selection connects collections; it does not create them or move entries.
3. Create a draft, save it, set its schedule in **Dates, venue & repeat**, and publish it. Check it on your site's calendar.

A **content type/collection** is simply the place under **Content** where entries are listed and edited. If compatible collections are missing, ask your site builder to create them with the blueprint below. Your builder adds visitor pages using Eventual's feeds; the [Astro showcase](../examples/astro-events/README.md) is an optional website design.

## Agent tools (optional)

Installing does not give AI agents access. Eventual RSVP's tools for agents (MCP tools) stay off until an administrator turns them on:

1. Open **Plugins**.
2. Expand the details of **Eventual RSVP – Core** with the arrow on its row.
3. Switch on **Agent access**.

The [developer guide](developer-guide.md#settings-tools-and-transfer) lists the tools and the permissions they need.

## The old-events switch

Leave **Show old events saved inside the plugin** off for native collections. Enable it and choose **Save switch** only to serve old plugin data while no native event collection is connected. It never combines old rows with native events or repairs a missing explicitly selected collection.

To make old entries editable, follow [upgrading and migration](upgrade-0.13.0.md). An empty connected collection may produce an empty calendar; an unconfigured source produces a clear error instead.

## For the site builder

**Install the backend one way only**: from the Registry as above, or from npm in `astro.config.mjs`, not both. A Registry install is addressed by a generated plugin ID that starts with `r_`, not by `eventual`; the **Subscribe** links on the Eventual RSVP admin page show the exact addresses. The helpers are on npm as `@vermeulen.solutions/eventual` (the unscoped package `eventual` is unrelated; do not install it). Details: [versions, plugin ID and backends](developer-guide.md#versions-and-where-to-get-them). Moving an existing site from the config to the Registry? Read [what stays behind](developer-guide.md#moving-a-site-from-the-config-to-the-registry) first: calendar subscribers' address changes.

After `npm ci` and `npm run build` in this repository, using Node 24+:

```sh
node scripts/export-native-schema.mjs --locale fr --output eventual-schema.json
```

From an installed source package, use `node node_modules/@vermeulen.solutions/eventual/scripts/export-native-schema.mjs` with the same options. The exporter writes schema JSON only and refuses to overwrite an output file.

Defaults are `events`, `venues`, and `organizers` (19/8/3 fields). Custom names and directory reuse:

```sh
node scripts/export-native-schema.mjs --event-collection activities --venue-collection locations --reuse-venues --locale fr --output activities-schema.json
```

`--reuse-venues` and `--reuse-organizers` omit existing directories. Use a locale already configured on the site. Inspect and apply the exact blueprint through authenticated EmDash schema tools or the site's supported schema deployment process. Re-read the fields, then select the collections in Event settings. Eventual has read-only schema permission.

For a **new local SQLite** schema, the installed EmDash CLI supports:

```sh
npx emdash seed eventual-schema.json --validate
npx emdash seed eventual-schema.json --database ./data.db --no-content --on-conflict error
```

Use the actual database path. Remote D1 uses the site's remote schema workflow. For populated collections, compare the blueprint and apply reviewed additive changes instead of recreating them.

Preserve Portable Text, shared schedule/reference flags, localized title/description/occurrence copy, and exact reference targets. An event reference requires its corresponding directory selection. Column-backed and relation-bound references differ: keep the exporter's definition intact. See the [developer guide](developer-guide.md).
