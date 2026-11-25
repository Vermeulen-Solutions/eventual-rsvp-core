/**
 * Event pages for EmDash sites: loaders that run in the site's page, and the data the
 * EventBrowser and EventDetail components render. A page sets `Astro.response.status` from the
 * loader (502 when the feed fails, 404 for an unknown event), which a component cannot do.
 *
 *   const data = await loadEventBrowser(Astro.url, { pluginId: "r_…", locale: "fr" });
 *   Astro.response.status = data.status;
 */
import { fetchPublicFeed, serializeJsonLd, eventToJsonLd, type PublicEvent } from "../feed";
import { safeWebUrl, type CalendarLinks } from "../event-details";
import { eventPageUrl } from "../event-list";
import { buildCalendar, calendarRange, displayDate, eventEndDate, eventStartDate, eventTimeRange, monthDateRange, monthLabel, monthOf, normalizeLocale, normalizeTimeZone, weekdayHeadings, type CalendarCell } from "./grid";
import { EVENT_VIEWS, adjacentMonth, eventBrowserHref, eventBrowserState, eventRange, offeredViews, type EventBrowserState, type EventView } from "./state";
import { absoluteCalendarLinks, calendarSubscriptionUrl, decodeRouteParam, safeImageUrl } from "./links";
import { descriptionExcerpt, descriptionHtml } from "./description";
import { eventPageText, type EventPageText } from "./i18n";

export * from "./grid";
export * from "./state";
export * from "./links";
export { descriptionExcerpt, descriptionHtml } from "./description";
export { eventPageText, EVENT_PAGES_EN, type EventPageText } from "./i18n";
export type { PublicEvent } from "../feed";

export interface EventPagesOptions {
	/** Installed plugin ID: `eventual` for a config install, `r_…` for a Registry install. */
	pluginId?: string;
	/** Origin of the EmDash site that serves the feed (default: the page's own). */
	origin?: string;
	/** Page language: texts, dates and the feed's content language (default "en"). */
	locale?: string;
	/** Content language for the feed when it differs from `locale` (default: its language part). */
	contentLocale?: string;
	/** Only events translated into the content language (default false: others show with a language prefix). */
	strict?: boolean;
	/** Time zone for "this month" and "today" (default UTC). Event times use each event's own zone. */
	timeZone?: string;
	/** Address of the events page; detail pages are `<basePath>/<slug>` (default "/events"). */
	basePath?: string;
	/** "detail" links to the package's detail page; "cms" to the entry's own public URL when it has one. */
	linkTo?: "detail" | "cms";
	/** Views offered, in order, and the default one. */
	views?: readonly EventView[];
	defaultView?: EventView;
	/** Fixed values instead of the query string. */
	view?: EventView;
	month?: string;
	category?: string;
	/** For tests: the current time. */
	now?: Date;
}

export interface DateGroup {
	date: string;
	id: string;
	label: string;
	weekday: string;
	day: string;
	events: PublicEvent[];
}

export interface LocationGroup {
	location: string;
	directionsUrl: string;
	events: PublicEvent[];
}

export interface EventBrowserData {
	status: 200 | 502;
	pageTitle: string;
	description: string;
	text: EventPageText;
	lang: string;
	dir: "ltr" | "rtl";
	locale: string;
	origin: string;
	pluginId: string;
	basePath: string;
	linkTo: "detail" | "cms";
	state: EventBrowserState;
	views: Array<{ view: EventView; label: string; href: string; current: boolean }>;
	monthTitle: string;
	previous: { href: string; label: string };
	next: { href: string; label: string };
	current: { href: string; label: string; isCurrent: boolean };
	clearHref: string;
	categories: string[];
	events: PublicEvent[];
	weeks: CalendarCell[][];
	weekdays: { short: string[]; long: string[] };
	dateGroups: DateGroup[];
	locationGroups: LocationGroup[];
	today: string;
	subscriptionUrl: string;
}

export interface EventDetailData {
	status: 200 | 404 | 502;
	pageTitle: string;
	description: string;
	text: EventPageText;
	lang: string;
	dir: "ltr" | "rtl";
	locale: string;
	origin: string;
	pluginId: string;
	backHref: string;
	event?: PublicEvent;
	jsonLd?: string;
	dateText?: string;
	timeText?: string;
	imageUrl?: string;
	websiteUrl?: string;
	directionsUrl?: string;
	onlineUrl?: string;
	descriptionHtml?: string;
	calendarLinks?: CalendarLinks;
	subscriptionUrl?: string;
}

interface Resolved {
	locale: string;
	contentLocale: string;
	timeZone: string;
	origin: string;
	pluginId: string;
	basePath: string;
	linkTo: "detail" | "cms";
	now: Date;
}

function resolve(url: URL, options: EventPagesOptions): Resolved {
	const locale = normalizeLocale(options.locale ?? "en");
	return {
		locale,
		contentLocale: options.contentLocale ?? locale.split("-")[0]!,
		timeZone: normalizeTimeZone(options.timeZone ?? "UTC"),
		origin: safeWebUrl(options.origin ?? "") || url.origin,
		pluginId: options.pluginId || "eventual",
		basePath: (options.basePath ?? "/events").replace(/\/+$/, "") || "/events",
		linkTo: options.linkTo ?? "detail",
		now: options.now ?? new Date(),
	};
}

/** The events page: fetches one month (or the weeks around it for the month view). */
export async function loadEventBrowser(url: URL, options: EventPagesOptions = {}): Promise<EventBrowserData> {
	const settings = resolve(url, options);
	const state = eventBrowserState(url.searchParams, monthOf(settings.now, settings.timeZone), options);
	const range = state.view === "month" ? calendarRange(state.month, settings.locale) : monthDateRange(state.month);
	let events: PublicEvent[] | null = null;
	try {
		const feed = await fetchPublicFeed(settings.origin, range.from, range.through, state.category, {
			locale: settings.contentLocale,
			strict: options.strict ?? false,
			publicUrls: settings.linkTo === "cms",
			pluginId: settings.pluginId,
		});
		events = feed.events;
	} catch {
		events = null;
	}
	return buildEventBrowserData(events, url, { ...options, ...settings, view: state.view, month: state.month, category: state.category });
}

/** Pure part of loadEventBrowser: `events` null means the feed failed. */
export async function buildEventBrowserData(events: PublicEvent[] | null, url: URL, options: EventPagesOptions = {}): Promise<EventBrowserData> {
	const settings = resolve(url, options);
	const { text, lang, dir } = await eventPageText(settings.locale);
	const state = eventBrowserState(url.searchParams, monthOf(settings.now, settings.timeZone), options);
	const all = events ?? [];
	const visible = monthDateRange(state.month);
	const inMonth = all.filter((event) => eventStartDate(event) <= visible.through && eventEndDate(event) >= visible.from);
	const monthTitle = monthLabel(state.month, settings.locale);
	const thisMonth = monthOf(settings.now, settings.timeZone);
	const fullDate = new Intl.DateTimeFormat(settings.locale, { dateStyle: "full", timeZone: "UTC" });
	const weekday = new Intl.DateTimeFormat(settings.locale, { weekday: "short", timeZone: "UTC" });
	const day = new Intl.DateTimeFormat(settings.locale, { day: "numeric", timeZone: "UTC" });
	const byDate = new Map<string, PublicEvent[]>();
	for (const event of inMonth) {
		const date = eventStartDate(event);
		byDate.set(date, [...(byDate.get(date) ?? []), event]);
	}
	const byLocation = new Map<string, PublicEvent[]>();
	for (const event of inMonth) {
		const location = event.location.trim() || text.event.locationToConfirm;
		byLocation.set(location, [...(byLocation.get(location) ?? []), event]);
	}
	const previousMonth = adjacentMonth(state, -1);
	const nextMonth = adjacentMonth(state, 1);
	return {
		status: events ? 200 : 502,
		pageTitle: text.pageTitle(monthTitle),
		description: text.intro,
		text,
		lang,
		dir,
		locale: settings.locale,
		origin: settings.origin,
		pluginId: settings.pluginId,
		basePath: settings.basePath,
		linkTo: settings.linkTo,
		state,
		views: offeredViews(options).map((view) => ({ view, label: text.views[view], href: eventBrowserHref(state, { view }), current: view === state.view })),
		monthTitle,
		previous: { href: eventBrowserHref(state, { month: previousMonth }), label: text.month.previous(monthLabel(previousMonth, settings.locale)) },
		next: { href: eventBrowserHref(state, { month: nextMonth }), label: text.month.next(monthLabel(nextMonth, settings.locale)) },
		current: { href: eventBrowserHref(state, { month: thisMonth }), label: text.month.current, isCurrent: state.month === thisMonth },
		clearHref: eventBrowserHref({ ...state, category: "" }),
		categories: [...new Set(inMonth.flatMap((event) => event.categories))].sort((a, b) => a.localeCompare(b, settings.locale)),
		events: inMonth,
		weeks: state.view === "month" ? buildCalendar(state.month, settings.locale, all) : [],
		weekdays: { short: weekdayHeadings(settings.locale), long: weekdayHeadings(settings.locale, "long") },
		dateGroups: [...byDate].map(([date, grouped]) => {
			const value = new Date(`${date}T12:00:00Z`);
			return { date, id: `eventual-date-${date}`, label: fullDate.format(value), weekday: weekday.format(value), day: day.format(value), events: grouped };
		}),
		locationGroups: [...byLocation].map(([location, grouped]) => ({
			location,
			directionsUrl: grouped.map((event) => safeWebUrl(event.directionsUrl)).find(Boolean) ?? "",
			events: grouped,
		})),
		today: settings.now.toISOString().slice(0, 10),
		subscriptionUrl: calendarSubscriptionUrl(settings.origin, settings.pluginId, { locale: options.strict ? settings.contentLocale : undefined, category: state.category || undefined }),
	};
}

/** The address of an event's detail page (or its own public URL with `linkTo: "cms"`). */
export function eventHref(event: PublicEvent, data: Pick<EventBrowserData, "basePath" | "linkTo">): string {
	return eventPageUrl(data.linkTo === "cms" ? event : { ...event, publicUrl: undefined }, data.basePath);
}

/** The detail page: `id` is the route parameter (an event's slug or ID). */
export async function loadEventDetail(url: URL, id: string | undefined, options: EventPagesOptions = {}): Promise<EventDetailData> {
	const settings = resolve(url, options);
	const range = eventRange(url.searchParams, settings.now);
	if (!range) return buildEventDetailData([], undefined, url, options);
	try {
		const feed = await fetchPublicFeed(settings.origin, range.from, range.through, "", {
			locale: settings.contentLocale,
			strict: options.strict ?? false,
			publicUrls: false,
			pluginId: settings.pluginId,
		});
		return buildEventDetailData(feed.events, id, url, options);
	} catch {
		return buildEventDetailData(null, id, url, options);
	}
}

/** The content entry behind a feed event (a recurring date's ID ends in `#<date>`): the `eventId` for RsvpForm and TicketCheckout. */
export function eventContentId(event: PublicEvent): string {
	return event.id.split("#")[0] ?? event.id;
}

/** The event's start as an ISO instant: the `occurrenceStart` for RsvpForm and TicketCheckout. */
export function occurrenceStart(event: PublicEvent): string {
	const time = Date.parse(event.start);
	return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

/** Finds the event by ID, slug or series ID, preferring the date the address names. */
export function findEvent(events: PublicEvent[], param: string, from?: string): PublicEvent | undefined {
	if (!param) return undefined;
	const matches = events.filter((event) => event.id === param || event.slug === param || event.id.split("#")[0] === param);
	return matches.find((event) => event.id === param)
		?? matches.find((event) => from && eventStartDate(event) === from)
		?? matches[0];
}

/** Pure part of loadEventDetail: `events` null means the feed failed. */
export async function buildEventDetailData(events: PublicEvent[] | null, id: string | undefined, url: URL, options: EventPagesOptions = {}): Promise<EventDetailData> {
	const settings = resolve(url, options);
	const { text, lang, dir } = await eventPageText(settings.locale);
	const base = { text, lang, dir, locale: settings.locale, origin: settings.origin, pluginId: settings.pluginId, backHref: settings.basePath };
	if (!events) return { ...base, status: 502, pageTitle: text.notice.unavailable, description: text.notice.unavailableDetail };
	const event = findEvent(events, decodeRouteParam(id), url.searchParams.get("from") ?? undefined);
	if (!event) return { ...base, status: 404, pageTitle: text.event.details, description: text.notice.notFound };
	const sameDay = eventStartDate(event) === eventEndDate(event);
	const start = displayDate(event.start, settings.locale, event.timezone, event.allDay, "full");
	const end = displayDate(event.end, settings.locale, event.timezone, event.allDay, "full");
	return {
		...base,
		status: 200,
		pageTitle: event.title,
		description: descriptionExcerpt(event.description, 160),
		event,
		jsonLd: serializeJsonLd(eventToJsonLd(event, { siteUrl: settings.origin })),
		dateText: sameDay ? start : `${start} – ${end}`,
		timeText: event.allDay ? text.event.allDay : eventTimeRange(event, settings.locale),
		imageUrl: safeImageUrl(event.imageMedia?.src || event.imageUrl, settings.origin),
		websiteUrl: safeWebUrl(event.externalUrl) || undefined,
		directionsUrl: safeWebUrl(event.directionsUrl) || undefined,
		onlineUrl: event.locationType === "virtual" || event.locationType === "hybrid" ? safeWebUrl(event.virtualUrl ?? "") || undefined : undefined,
		descriptionHtml: descriptionHtml(event.descriptionBlocks, event.description, { headingBase: 2, newTabText: text.newTab }),
		calendarLinks: absoluteCalendarLinks(event.calendarLinks, settings.origin),
		subscriptionUrl: calendarSubscriptionUrl(settings.origin, settings.pluginId),
	};
}

export { EVENT_VIEWS };
