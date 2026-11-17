import { emdashPluginTest } from "@emdash-cms/plugin-test/config";
import { defineConfig, configDefaults } from "vitest/config";

/**
 * The runtime integration suites seed events around FIXTURE_ANCHOR and then read feeds, MCP lists
 * and ICS without an explicit window, which start at the plugin's real "today" (inside workerd,
 * out of reach of fake timers). Once the anchor has passed, those fixtures would silently fall
 * out of every window. For these suites only, move every 2026/2027 date literal forward by whole
 * weeks so the anchor lands 1-7 days ahead: weekdays, times of day and the relative spacing of
 * every fixture stay the same, and nothing changes while the anchor is still in the future.
 * Pure date-rule suites (DST, month ends) are not shifted.
 */
const FIXTURE_ANCHOR = Date.UTC(2026, 10, 15);
const RUNTIME_SUITES = ["collection-bindings", "migration", "plugin", "sandbox-budget"];
const DAY = 86_400_000;
const lag = Date.now() + DAY - FIXTURE_ANCHOR;
const fixtureShiftDays = lag > 0 ? Math.ceil(lag / (7 * DAY)) * 7 : 0;
function shiftDate(y: string, m: string, d: string) {
	const shifted = new Date(Date.UTC(+y, +m - 1, +d) + fixtureShiftDays * DAY);
	return [String(shifted.getUTCFullYear()), String(shifted.getUTCMonth() + 1).padStart(2, "0"), String(shifted.getUTCDate()).padStart(2, "0")];
}
export function shiftFixtureDates(source: string) {
	if (!fixtureShiftDays) return source;
	return source
		.replace(/\b(202[67])-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?!\d)/g, (_, y, m, d) => shiftDate(y, m, d).join("-"))
		.replace(/\b(202[67])(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?=T\d{6}Z?\b|\b)/g, (_, y, m, d) => shiftDate(y, m, d).join(""));
}
const shiftRuntimeFixtures = {
	name: "eventual-runtime-fixture-dates",
	enforce: "pre" as const,
	transform(code: string, id: string) {
		const match = /[\/]tests[\/]([^\/]+)\.test\.ts$/.exec(id.split("?")[0]);
		return match && RUNTIME_SUITES.includes(match[1]) ? { code: shiftFixtureDates(code), map: null } : null;
	},
};

export default defineConfig({
	plugins: [emdashPluginTest(), shiftRuntimeFixtures],
	test: {
		include: ['tests/**/*.test.ts'],
		exclude: [...configDefaults.exclude, 'scripts/**', 'reports/**', 'tests/browser/**'],
		// The EmDash test plugin builds the shared sandbox artifact for each
		// Cloudflare pool. Keep workers serial to avoid dist/ write races on Windows.
		fileParallelism: false,
		maxWorkers: 1,
		// Production D1 host setup and policy RPCs can exceed Vitest's 5s default.
		testTimeout: 15_000,
	},
});
