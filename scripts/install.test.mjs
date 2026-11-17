import { test } from "node:test";
import assert from "node:assert/strict";
import { emdashWithEventual, checkEditorVersions, testedVersions, checkToolchainVersions } from "../astro/install.mjs";
import eventual from "../dist/index.mjs";

test("source editor accepts every tested core version", () => {
  for (const version of testedVersions.emdash) {
    assert.deepEqual(
      checkEditorVersions(() => version),
      Object.fromEntries(Object.keys(testedVersions).map(name => [name, version])),
    );
  }
  for (const version of ["1.0.1", "1.1.9"]) {
    assert.throws(() => checkEditorVersions(() => version, () => assert.fail("older versions are refused, not warned")), /1\.2\.0 or newer/);
  }
  assert.equal(checkToolchainVersions().vite.startsWith("8.3."), true);
  assert.throws(
    () => checkToolchainVersions(name => ({ astro: "7.3.1", vite: "8.3.0", react: "19.0.0" })[name]),
    /requires astro 7\.3\.2 or newer/,
  );
});

test("newer untested EmDash and toolchain versions run with a warning instead of being refused", () => {
  for (const version of ["1.3.1", "1.6.0", "2.0.0"]) {
    const warnings = [];
    assert.deepEqual(
      checkEditorVersions(() => version, message => warnings.push(message)),
      Object.fromEntries(Object.keys(testedVersions).map(name => [name, version])),
    );
    assert.equal(warnings.length, Object.keys(testedVersions).length);
    assert.ok(warnings[0].startsWith(`emdash ${version} has not been tested`));
  }
  const warnings = [];
  const toolchain = { astro: "7.5.0", vite: "8.4.1", react: "20.0.0" };
  assert.deepEqual(checkToolchainVersions(name => toolchain[name], message => warnings.push(message)), toolchain);
  assert.equal(warnings.length, 3);
  const quiet = [];
  checkToolchainVersions(name => ({ astro: "7.4.12", vite: "8.3.2", react: "19.2.0" })[name], message => quiet.push(message));
  assert.deepEqual(quiet, []);
});

test("source installer accepts the tested host", () => {
  const integration = emdashWithEventual({ sandboxed: [eventual] });
  assert.equal(typeof integration.hooks, "object");
  assert.equal(typeof integration.hooks["astro:config:setup"], "function");
});
