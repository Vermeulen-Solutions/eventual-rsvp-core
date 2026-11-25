// Guards for the event pages' stylesheet: it must never reach outside the components.
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import source from "../astro/events/parts/Styles.astro?raw";

const css = source.slice(source.indexOf("<style"), source.indexOf("</style>")).replace(/\/\*[\s\S]*?\*\//g, "");
const selectors = [...css.matchAll(/([^{};]+)\{/g)].map((match) => match[1]!.trim()).filter((selector) => !selector.startsWith("@"));

describe("event pages stylesheet", () => {
	it("sits in the eventual cascade layer", () => {
		expect(css).toMatch(/^<style is:global>\s*@layer eventual \{/);
	});

	it("never styles the page itself", () => {
		for (const selector of selectors) expect(selector).not.toMatch(/(^|[\s,>+~(])(:root|html|body)\b/);
	});

	it("only uses eventual- classes", () => {
		const classes = new Set([...selectors.join(" ").matchAll(/\.([\w-]+)/g)].map((match) => match[1]));
		for (const name of classes) expect(name).toMatch(/^eventual-/);
	});

	it("keeps fixed colours as fallbacks of public --eventual-* properties", () => {
		for (const line of css.split("\n").filter((text) => /#[0-9a-f]{3,8}\b/i.test(text))) {
			expect(line).toMatch(/var\(--eventual-[\w-]+, light-dark\(#[0-9a-f]+, #[0-9a-f]+\)\)/i);
		}
	});
});
