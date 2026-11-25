import { bindMessages, localeDirection, resolveLocale, type Bound } from "@vermeulen.solutions/eventual-locales";

/**
 * Every visible string of the event pages (EventBrowser, EventDetail) and EventList. English is
 * the source; other languages ship in @vermeulen.solutions/eventual-locales
 * (catalogs/core-site/<lang>.json, flat dotted keys over this tree). Leaves written as
 * ["template", "arg", …] become functions; templates use ICU syntax ({count, plural, …}).
 */
const en = {
	title: "Events",
	pageTitle: ["Events – {month}", "month"],
	intro: "Browse the month in the format that suits you.",
	views: {
		label: "View",
		list: "List",
		timeline: "Timeline",
		cards: "Cards",
		schedule: "Schedule",
		dates: "Date strip",
		month: "Month",
		locations: "Locations",
	},
	month: {
		navigation: "Choose a month",
		previous: ["Previous month: {month}", "month"],
		next: ["Next month: {month}", "month"],
		current: "This month",
		events: ["Events in {month}", "month"],
		today: "Today",
	},
	filter: {
		label: "Category",
		all: "All categories",
		apply: "Show",
		active: ["Showing: {category}", "category"],
		clear: "Show all categories",
	},
	count: ["{count, plural, one {# event} other {# events}}", "count"],
	notice: {
		unavailable: "Events are temporarily unavailable.",
		unavailableDetail: "The events could not be loaded. Please try again later.",
		tryAgain: "Try again",
		empty: "No events are scheduled for this month.",
		emptyFiltered: "No events in this category this month.",
		notFound: "This event is unavailable or has been removed.",
	},
	event: {
		allDay: "All day",
		organizer: ["Organized by {name}", "name"],
		directions: "Directions",
		details: "Event details",
		website: "Event website",
		joinOnline: "Join online",
		categories: "Categories",
		locationToConfirm: "Location to be confirmed",
		eventsAt: ["Events at {location}", "location"],
		originally: ["Originally {date}", "date"],
		back: "Back to events",
	},
	status: {
		cancelled: "Cancelled",
		postponed: "Postponed",
		rescheduled: "Rescheduled",
	},
	calendar: {
		add: "Add to calendar",
		addFor: ["Add to calendar: {title}", "title"],
		google: "Google Calendar",
		outlook: "Outlook",
		office365: "Office 365",
		ics: "Download iCal file",
		subscribe: "Subscribe to calendar",
	},
	dates: {
		jump: "Jump to a date",
	},
	newTab: "(opens in a new tab)",
	list: {
		empty: "No events found.",
	},
} as const;

/** English source; its dotted paths are the keys of the core-site catalogs. */
export const EVENT_PAGES_EN = en;

export type EventPageText = Bound<typeof en>;

// Catalogs are added with the eventual-locales release that carries the core-site namespace.
const catalogs: Record<string, () => Promise<{ default: Record<string, string> }>> = {};

/** The page texts in a language (English when there is no catalog), and its writing direction. */
export async function eventPageText(locale: string | undefined): Promise<{ text: EventPageText; lang: string; dir: "ltr" | "rtl" }> {
	const wanted = resolveLocale(locale ?? "en", Object.keys(catalogs));
	let catalog: Record<string, string> | undefined;
	try {
		catalog = wanted !== "en" ? (await catalogs[wanted]?.())?.default : undefined;
	} catch {
		catalog = undefined;
	}
	// The texts are English until that language's catalog exists: then lang and dir are English too.
	const lang = catalog ? wanted : "en";
	return {
		text: bindMessages(en, catalog, lang) as EventPageText,
		lang,
		dir: localeDirection(lang) === "rtl" ? "rtl" : "ltr",
	};
}
