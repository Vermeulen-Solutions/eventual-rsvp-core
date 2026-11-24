import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPluginRuntimeTestHost, type PluginRuntimeTestHost } from "@emdash-cms/plugin-test";
import { handleCalendarFeed } from "../src/routes/calendar-feed";
import { createEventsCollectionBlueprint, createOrganizersCollectionBlueprint, createVenuesCollectionBlueprint } from "../src/schema/blueprint";
import type { EventualContext } from "../src/storage";
import { memoryKv } from "./native-test-helpers";

// The public feed gives every event a `.ics` link: `calendar?eventId=<id>`. It has to download
// that event, not the whole calendar.
const entry = (id: string, locale: string, group: string, title: string, start: string, end: string, extra: Record<string, unknown> = {}) => ({
	id, status: "published", locale, translationGroup: group,
	data: { title, start, end, all_day: false, timezone: "UTC", location_type: "physical", published: true, ...extra },
});
const entries = [
	entry("concert-fr", "fr", "tg-concert", "Concert d'automne", "2026-11-10T19:00:00.000Z", "2026-11-10T21:00:00.000Z"),
	entry("concert-en", "en", "tg-concert", "Autumn concert", "2026-11-10T19:00:00.000Z", "2026-11-10T21:00:00.000Z"),
	entry("class-en", "en", "tg-class", "Weekly class", "2026-11-03T09:00:00.000Z", "2026-11-03T10:00:00.000Z", {
		recurrence: { frequency: "weekly", until: "2026-11-24", weekdays: ["tuesday"] },
	}),
];
const context = () => ({
	kv: memoryKv(), site: { url: "https://club.example" },
	schema: { listCollections: vi.fn().mockResolvedValue([createEventsCollectionBlueprint(), { slug: "venues" }]) },
	content: {
		get: vi.fn().mockResolvedValue(null),
		list: vi.fn().mockImplementation((collection: string) => Promise.resolve({ items: collection === "events" ? entries : [] })),
	},
	storage: { events: { query: vi.fn().mockResolvedValue({ items: [] }) }, calendar_cancellations: { query: vi.fn().mockResolvedValue({ items: [] }) } },
}) as unknown as EventualContext;
const count = (feed: string, needle: string) => feed.split(needle).length - 1;

describe("calendar download for one event", () => {
	beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z")); });
	afterEach(() => { vi.useRealTimers(); });

	it("still serves the whole calendar without eventId", async () => {
		const feed = await handleCalendarFeed(context(), "club.example", { locale: "en" });
		expect(feed).toContain("SUMMARY:Autumn concert");
		expect(count(feed, "SUMMARY:Weekly class")).toBe(4);
	});

	it("returns only the requested event", async () => {
		const feed = await handleCalendarFeed(context(), "club.example", { eventId: "concert-en" });
		expect(count(feed, "BEGIN:VEVENT")).toBe(1);
		expect(feed).toContain("SUMMARY:Autumn concert");
		expect(feed).not.toContain("Weekly class");
	});

	it("keeps the same UID as the subscription, so a subscriber does not get a duplicate", async () => {
		const ctx = context();
		const all = await handleCalendarFeed(ctx, "club.example", { locale: "en" });
		const one = await handleCalendarFeed(ctx, "club.example", { eventId: "concert-en" });
		expect(all).toContain("UID:eventual-tg-concert@club.example");
		expect(one).toContain("UID:eventual-tg-concert@club.example");
	});

	it("picks the translation by its ID, whatever the site's first language is", async () => {
		const feed = await handleCalendarFeed(context(), "club.example", { eventId: "concert-fr" });
		expect(count(feed, "BEGIN:VEVENT")).toBe(1);
		expect(feed).toContain("SUMMARY:Concert d'automne");
		expect(feed).not.toContain("[FR]");
	});

	it("returns every upcoming date of a repeating event, or one date when asked", async () => {
		const series = await handleCalendarFeed(context(), "club.example", { eventId: "class-en" });
		expect(count(series, "SUMMARY:Weekly class")).toBe(4);
		expect(series).not.toContain("concert");
		const oneDate = await handleCalendarFeed(context(), "club.example", { eventId: "class-en#2026-11-17T09:00" });
		expect(count(oneDate, "BEGIN:VEVENT")).toBe(1);
		expect(oneDate).toContain("DTSTART:20261117T090000Z");
	});

	it("says so when the event is unknown, over, or not one of the dates", async () => {
		await expect(handleCalendarFeed(context(), "club.example", { eventId: "nope" })).resolves.toBe("");
		await expect(handleCalendarFeed(context(), "club.example", { eventId: "class-en#2026-11-18T09:00" })).resolves.toBe("");
		vi.setSystemTime(new Date("2026-12-01T00:00:00.000Z"));
		await expect(handleCalendarFeed(context(), "club.example", { eventId: "concert-en" })).resolves.toBe("");
	});
});

describe("calendar route with eventId", { timeout: 60_000 }, () => {
	let host: PluginRuntimeTestHost | undefined;
	afterEach(async () => { await host?.dispose(); host = undefined; });

	it("answers 404 for an unknown event, instead of the whole calendar", async () => {
		host = await createPluginRuntimeTestHost({ site: { url: "https://club.example", locale: "en" } });
		await host.fixtures.collection(createEventsCollectionBlueprint() as never);
		await host.fixtures.collection(createVenuesCollectionBlueprint() as never);
		await host.fixtures.collection(createOrganizersCollectionBlueprint() as never);
		const get = (query: string) => host!.actions.routes.request("calendar", { method: "GET", url: "https://club.example/_emdash/api/plugins/eventual/calendar" + query });
		expect((await get("")).status).toBe(200);
		expect((await get("?eventId=nope")).status).toBe(404);
		expect((await get("?eventId=" + "x".repeat(300))).status).toBe(404);
		expect((await get("?locale=not_a_locale")).status).toBe(400);
	});
});
