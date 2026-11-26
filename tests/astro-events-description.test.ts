import { describe, expect, it } from "vitest";
import { descriptionExcerpt, descriptionHtml, markdownHtml, portableTextHtml } from "../astro/events/description";

const block = (text: string, extra: Record<string, unknown> = {}) => ({ _type: "block", style: "normal", markDefs: [], children: [{ _type: "span", text, marks: [] }], ...extra });

describe("event descriptions", () => {
	it("renders Portable Text paragraphs, headings, lists and marks", () => {
		const html = portableTextHtml([
			{ ...block(""), children: [{ _type: "span", text: "Bring a ", marks: [] }, { _type: "span", text: "chair", marks: ["strong"] }] },
			block("What to expect", { style: "h2" }),
			block("Warm drinks", { listItem: "bullet" }),
			block("Snacks", { listItem: "bullet" }),
			block("Step one", { listItem: "number" }),
		]);
		expect(html).toBe("<p>Bring a <strong>chair</strong></p><h2>What to expect</h2><ul><li>Warm drinks</li><li>Snacks</li></ul><ol><li>Step one</li></ol>");
	});

	it("shifts headings to fit the page and keeps them between h2 and h6", () => {
		expect(portableTextHtml([block("A", { style: "h2" }), block("B", { style: "h3" })], { headingBase: 3 })).toBe("<h3>A</h3><h4>B</h4>");
		expect(portableTextHtml([block("A", { style: "h1" })])).toBe("<h2>A</h2>");
		expect(portableTextHtml([block("A", { style: "h6" })], { headingBase: 5 })).toBe("<h6>A</h6>");
	});

	it("escapes text and keeps only http(s) and mailto links, announcing new tabs", () => {
		const html = portableTextHtml([{
			_type: "block", style: "normal",
			markDefs: [{ _key: "a", _type: "link", href: "https://example.com/?a=1&b=2" }, { _key: "b", _type: "link", href: "javascript:alert(1)" }],
			children: [{ _type: "span", text: "<site>", marks: ["a"] }, { _type: "span", text: " bad", marks: ["b"] }],
		}], { newTabText: "(opens in a new tab)" });
		expect(html).toBe('<p><a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">&lt;site&gt;<span class="eventual-sr-only"> (opens in a new tab)</span></a> bad</p>');
	});

	it("skips images and other non-text blocks", () => {
		expect(portableTextHtml([{ _type: "image", asset: {} }, block("Text")])).toBe("<p>Text</p>");
	});

	it("falls back to light markdown for plain-text descriptions", () => {
		expect(descriptionHtml(undefined, "Intro **bold**\n\n## Plan\n- one\n- two")).toBe("<p>Intro <strong>bold</strong></p><h2>Plan</h2><ul><li>one</li><li>two</li></ul>");
		expect(descriptionHtml([], "Plain <b>text</b>")).toBe("<p>Plain &lt;b&gt;text&lt;/b&gt;</p>");
		expect(markdownHtml("[x](javascript:alert(1))")).toBe("<p>[x](javascript:alert(1))</p>");
	});

	it("shortens excerpts on a word boundary", () => {
		expect(descriptionExcerpt("**Bold** text")).toBe("Bold text");
		const long = descriptionExcerpt("word ".repeat(60));
		expect(long.endsWith("…")).toBe(true);
		expect(long.length).toBeLessThanOrEqual(182);
	});

	it("joins headings and list items as a sentence", () => {
		expect(descriptionExcerpt("A drawing workshop.\n\nWhat to bring\n\n- Your imagination\n\n- A sketchbook, if you have one\n\n- Comfortable clothes\n\nMaterials are on site. More on the workshop page (https://example.com/drawing)."))
			.toBe("A drawing workshop. What to bring: Your imagination; A sketchbook, if you have one; Comfortable clothes. Materials are on site. More on the workshop page.");
		expect(descriptionExcerpt("## Plan\nWe meet at ten.")).toBe("Plan. We meet at ten.");
		expect(descriptionExcerpt("<p>Bring:</p><ul><li>water</li><li>a hat</li></ul>")).toBe("Bring: water; a hat");
		expect(descriptionExcerpt("1. First\n2. Second")).toBe("First; Second");
	});
});
