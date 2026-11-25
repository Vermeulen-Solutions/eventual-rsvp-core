# Eventual RSVP – Core 0.18.6 — EmDash 1.6 and moving to the Registry

- **Tested on EmDash 1.6.0.** Sites that install Core from npm with the source installer no longer get an "untested version" warning on EmDash 1.6.0, and the editor adapters apply to its admin. Registry installs were already running on 1.6; they are now covered by the same browser acceptance.
- **Before moving a site from the config to the Registry,** read the new section in the [developer guide](developer-guide.md#moving-a-site-from-the-config-to-the-registry). A Registry install has a new plugin ID and starts with empty settings. Calendar subscribers' address contains that ID, so subscriptions to the old address stop updating unless you redirect it.
- **Nothing else changes:** no runtime, permission or schema changes, and no new MCP tools. EmDash `>=1.2.0 <2.0.0` (tested on 1.2.0, 1.4.0, 1.5.0 and 1.6.0).
