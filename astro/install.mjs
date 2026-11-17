/** One host integration for the sandbox backend and its frontend companion. */
import emdash from "emdash/astro";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { eventualEditor } from "./descriptor.mjs";
import { eventualEditorCompatibility, warnOnce } from "./editor-compat.mjs";
export { warnOnce };

const require = createRequire(import.meta.url);
export const testedVersions = Object.freeze({
  emdash: Object.freeze(["1.2.0", "1.4.0", "1.5.0"]),
  "@emdash-cms/admin": Object.freeze(["1.2.0", "1.4.0", "1.5.0"]),
  "@emdash-cms/blocks": Object.freeze(["1.2.0", "1.4.0", "1.5.0"]),
});
export const testedToolchain = Object.freeze({astro:"7.3.x-7.4.x (>=7.3.2 <7.5.0)",vite:"8.3.x",react:"19.x"});
export function installedVersion(name, resolver = require) {
  let directory = dirname(resolver.resolve(name));
  for (;;) {
    try {
      const pkg = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
      if (pkg.name === name) return pkg.version;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Cannot identify ${name}'s installed version.`);
    directory = parent;
  }
}
/** Compare dotted versions numerically; prerelease tags are ignored. */
export function compareVersions(a, b) {
  const pa = String(a).split("-")[0].split(".").map(Number), pb = String(b).split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}
/**
 * Versions older than the oldest tested release have known-incompatible shapes and are refused.
 * Newer untested releases are allowed with a warning: the editor adapters fall back to stock
 * EmDash behaviour if a build no longer matches, so an EmDash update never blocks a site.
 */
export function checkEditorVersions(resolveVersion = installedVersion, warn = warnOnce) {
  const versions = Object.fromEntries(Object.keys(testedVersions).map(name => [name, resolveVersion(name)]));
  for (const [name, version] of Object.entries(versions)) {
    const expected = testedVersions[name];
    if (expected.includes(version)) continue;
    if (compareVersions(version, expected[0]) < 0) throw new Error(`Eventual editor requires ${name} ${expected[0]} or newer; found ${version}. Upgrade EmDash first.`);
    warn(`${name} ${version} has not been tested with this Eventual release (tested: ${expected.join(", ")}). Eventual will run; check the event editor after upgrading and report anything that looks wrong.`);
  }
  return versions;
}
const toolchainMinimum = Object.freeze({ astro: "7.3.2", vite: "8.3.0", react: "19.0.0" });
const toolchainTested = Object.freeze({ astro: v => /^7.[34]./.test(v), vite: v => /^8.3./.test(v), react: v => /^19./.test(v) });
export function checkToolchainVersions(resolveVersion = installedVersion, warn = warnOnce) {
  const versions={};
  for (const [name, range] of Object.entries(testedToolchain)) {
    const version=resolveVersion(name);
    if (compareVersions(version, toolchainMinimum[name]) < 0) throw new Error(`Eventual editor requires ${name} ${toolchainMinimum[name]} or newer (tested: ${range}); found ${version}. See the editor compatibility matrix.`);
    if (!toolchainTested[name](version)) warn(`${name} ${version} is newer than the tested ${range}. Eventual will run; check the event editor after upgrading.`);
    versions[name]=version;
  }
  return versions;
}

/** Preserve existing backend registration, adapters, storage, plugins and hooks. */
export function emdashWithEventual(options = {}) {
  checkEditorVersions();
  checkToolchainVersions();
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const registered = (options.plugins ?? []).find(plugin => plugin.id === "eventual-editor");
  if (registered && (registered.version !== pkg.version || registered.format !== "native")) throw new Error("Remove the mismatched Eventual editor companion before using emdashWithEventual.");
  const backends = [...(options.plugins ?? []), ...(options.sandboxed ?? [])].filter(plugin => plugin.id === "eventual");
  if (backends.length > 1) throw new Error("Eventual backend is registered twice. Keep a single sandboxed or registry installation.");
  if (backends.some(plugin => plugin.version !== pkg.version || plugin.format !== "standard")) throw new Error("Eventual's source backend must be sandboxed and match its frontend companion version.");
  const integration = emdash({ ...options, plugins: registered ? options.plugins : [...(options.plugins ?? []), eventualEditor(pkg.version)] });
  const setup = integration.hooks["astro:config:setup"];
  return {
    ...integration,
    hooks: { ...integration.hooks, "astro:config:setup": async context => {
      context.updateConfig({ vite: { plugins: [eventualEditorCompatibility()] } });
      return setup?.(context);
    } },
  };
}
export default emdashWithEventual;
