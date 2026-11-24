import { describe, expect, it } from "vitest";
import { buildCalendarLinks } from "../src/domain/calendar-links";
import { eventRecordToPublicEvent, nativeEntryToEventRecord } from "../src/domain/event-expansion";
import { handleAdmin } from "../src/native-admin";
import { createEventsCollectionBlueprint, createOrganizersCollectionBlueprint, createVenuesCollectionBlueprint } from "../src/schema/blueprint";
import type { EventualContext } from "../src/storage";

// A Registry install is addressed by a generated ID, never by the slug `eventual`
// (issue #7). Every link the plugin builds itself has to carry that ID.
const REGISTRY_ID = "r_hxn32uyal53iahxf";

const adminContext = (plugin?: { id: string; version: string }) => ({
	schema: { listCollections: async () => [createEventsCollectionBlueprint(), createVenuesCollectionBlueprint(), createOrganizersCollectionBlueprint()] },
	settings: { get: async () => undefined, set: async () => undefined },
	content: { list: async () => ({ items: [], hasMore: false }) },
	site: { url: "https://club.example" },
	...(plugin ? { plugin } : {}),
}) as unknown as EventualContext;

const linkUrls = (response: unknown) => [...JSON.stringify(response).matchAll(/"url":"([^"]+)"/g)].map(match => match[1]!);

describe("links on a Registry install", () => {
	it("puts the installed plugin ID in the admin's Subscribe links", async () => {
		const urls = linkUrls(await handleAdmin({ page: "/events" }, adminContext({ id: REGISTRY_ID, version: "0.18.5" })));
		expect(urls).toContain(`https://club.example/_emdash/api/plugins/${REGISTRY_ID}/calendar`);
		expect(urls).toContain(`https://club.example/_emdash/api/plugins/${REGISTRY_ID}/publicEvents`);
		expect(urls.filter(url => url.includes("/api/plugins/eventual/"))).toEqual([]);
	});

	it("keeps `eventual` for a config-managed install", async () => {
		const urls = linkUrls(await handleAdmin({ page: "/events" }, adminContext({ id: "eventual", version: "0.18.5" })));
		expect(urls).toContain("https://club.example/_emdash/api/plugins/eventual/calendar");
		expect(urls).toContain("https://club.example/_emdash/api/plugins/eventual/publicEvents");
	});

	it("puts the installed plugin ID in the per-event .ics link", () => {
		const event = { id: "evt-123#2026-11-15", title: "Clinic", start: "2026-11-15T10:00:00.000Z", end: "2026-11-15T12:00:00.000Z", allDay: false };
		expect(buildCalendarLinks(event, "https://club.example", REGISTRY_ID).ics)
			.toBe(`https://club.example/_emdash/api/plugins/${REGISTRY_ID}/calendar?eventId=evt-123`);
		expect(buildCalendarLinks(event, "https://club.example").ics)
			.toBe("https://club.example/_emdash/api/plugins/eventual/calendar?eventId=evt-123");
	});

	it("passes the plugin ID from the public feed down to its calendar links", () => {
		const record = nativeEntryToEventRecord({
			id: "evt-feed",
			data: { id: "evt-feed", title: "Open day", start: "2026-10-15T10:00:00.000Z", end: "2026-10-15T12:00:00.000Z", all_day: false, timezone: "UTC", status: "published" },
		});
		expect(record).not.toBeNull();
		const event = eventRecordToPublicEvent(record!, undefined, "https://club.example", REGISTRY_ID);
		expect(event.calendarLinks?.ics).toBe(`/_emdash/api/plugins/${REGISTRY_ID}/calendar?eventId=evt-feed`);
	});
});
