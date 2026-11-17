# Eventual RSVP – Core 0.18.3 — EmDash 1.5

- **Tested on EmDash 1.5.0**, as well as 1.2.0 and 1.4.0. The source installer's admin adapter recognises the 1.5 content-editor panel.
- **Newer EmDash releases are no longer refused.** Sites installed with `emdashWithEventual()` used to fail to build on any EmDash version Eventual had not been tested with. Now only versions older than 1.2.0 are refused; a newer untested version builds with a warning asking you to check the event editor.
- **Editor adapters step aside safely.** If a future admin build no longer matches what Eventual expects, Eventual prints a warning and EmDash's own editor is used for that part, instead of the site build stopping.
- **Nothing else changes**: no runtime, permission or schema changes, and no new MCP tools. Registry installs are unaffected by the source-installer changes. EmDash `>=1.2.0 <2.0.0`.
