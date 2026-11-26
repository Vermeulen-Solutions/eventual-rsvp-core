/**
 * Event descriptions as safe HTML. Native events carry Portable Text (`descriptionBlocks`);
 * older or imported events carry plain text, rendered with the showcase's small markdown subset.
 * Everything is escaped; only http(s) and mailto links survive, and they open in a new tab.
 */

interface Span { _type?: string; text?: string; marks?: string[] }
interface MarkDef { _key: string; _type: string; href?: string }
interface Block { _type?: string; style?: string; listItem?: string; level?: number; children?: Span[]; markDefs?: MarkDef[] }

export interface DescriptionOptions {
	/** Level for the description's top headings (default 2). */
	headingBase?: number;
	/** Visually hidden text after links that open a new tab, in the page language. */
	newTabText?: string;
}

/** HTML for a description: Portable Text when present, else plain text with light markdown. */
export function descriptionHtml(blocks: unknown[] | undefined, text: string, options: DescriptionOptions = {}): string {
	return Array.isArray(blocks) && blocks.length ? portableTextHtml(blocks, options) : markdownHtml(text, options);
}

/**
 * A plain one-paragraph excerpt for lists and cards. Blocks (paragraphs, headings, list items)
 * are joined as a sentence would be: a colon before a list, semicolons between its items and a
 * full stop after a heading, so "What to bring" and its list do not run together.
 */
export function descriptionExcerpt(source: string, limit = 180): string {
	const text = source
		.replace(/<li\b[^>]*>/gi, "\n- ")
		.replace(/<br\s*\/?>|<\/(?:p|li|h[1-6]|div|blockquote)>/gi, "\n")
		.replace(/<[^>]*>/g, " ");
	const blocks = text.split(/\n+/).map((line) => ({
		list: /^\s*(?:[-*+]|\d+[.)])\s+/.test(line),
		text: line
			.replace(/^\s*#{1,6}\s+/, "")
			.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
			.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
			.replace(/\s*\(https?:\/\/[^\s)]+\)/g, "")
			.replace(/\*\*|__|[*_`]/g, "")
			.replace(/\s+/g, " ")
			.trim(),
	})).filter((block) => block.text);
	let plain = "";
	blocks.forEach((block, index) => {
		plain += block.text;
		const next = blocks[index + 1];
		if (!next) return;
		if (/[.!?…:;,]$/.test(block.text)) plain += " ";
		else plain += block.list && next.list ? "; " : next.list ? ": " : ". ";
	});
	if (plain.length <= limit) return plain;
	const cut = plain.slice(0, limit + 1);
	const boundary = cut.lastIndexOf(" ");
	return `${cut.slice(0, boundary > limit * 0.7 ? boundary : limit).trimEnd()}…`;
}

export function portableTextHtml(blocks: unknown[], options: DescriptionOptions = {}): string {
	const base = clampHeading(options.headingBase ?? 2);
	const out: string[] = [];
	let list: { tag: "ul" | "ol"; items: string[] } | null = null;
	const flush = () => {
		if (list) out.push(`<${list.tag}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${list.tag}>`);
		list = null;
	};
	for (const raw of blocks) {
		if (!raw || typeof raw !== "object") continue;
		const block = raw as Block;
		if (block._type && block._type !== "block") continue;
		const inline = renderSpans(block.children ?? [], block.markDefs ?? [], options);
		if (block.listItem) {
			const tag = block.listItem === "number" ? "ol" : "ul";
			if (!list || list.tag !== tag) {
				flush();
				list = { tag, items: [] };
			}
			list.items.push(inline);
			continue;
		}
		flush();
		if (!inline.trim()) continue;
		const heading = /^h([1-6])$/.exec(block.style ?? "");
		if (heading) {
			const level = clampHeading(base + Math.max(0, Number(heading[1]) - 2));
			out.push(`<h${level}>${inline}</h${level}>`);
		} else if (block.style === "blockquote") out.push(`<blockquote><p>${inline}</p></blockquote>`);
		else out.push(`<p>${inline}</p>`);
	}
	flush();
	return out.join("");
}

function renderSpans(spans: Span[], markDefs: MarkDef[], options: DescriptionOptions): string {
	return spans
		.map((span) => {
			if (!span || typeof span.text !== "string") return "";
			let html = escapeHtml(span.text).replace(/\n/g, "<br>");
			for (const mark of span.marks ?? []) {
				if (mark === "strong") html = `<strong>${html}</strong>`;
				else if (mark === "em") html = `<em>${html}</em>`;
				else if (mark === "code") html = `<code>${html}</code>`;
				else {
					const def = markDefs.find((item) => item._key === mark);
					const href = def?._type === "link" ? safeLink(def.href ?? "") : "";
					if (href) html = linkHtml(href, html, options);
				}
			}
			return html;
		})
		.join("");
}

export function markdownHtml(source: string, options: DescriptionOptions = {}): string {
	const base = clampHeading(options.headingBase ?? 2);
	const lines = source.replace(/\r\n?/g, "\n").split("\n");
	const blocks: string[] = [];
	let paragraph: string[] = [];
	let list: string[] = [];
	const flushParagraph = () => {
		if (paragraph.length) blocks.push(`<p>${renderInline(paragraph.join(" ").trim(), options)}</p>`);
		paragraph = [];
	};
	const flushList = () => {
		if (list.length) blocks.push(`<ul>${list.map((item) => `<li>${renderInline(item, options)}</li>`).join("")}</ul>`);
		list = [];
	};
	for (const line of lines) {
		const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*$/);
		const item = line.match(/^\s*[-*]\s+(.+?)\s*$/);
		if (!line.trim()) {
			flushParagraph();
			flushList();
		} else if (heading) {
			flushParagraph();
			flushList();
			// Same mapping as Portable Text: # and ## are the top level, ### one below.
			const level = clampHeading(base + Math.max(0, heading[1]!.length - 2));
			blocks.push(`<h${level}>${renderInline(heading[2]!, options)}</h${level}>`);
		} else if (item) {
			flushParagraph();
			list.push(item[1]!);
		} else {
			flushList();
			paragraph.push(line.trim());
		}
	}
	flushParagraph();
	flushList();
	return blocks.join("");
}

function renderInline(source: string, options: DescriptionOptions): string {
	let html = "";
	let index = 0;
	while (index < source.length) {
		const rest = source.slice(index);
		const link = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
		if (link) {
			const href = safeLink(link[2]!);
			html += href ? linkHtml(href, renderInline(link[1]!, options), options) : escapeHtml(link[0]);
			index += link[0].length;
			continue;
		}
		const strong = rest.match(/^\*\*(.+?)\*\*/);
		if (strong) {
			html += `<strong>${renderInline(strong[1]!, options)}</strong>`;
			index += strong[0].length;
			continue;
		}
		const emphasis = rest.match(/^_([^_]+?)_/);
		if (emphasis) {
			html += `<em>${renderInline(emphasis[1]!, options)}</em>`;
			index += emphasis[0].length;
			continue;
		}
		html += escapeHtml(source[index]!);
		index += 1;
	}
	return html;
}

function linkHtml(href: string, inner: string, options: DescriptionOptions): string {
	const hint = options.newTabText ? `<span class="eventual-sr-only"> ${escapeHtml(options.newTabText)}</span>` : "";
	return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}${hint}</a>`;
}

function safeLink(value: string): string {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? url.href : "";
	} catch {
		return "";
	}
}

function clampHeading(level: number): number {
	return Math.min(6, Math.max(2, Math.round(level)));
}

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
