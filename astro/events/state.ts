/**
 * Query-string state of the events page and the date range of a detail page.
 * Moved from the Astro showcase (browser-state.ts, event-range.ts).
 */
import { addMonths, isMonthKey } from "./grid";

export const EVENT_VIEWS = ["list", "timeline", "cards", "schedule", "dates", "month", "locations"] as const;

export type EventView = typeof EVENT_VIEWS[number];

export interface EventBrowserState {
	month: string;
	view: EventView;
	category: string;
}

export interface EventBrowserStateOptions {
	/** Views the site offers, in this order (default: all seven). */
	views?: readonly EventView[];
	/** View when the address names none, or one the site does not offer (default: the first offered). */
	defaultView?: EventView;
	/** Fixed values instead of the query string. */
	view?: EventView;
	month?: string;
	category?: string;
}

export function offeredViews(options: Pick<EventBrowserStateOptions, "views"> = {}): EventView[] {
	const chosen = (options.views ?? EVENT_VIEWS).filter((view, index, all) => EVENT_VIEWS.includes(view) && all.indexOf(view) === index);
	return chosen.length ? chosen : [...EVENT_VIEWS];
}

export function eventBrowserState(params: URLSearchParams, currentMonth: string, options: EventBrowserStateOptions = {}): EventBrowserState {
	const views = offeredViews(options);
	const fallback = options.defaultView && views.includes(options.defaultView) ? options.defaultView : views[0]!;
	const requestedView = (options.view ?? params.get("view")) as EventView | null;
	const requestedMonth = options.month ?? params.get("month");
	return {
		month: isMonthKey(requestedMonth) ? requestedMonth : currentMonth,
		view: requestedView && views.includes(requestedView) ? requestedView : fallback,
		category: (options.category ?? params.get("category") ?? "").trim().slice(0, 100),
	};
}

/** Same-page address for another view, month or category ("?month=…&view=…"). */
export function eventBrowserHref(state: EventBrowserState, change: Partial<EventBrowserState> = {}): string {
	const next = { ...state, ...change };
	const params = new URLSearchParams({ month: next.month, view: next.view });
	if (next.category) params.set("category", next.category);
	return `?${params.toString()}`;
}

export function adjacentMonth(state: EventBrowserState, offset: -1 | 1): string {
	return addMonths(state.month, offset);
}

export interface EventRange {
	from: string;
	through: string;
}

/** The detail page's `from`/`through` (default: today and the year after); null when invalid. */
export function eventRange(searchParams: URLSearchParams, now = new Date()): EventRange | null {
	const from = searchParams.get("from") ?? now.toISOString().slice(0, 10);
	const through = searchParams.get("through") ?? addDays(from, 365);
	if (!isDateOnly(from) || !isDateOnly(through) || from > through) return null;
	const span = (Date.parse(`${through}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
	return Number.isInteger(span) && span < 366 ? { from, through } : null;
}

export function isDateOnly(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(value: string, amount: number): string {
	const date = new Date(`${value}T00:00:00Z`);
	if (!isDateOnly(value)) return "";
	date.setUTCDate(date.getUTCDate() + amount);
	return date.toISOString().slice(0, 10);
}
