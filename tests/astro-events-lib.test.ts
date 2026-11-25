// Moved from examples/astro-events/src/lib/*.test.ts with the libraries (Core 0.19.0).
import { describe, expect, it } from "vitest";
import type { PublicEvent } from "../astro/feed";
import {
	addCalendarDay,
	addMonths,
	buildCalendar,
	calendarRange,
	displayDate,
	eventEndDate,
	eventStartDate,
	eventTimeRange,
	eventTouchesDate,
	firstDayOfWeek,
	isMonthKey,
	monthDateRange,
	monthOf,
	normalizeLocale,
	normalizeTimeZone,
	weekdayHeadings,
} from "../astro/events/grid";
import { adjacentMonth, eventBrowserHref, eventBrowserState, eventRange, offeredViews } from "../astro/events/state";
import { absoluteCalendarLinks, calendarSubscriptionUrl, decodeRouteParam, safeImageUrl } from "../astro/events/links";

function event(overrides: Partial<PublicEvent> = {}): PublicEvent {
	return {
		id: "test-event",
		updatedAt: "2026-10-01T10:20:30.000Z",
		title: "Community event",
		description: "",
		start: "2026-10-10T16:00:00.000Z",
		end: "2026-10-10T17:00:00.000Z",
		allDay: false,
		timezone: "Europe/Paris",
		location: "Town hall",
		organizer: "",
		externalUrl: "",
		imageUrl: "",
		categories: ["community"],
		venue: null,
		directionsUrl: "",
		...overrides,
	} as PublicEvent;
}

describe("month grid", () => {
	it("uses locale week starts for headings and grid boundaries", () => {
		expect(firstDayOfWeek("en-GB")).toBe(1);
		expect(firstDayOfWeek("en-US")).toBe(0);
		expect(weekdayHeadings("en-US")[0]).toMatch(/Sun/i);
		expect(weekdayHeadings("en-GB", "long")[0]).toMatch(/Monday/i);
		expect(calendarRange("2026-09", "en-GB")).toEqual({ from: "2026-08-31", through: "2026-10-04" });
		expect(calendarRange("2026-08", "en-US")).toEqual({ from: "2026-07-26", through: "2026-09-05" });
		expect(monthDateRange("2026-02")).toEqual({ from: "2026-02-01", through: "2026-02-28" });
		expect(monthDateRange("2024-02")).toEqual({ from: "2024-02-01", through: "2024-02-29" });
	});

	it("builds five or six complete locale-aligned weeks and keeps adjacent dates marked", () => {
		const ordinaryMonth = buildCalendar("2026-09", "en-GB", []);
		const sixWeekMonth = buildCalendar("2026-08", "en-US", []);
		expect(ordinaryMonth).toHaveLength(5);
		expect(ordinaryMonth.flat()).toHaveLength(35);
		expect(ordinaryMonth[0]![0]).toMatchObject({ date: "2026-08-31", inMonth: false });
		expect(sixWeekMonth).toHaveLength(6);
		expect(sixWeekMonth.flat()).toHaveLength(42);
	});

	it("places timed multi-day events by their local time-zone dates", () => {
		const overnight = event({ start: "2026-10-31T23:30:00.000Z", end: "2026-11-01T01:00:00.000Z", timezone: "Europe/Paris" });
		expect(eventTouchesDate(overnight, "2026-11-01")).toBe(true);
		expect(eventTouchesDate(overnight, "2026-10-31")).toBe(false);
	});

	it("treats all-day end dates as inclusive", () => {
		const camp = event({ start: "2026-10-10", end: "2026-10-12", allDay: true });
		expect(eventTouchesDate(camp, "2026-10-10")).toBe(true);
		expect(eventTouchesDate(camp, "2026-10-12")).toBe(true);
		expect(eventTouchesDate(camp, "2026-10-13")).toBe(false);
		expect(addCalendarDay("2024-02-29")).toBe("2024-03-01");
	});

	it("gives an occurrence's local first and last day", () => {
		const occurrence = event({ id: "series-1#2026-10-10T18:00", start: "2026-10-10T16:00:00.000Z", end: "2026-10-11T01:00:00.000Z" });
		expect(eventStartDate(occurrence)).toBe("2026-10-10");
		expect(eventEndDate(occurrence)).toBe("2026-10-11");
	});

	it("formats wall times and all-day dates without browser time-zone shifts", () => {
		const timed = event({ start: "2026-10-10T16:00:00.000Z", end: "2026-10-10T17:30:00.000Z" });
		expect(eventTimeRange(timed, "en-GB")).toContain("18:00");
		expect(eventTimeRange(timed, "en-GB")).toContain("19:30");
		expect(eventTimeRange(timed, "en-GB")).toMatch(/CEST|GMT\+2|UTC\+2/);
		expect(eventTimeRange(event({ allDay: true, start: "2026-10-10", end: "2026-10-10" }), "en-GB")).toBe("");
		expect(displayDate("2026-10-10", "en-GB", "Europe/Paris", true)).toContain("10 Oct 2026");
	});

	it("validates month values and finds the current month in a time zone", () => {
		expect(isMonthKey("2026-09")).toBe(true);
		expect(isMonthKey("2026-13")).toBe(false);
		expect(isMonthKey("0099-01")).toBe(false);
		expect(addMonths("2026-01", -1)).toBe("2025-12");
		expect(addMonths("2026-12", 1)).toBe("2027-01");
		expect(monthOf(new Date("2026-10-31T23:30:00Z"), "Europe/Paris")).toBe("2026-11");
		expect(monthOf(new Date("2026-10-31T23:30:00Z"), "UTC")).toBe("2026-10");
	});

	it("falls back safely for an invalid locale or time zone", () => {
		expect(normalizeLocale("broken_locale")).toBe("en-GB");
		expect(normalizeLocale(undefined)).toBe("en-GB");
		expect(normalizeTimeZone("Mars/Olympus_Mons")).toBe("UTC");
	});
});

describe("page state", () => {
	it("accepts valid month, view and category values and falls back safely", () => {
		expect(eventBrowserState(new URLSearchParams("month=2026-10&view=month&category=Community"), "2026-09"))
			.toEqual({ month: "2026-10", view: "month", category: "Community" });
		expect(eventBrowserState(new URLSearchParams("month=2026-99&view=grid"), "2026-09"))
			.toEqual({ month: "2026-09", view: "list", category: "" });
	});

	it("offers only the site's views, in its order, with its default", () => {
		expect(offeredViews({ views: ["month", "list", "month", "bogus" as never] })).toEqual(["month", "list"]);
		expect(eventBrowserState(new URLSearchParams("view=timeline"), "2026-09", { views: ["month", "list"] }).view).toBe("month");
		expect(eventBrowserState(new URLSearchParams(), "2026-09", { views: ["month", "list"], defaultView: "list" }).view).toBe("list");
		expect(eventBrowserState(new URLSearchParams("view=list"), "2026-09", { view: "cards" }).view).toBe("cards");
	});

	it("keeps month and category when switching views, across year boundaries", () => {
		const state = eventBrowserState(new URLSearchParams("month=2026-01&view=list&category=Youth%20sport"), "2026-09");
		expect(new URLSearchParams(eventBrowserHref(state, { view: "month" }).slice(1)))
			.toEqual(new URLSearchParams({ month: "2026-01", view: "month", category: "Youth sport" }));
		expect(adjacentMonth(state, -1)).toBe("2025-12");
		expect(eventBrowserHref(state, { month: adjacentMonth(state, 1) })).toBe("?month=2026-02&view=list&category=Youth+sport");
	});

	it("validates the detail page's date range", () => {
		const now = new Date("2026-10-01T12:00:00.000Z");
		expect(eventRange(new URLSearchParams(), now)).toEqual({ from: "2026-10-01", through: "2027-10-01" });
		expect(eventRange(new URLSearchParams("from=2026-10-10&through=2026-10-10"), now)).toEqual({ from: "2026-10-10", through: "2026-10-10" });
		for (const query of ["from=nope&through=2026-10-10", "from=2026-02-30&through=2026-03-01", "from=2026-10-11&through=2026-10-10", "from=2026-10-01&through=2027-10-02"])
			expect(eventRange(new URLSearchParams(query), now)).toBeNull();
	});
});

describe("addresses", () => {
	it("subscribes to the installed plugin, optionally per language and category", () => {
		expect(calendarSubscriptionUrl("https://events.example/events", "r_abc123"))
			.toBe("webcal://events.example/_emdash/api/plugins/r_abc123/calendar");
		expect(calendarSubscriptionUrl("http://127.0.0.1:4321", "eventual", { locale: "fr", category: "Youth sport" }))
			.toBe("webcal://127.0.0.1:4321/_emdash/api/plugins/eventual/calendar?locale=fr&category=Youth+sport");
		expect(calendarSubscriptionUrl("not a url")).toBe("");
	});

	it("makes the feed's per-event .ics link absolute against the API origin", () => {
		const links = { google: "g", outlook: "o", office365: "m", ics: "/_emdash/api/plugins/r_x/calendar?eventId=e1" };
		expect(absoluteCalendarLinks(links, "https://cms.example")?.ics).toBe("https://cms.example/_emdash/api/plugins/r_x/calendar?eventId=e1");
		expect(absoluteCalendarLinks(undefined, "https://cms.example")).toBeUndefined();
	});

	it("allows https images, and http only from a local API origin", () => {
		expect(safeImageUrl("", "http://127.0.0.1:4322")).toBe("");
		expect(safeImageUrl("/_emdash/image?id=123", "http://127.0.0.1:4322")).toBe("http://127.0.0.1:4322/_emdash/image?id=123");
		expect(safeImageUrl("http://insecure.example/image.png", "https://events.example")).toBe("");
		expect(safeImageUrl("https://images.example/image.png", "https://events.example")).toBe("https://images.example/image.png");
		expect(safeImageUrl("javascript:alert(1)", "https://events.example")).toBe("");
	});

	it("decodes route parameters without throwing", () => {
		expect(decodeRouteParam("series-1%232026-10-10T18%3A00")).toBe("series-1#2026-10-10T18:00");
		expect(decodeRouteParam("%E0%A4%A")).toBe("");
		expect(decodeRouteParam(undefined)).toBe("");
	});
});
