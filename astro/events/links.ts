/**
 * Addresses the event pages show: calendar subscription, the feed's per-event links made absolute,
 * and safe image URLs. Every address that reaches the plugin carries the installed plugin ID
 * (`eventual` for a config install, `r_…` for a Registry install).
 */
import type { CalendarLinks } from "../event-details";

/** `webcal://…/_emdash/api/plugins/<pluginId>/calendar`, optionally for one language or category. */
export function calendarSubscriptionUrl(origin: string | URL, pluginId = "eventual", options: { locale?: string; category?: string } = {}): string {
	try {
		const url = new URL(`/_emdash/api/plugins/${encodeURIComponent(pluginId)}/calendar`, origin);
		if (options.locale) url.searchParams.set("locale", options.locale);
		if (options.category) url.searchParams.set("category", options.category);
		return url.href.replace(/^https?:/i, "webcal:");
	} catch {
		return "";
	}
}

/**
 * The feed's calendar links with the `.ics` download made absolute against the API origin
 * (the feed gives a site-relative path, which breaks when pages and API are on different hosts).
 */
export function absoluteCalendarLinks(links: CalendarLinks | undefined, origin: string | URL): CalendarLinks | undefined {
	if (!links) return undefined;
	let ics = links.ics;
	try {
		ics = new URL(links.ics, origin).href;
	} catch {}
	return { ...links, ics };
}

/** https images anywhere; http only from the API origin itself (local development). */
export function safeImageUrl(value: string | undefined, origin: string | URL): string {
	if (!value || !value.trim()) return "";
	try {
		const url = new URL(value, origin);
		const site = new URL(origin);
		if (url.protocol === "https:") return url.href;
		if (url.protocol === "http:" && site.protocol === "http:" && url.origin === site.origin) return url.href;
		return "";
	} catch {
		return "";
	}
}

export function decodeRouteParam(value: string | undefined): string {
	if (!value) return "";
	try {
		return decodeURIComponent(value);
	} catch {
		return "";
	}
}
