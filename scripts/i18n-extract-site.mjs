#!/usr/bin/env node
// Writes the English source catalog of the event pages (EventBrowser, EventDetail) for the
// eventual-locales package: core-site/en.json, flat dotted keys over astro/events/i18n.ts.
// Usage: node scripts/i18n-extract-site.mjs [catalogsDir]  (default: the linked eventual-locales)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { flattenMessages } from "@vermeulen.solutions/eventual-locales";
import { EVENT_PAGES_EN } from "../astro/events/i18n.ts";

const dir = process.argv[2] ?? "node_modules/@vermeulen.solutions/eventual-locales/catalogs";
const messages = flattenMessages(EVENT_PAGES_EN);
mkdirSync(join(dir, "core-site"), { recursive: true });
writeFileSync(join(dir, "core-site", "en.json"), JSON.stringify(messages, null, 2) + "\n");
console.log(`core-site/en.json: ${Object.keys(messages).length} messages`);
