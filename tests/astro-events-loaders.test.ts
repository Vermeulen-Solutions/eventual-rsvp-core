import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicEvent } from "../astro/feed";
import { buildEventBrowserData, buildEventDetailData, eventHref, findEvent, loadEventBrowser, loadEventDetail } from "../astro/events/index";

const now = new Date("2026-11-20T10:00:00Z");
const base: PublicEvent = {
	id: "evt-1", slug: "autumn-meetup", title: "Autumn meetup", description: "", start: "2026-11-24T17:00:00.000Z", end: "2026-11-24T19:00:00.000Z",
	allDay: false, timezone: "Europe/Paris", location: "Town hall", organizer: "", externalUrl: "", imageUrl: "", categories: ["Community"],
	venue: null, directionsUrl: "https://maps.example/townhall",
};
const ev = (overrides: Partial<PublicEvent>): PublicEvent => ({ ...base, ...overrides });
const events = [
	base,
	ev({ id: "evt-2", slug: "drawing", title: "Drawing", start: "2026-11-28T09:00:00.000Z", end: "2026-11-28T11:00:00.000Z", location: "", categories: ["Art", "Community"] }),
	ev({ id: "series#2026-11-24T10:00", slug: "class", title: "Class", start: "2026-11-24T09:00:00.000Z", end: "2026-11-24T10:00:00.000Z" }),
	ev({ id: "series#2026-12-01T10:00", slug: "class", title: "Class", start: "2026-12-01T09:00:00.000Z", end: "2026-12-01T10:00:00.000Z" }),
];
const page = (query = "") => new URL(`https://club.example/events${query}`);

afterEach(() => vi.unstubAllGlobals());

describe("events page data", () => {
	it("groups the month's events by date and location, lists categories and links each view", async () => {
		const data = await buildEventBrowserData(events, page("?month=2026-11&view=schedule"), { now, pluginId: "r_abc123" });
		expect(data.status).toBe(200);
		expect(data.state).toEqual({ month: "2026-11", view: "schedule", category: "" });
		expect(data.events.map((event) => event.id)).toEqual(["evt-1", "evt-2", "series#2026-11-24T10:00"]);
		expect(data.dateGroups.map((group) => [group.date, group.events.length])).toEqual([["2026-11-24", 2], ["2026-11-28", 1]]);
		expect(data.locationGroups.map((group) => group.location)).toEqual(["Town hall", "Location to be confirmed"]);
		expect(data.locationGroups[0]!.directionsUrl).toBe("https://maps.example/townhall");
		expect(data.categories).toEqual(["Art", "Community"]);
		expect(data.views.find((view) => view.current)?.view).toBe("schedule");
		expect(data.views.map((view) => view.href)[5]).toBe("?month=2026-11&view=month");
		expect(data.pageTitle).toBe("Events – November 2026");
		expect(data.previous.label).toBe("Previous month: October 2026");
		expect(data.current.isCurrent).toBe(true);
		expect(data.subscriptionUrl).toBe("webcal://club.example/_emdash/api/plugins/r_abc123/calendar");
	});

	it("speaks the visitor's language, with plurals and right-to-left scripts", async () => {
		const fr = await buildEventBrowserData(events, page("?month=2026-11"), { now, locale: "fr-CH" });
		expect([fr.lang, fr.dir, fr.text.views.list, fr.text.count(2)]).toEqual(["fr", "ltr", "Liste", "2 événements"]);
		const pl = await buildEventBrowserData(events, page("?month=2026-11"), { now, locale: "pl" });
		expect([pl.text.count(1), pl.text.count(3), pl.text.count(5)]).toEqual(["1 wydarzenie", "3 wydarzenia", "5 wydarzeń"]);
		const ar = await buildEventBrowserData(events, page("?month=2026-11"), { now, locale: "ar" });
		expect([ar.lang, ar.dir]).toEqual(["ar", "rtl"]);
		const unknown = await buildEventBrowserData(events, page("?month=2026-11"), { now, locale: "xx" });
		expect([unknown.lang, unknown.text.views.list]).toEqual(["en", "List"]);
	});

	it("builds the month grid only for the month view", async () => {
		expect((await buildEventBrowserData(events, page("?month=2026-11&view=month"), { now })).weeks.length).toBe(5);
		expect((await buildEventBrowserData(events, page("?month=2026-11"), { now })).weeks).toEqual([]);
	});

	it("answers 502 when the feed failed", async () => {
		const data = await buildEventBrowserData(null, page(), { now });
		expect(data.status).toBe(502);
		expect(data.events).toEqual([]);
	});

	it("links events to the detail page by slug, or to the entry's own page", async () => {
		const data = await buildEventBrowserData(events, page(), { now, basePath: "/fr/evenements/" });
		expect(eventHref(ev({ publicUrl: "https://club.example/agenda/x" }), data)).toBe("/fr/evenements/autumn-meetup?from=2026-11-24&through=2026-11-24");
		expect(eventHref(ev({ publicUrl: "https://club.example/agenda/x" }), { ...data, linkTo: "cms" })).toBe("https://club.example/agenda/x?from=2026-11-24&through=2026-11-24");
	});

	it("asks the feed for the installed plugin, the content language and one month", async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { ok: true, from: "2026-11-01", through: "2026-11-30", events } }), { status: 200, headers: { "content-type": "application/json" } }));
		vi.stubGlobal("fetch", fetch);
		const data = await loadEventBrowser(page("?month=2026-11&category=Art"), { now, pluginId: "r_abc123", locale: "fr-CH" });
		const request = new URL(fetch.mock.calls[0]![0] as URL);
		expect(request.pathname).toBe("/_emdash/api/plugins/r_abc123/publicEvents");
		expect(Object.fromEntries(request.searchParams)).toMatchObject({ from: "2026-11-01", through: "2026-11-30", category: "Art", locale: "fr", publicUrls: "false" });
		expect(data.status).toBe(200);
		expect(data.monthTitle).toBe("novembre 2026");
	});

	it("answers 502 when the feed cannot be reached", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		expect((await loadEventBrowser(page(), { now })).status).toBe(502);
	});
});

describe("event detail data", () => {
	it("finds an event by ID, slug or series ID, preferring the date in the address", () => {
		expect(findEvent(events, "evt-2")?.title).toBe("Drawing");
		expect(findEvent(events, "autumn-meetup")?.id).toBe("evt-1");
		expect(findEvent(events, "class", "2026-12-01")?.id).toBe("series#2026-12-01T10:00");
		expect(findEvent(events, "series")?.id).toBe("series#2026-11-24T10:00");
		expect(findEvent(events, "series#2026-12-01T10:00")?.start).toBe("2026-12-01T09:00:00.000Z");
		expect(findEvent(events, "missing")).toBeUndefined();
		expect(findEvent(events, "")).toBeUndefined();
	});

	it("gives the details, absolute calendar links and structured data", async () => {
		const withLinks = ev({
			calendarLinks: { google: "https://calendar.google.com/x", outlook: "https://outlook.live.com/x", office365: "https://outlook.office.com/x", ics: "/_emdash/api/plugins/r_abc123/calendar?eventId=evt-1" },
			descriptionBlocks: [{ _type: "block", style: "normal", markDefs: [], children: [{ _type: "span", text: "Bring a chair.", marks: [] }] }],
			description: "Bring a chair.",
			externalUrl: "javascript:alert(1)",
		});
		const data = await buildEventDetailData([withLinks], "autumn-meetup", page("/autumn-meetup?from=2026-11-24&through=2026-11-24"), { now, pluginId: "r_abc123" });
		expect(data.status).toBe(200);
		expect(data.pageTitle).toBe("Autumn meetup");
		expect(data.calendarLinks?.ics).toBe("https://club.example/_emdash/api/plugins/r_abc123/calendar?eventId=evt-1");
		expect(data.descriptionHtml).toBe("<p>Bring a chair.</p>");
		expect(data.websiteUrl).toBeUndefined();
		expect(data.jsonLd).toContain('"@type":"Event"');
		expect(data.timeText).toMatch(/^6:00\sPM–8:00\sPM /);
	});

	it("answers 404 for an unknown event or an invalid range, and 502 when the feed failed", async () => {
		expect((await buildEventDetailData(events, "missing", page(), { now })).status).toBe(404);
		expect((await buildEventDetailData(null, "evt-1", page(), { now })).status).toBe(502);
		vi.stubGlobal("fetch", vi.fn());
		expect((await loadEventDetail(page("?from=2026-13-01"), "evt-1", { now })).status).toBe(404);
	});
});
